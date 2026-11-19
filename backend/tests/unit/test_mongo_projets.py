"""Tests unitaires — Repository MongoDB Projets (Édition 100% NoSQL).

Commande :
    uv run pytest tests/unit/test_mongo_projets.py -v

Fichier à tester :
    backend/src/portfolio_api/repositories/mongo_projets.py
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, call

import pytest

from portfolio_api.repositories import mongo_projets


@pytest.fixture
def projets_cursor():
    """Curseur chaîné : find(...).sort(...).skip(...).limit(...).to_list(...)

    Chaque méthode de chaînage renvoie le curseur lui-même ; seul to_list
    est asynchrone.
    """
    cursor = MagicMock()
    cursor.sort = MagicMock(return_value=cursor)
    cursor.skip = MagicMock(return_value=cursor)
    cursor.limit = MagicMock(return_value=cursor)
    cursor.to_list = AsyncMock(return_value=[])
    return cursor


@pytest.fixture
def projets_collection(projets_cursor):
    coll = MagicMock()
    coll.create_index = AsyncMock()
    coll.count_documents = AsyncMock(return_value=0)
    coll.find_one = AsyncMock(return_value=None)
    coll.find = MagicMock(return_value=projets_cursor)
    coll.replace_one = AsyncMock()
    coll.delete_one = AsyncMock()
    coll.aggregate = AsyncMock()
    return coll


@pytest.fixture(autouse=True)
def mongo_db(projets_collection, monkeypatch):
    """Le repository utilise get_mongo_db().projets (accès par attribut),
    donc on remplace get_mongo_db dans le module testé."""
    db = MagicMock()
    db.projets = projets_collection
    monkeypatch.setattr(mongo_projets, "get_mongo_db", lambda: db)
    return db


class TestCreateIndexes:
    async def test_creates_unique_index_on_projet_slug(self, projets_collection):
        await mongo_projets.create_indexes()
        projets_collection.create_index.assert_any_await("projet_slug", unique=True)

    async def test_creates_simple_indexes_on_array_fields(self, projets_collection):
        await mongo_projets.create_indexes()
        projets_collection.create_index.assert_any_await("candidat_slugs")
        projets_collection.create_index.assert_any_await("competence_slugs")
        projets_collection.create_index.assert_any_await("domaine_slugs")

    async def test_creates_exactly_four_indexes(self, projets_collection):
        await mongo_projets.create_indexes()
        assert projets_collection.create_index.await_args_list == [
            call("projet_slug", unique=True),
            call("candidat_slugs"),
            call("competence_slugs"),
            call("domaine_slugs"),
        ]


class TestFindProjet:
    async def test_returns_dict_when_found(self, projets_collection):
        projets_collection.find_one.return_value = {
            "projet_slug": "api-rest",
            "titre": "API REST",
            "candidat_slugs": ["alice-martin"],
        }
        result = await mongo_projets.find_projet("api-rest")
        assert result is not None
        assert result["projet_slug"] == "api-rest"

    async def test_returns_none_when_not_found(self, projets_collection):
        projets_collection.find_one.return_value = None
        result = await mongo_projets.find_projet("inconnu")
        assert result is None

    async def test_filters_by_slug_and_excludes_id(self, projets_collection):
        await mongo_projets.find_projet("api-rest")
        projets_collection.find_one.assert_awaited_once_with(
            {"projet_slug": "api-rest"},
            {"_id": 0},
        )


class TestListProjets:
    async def test_returns_tuple_list_and_total(
        self, projets_collection, projets_cursor
    ):
        projets_collection.count_documents.return_value = 2
        projets_cursor.to_list.return_value = [
            {"projet_slug": "a", "titre": "A"},
            {"projet_slug": "b", "titre": "B"},
        ]
        rows, total = await mongo_projets.list_projets(
            "alice-martin", None, None, page=1, limit=10
        )
        assert total == 2
        assert len(rows) == 2
        assert rows[0]["projet_slug"] == "a"

    async def test_returns_empty_list_and_zero_when_no_match(self):
        rows, total = await mongo_projets.list_projets(
            "alice-martin", None, None, page=1, limit=10
        )
        assert rows == []
        assert total == 0

    async def test_query_only_filters_candidat_when_no_options(
        self, projets_collection
    ):
        await mongo_projets.list_projets("alice-martin", None, None, 1, 10)
        projets_collection.count_documents.assert_awaited_once_with(
            {"candidat_slugs": "alice-martin"}
        )

    async def test_query_includes_competence_filter(self, projets_collection):
        await mongo_projets.list_projets("alice-martin", "python", None, 1, 10)
        projets_collection.count_documents.assert_awaited_once_with(
            {"candidat_slugs": "alice-martin", "competence_slugs": "python"}
        )

    async def test_query_includes_domaine_filter(self, projets_collection):
        await mongo_projets.list_projets("alice-martin", None, "backend", 1, 10)
        projets_collection.count_documents.assert_awaited_once_with(
            {"candidat_slugs": "alice-martin", "domaine_slugs": "backend"}
        )

    async def test_query_combines_all_filters(self, projets_collection):
        await mongo_projets.list_projets("alice-martin", "python", "backend", 1, 10)
        projets_collection.count_documents.assert_awaited_once_with(
            {
                "candidat_slugs": "alice-martin",
                "competence_slugs": "python",
                "domaine_slugs": "backend",
            }
        )

    async def test_find_uses_same_query_and_excludes_id(self, projets_collection):
        await mongo_projets.list_projets("alice-martin", "python", None, 1, 10)
        projets_collection.find.assert_called_once_with(
            {"candidat_slugs": "alice-martin", "competence_slugs": "python"},
            {"_id": 0},
        )

    async def test_sorts_by_projet_slug_ascending(self, projets_cursor):
        await mongo_projets.list_projets("alice-martin", None, None, 1, 10)
        projets_cursor.sort.assert_called_once_with("projet_slug", 1)

    async def test_first_page_skips_nothing(self, projets_cursor):
        await mongo_projets.list_projets("alice-martin", None, None, page=1, limit=10)
        projets_cursor.skip.assert_called_once_with(0)
        projets_cursor.limit.assert_called_once_with(10)
        projets_cursor.to_list.assert_awaited_once_with(length=10)

    async def test_pagination_computes_skip_from_page_and_limit(self, projets_cursor):
        await mongo_projets.list_projets("alice-martin", None, None, page=3, limit=5)
        projets_cursor.skip.assert_called_once_with(10)  # (3 - 1) * 5
        projets_cursor.limit.assert_called_once_with(5)
        projets_cursor.to_list.assert_awaited_once_with(length=5)


class TestAggregateStats:
    @pytest.fixture
    def agg_cursor(self, projets_collection):
        cursor = MagicMock()
        cursor.to_list = AsyncMock(return_value=[])
        projets_collection.aggregate.return_value = cursor
        return cursor

    async def test_returns_total_and_statistiques(self, agg_cursor):
        agg_cursor.to_list.return_value = [
            {
                "total": [{"nombre": 3}],
                "statistiques": [
                    {"competence_slug": "python", "nombre_projets": 3},
                    {"competence_slug": "mongodb", "nombre_projets": 1},
                ],
            }
        ]
        result = await mongo_projets.aggregate_stats("alice-martin")
        assert result["total_projets"] == 3
        assert len(result["statistiques"]) == 2
        assert result["statistiques"][0] == {
            "competence_slug": "python",
            "nombre_projets": 3,
        }

    async def test_total_is_zero_when_facet_total_is_empty(self, agg_cursor):
        # $count ne renvoie rien quand aucun document ne correspond au $match
        agg_cursor.to_list.return_value = [{"total": [], "statistiques": []}]
        result = await mongo_projets.aggregate_stats("alice-martin")
        assert result == {"total_projets": 0, "statistiques": []}

    async def test_returns_defaults_when_no_rows(self, agg_cursor):
        agg_cursor.to_list.return_value = []
        result = await mongo_projets.aggregate_stats("alice-martin")
        assert result == {"total_projets": 0, "statistiques": []}

    async def test_pipeline_starts_with_match_on_candidat(
        self, projets_collection, agg_cursor
    ):
        await mongo_projets.aggregate_stats("alice-martin")
        pipeline = projets_collection.aggregate.await_args.args[0]
        assert pipeline[0] == {"$match": {"candidat_slugs": "alice-martin"}}

    async def test_pipeline_uses_facet_with_total_and_statistiques(
        self, projets_collection, agg_cursor
    ):
        await mongo_projets.aggregate_stats("alice-martin")
        pipeline = projets_collection.aggregate.await_args.args[0]
        facet = pipeline[1]["$facet"]
        assert set(facet.keys()) == {"total", "statistiques"}
        assert facet["total"] == [{"$count": "nombre"}]

    async def test_pipeline_sorts_by_count_then_slug(
        self, projets_collection, agg_cursor
    ):
        await mongo_projets.aggregate_stats("alice-martin")
        pipeline = projets_collection.aggregate.await_args.args[0]
        stages = pipeline[1]["$facet"]["statistiques"]
        assert {"$sort": {"nombre_projets": -1, "_id": 1}} in stages


class TestUpsertProjet:
    async def test_replaces_document_with_upsert(self, projets_collection):
        document = {"projet_slug": "api-rest", "titre": "API REST"}
        await mongo_projets.upsert_projet(document)
        projets_collection.replace_one.assert_awaited_once_with(
            {"projet_slug": "api-rest"},
            document,
            upsert=True,
        )

    async def test_raises_when_slug_missing(self):
        with pytest.raises(KeyError):
            await mongo_projets.upsert_projet({"titre": "Sans slug"})


class TestDeleteProjet:
    async def test_deletes_by_projet_slug(self, projets_collection):
        await mongo_projets.delete_projet("api-rest")
        projets_collection.delete_one.assert_awaited_once_with(
            {"projet_slug": "api-rest"}
        )
