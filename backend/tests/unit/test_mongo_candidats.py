"""Tests unitaires — Repository MongoDB Candidats (Édition 100% NoSQL).

Commande :
    uv run pytest tests/unit/test_mongo_candidats.py -v

Fichier à implémenter :
    packages/backend/src/portfolio_api/repositories/mongo_candidats.py
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from portfolio_api.repositories import mongo_candidats

from .conftest import FakeCursor

@pytest.fixture
def candidats_collection():
    coll = MagicMock()
    coll.count_documents = AsyncMock(return_value=0)
    coll.find_one = AsyncMock(return_value=None)
    coll.find = MagicMock(return_value=FakeCursor([]))
    coll.create_index = AsyncMock()    
    coll.replace_one = AsyncMock()
    return coll

@pytest.fixture
def mongo_db(candidats_collection, monkeypatch):
    db = MagicMock()
    db.candidats = candidats_collection
    monkeypatch.setattr(mongo_candidats, "get_mongo_db", lambda: db)
    return db

@pytest.fixture(autouse=True)
def _patch_db(mongo_db):
    """Applique le patch à tous les tests de ce fichier."""


class TestCreateIndexes:
    async def test_creates_unique_index_on_candidat_slug(self, candidats_collection):
        await mongo_candidats.create_indexes()
        candidats_collection.create_index.assert_awaited_once_with(
            "candidat_slug", unique=True
        )


class TestFindCandidat:
    async def test_returns_dict_when_found(self, candidats_collection):
        candidats_collection.find_one.return_value = {
            "candidat_slug": "alice-martin",
            "nom": "Martin",
            "prenom": "Alice",
            "competences": [],
        }
        result = await mongo_candidats.find_candidat("alice-martin")
        assert result is not None
        assert result["candidat_slug"] == "alice-martin"

    async def test_returns_none_when_not_found(self, candidats_collection):
        candidats_collection.find_one.return_value = None
        result = await mongo_candidats.find_candidat("inconnu")
        assert result is None

    async def test_filters_by_slug_and_excludes_id(self, candidats_collection):
        await mongo_candidats.find_candidat("alice-martin")
        candidats_collection.find_one.assert_awaited_once_with(
            {"candidat_slug": "alice-martin"},
            {"_id": 0},
        )


class TestCompetenceNames:
    async def test_returns_mapping_slug_to_name(self, candidats_collection):
        candidats_collection.find.return_value = FakeCursor(
            [
                {
                    "competences": [
                        {"skill_slug": "python", "nom": "Python"},
                        {"skill_slug": "mongodb", "nom": "MongoDB"},
                    ]
                }
            ]
        )
        result = await mongo_candidats.competence_names(["python", "mongodb"])
        assert result == {"python": "Python", "mongodb": "MongoDB"}

    async def test_ignores_competences_not_requested(self, candidats_collection):
        # La requête ramène toutes les compétences du candidat : le code doit filtrer.
        candidats_collection.find.return_value = FakeCursor(
            [
                {
                    "competences": [
                        {"skill_slug": "python", "nom": "Python"},
                        {"skill_slug": "docker", "nom": "Docker"},
                    ]
                }
            ]
        )
        result = await mongo_candidats.competence_names(["python"])
        assert result == {"python": "Python"}
        assert "docker" not in result

    async def test_merges_results_from_several_candidats(self, candidats_collection):
        candidats_collection.find.return_value = FakeCursor(
            [
                {"competences": [{"skill_slug": "python", "nom": "Python"}]},
                {"competences": [{"skill_slug": "neo4j", "nom": "Neo4j"}]},
            ]
        )
        result = await mongo_candidats.competence_names(["python", "neo4j"])
        assert result == {"python": "Python", "neo4j": "Neo4j"}

    async def test_returns_empty_dict_when_no_candidat(self, candidats_collection):
        candidats_collection.find.return_value = FakeCursor([])
        result = await mongo_candidats.competence_names(["python"])
        assert result == {}

    async def test_handles_candidat_without_competences(self, candidats_collection):
        candidats_collection.find.return_value = FakeCursor([{}])
        result = await mongo_candidats.competence_names(["python"])
        assert result == {}

    async def test_queries_with_in_operator_and_projection(self, candidats_collection):
        await mongo_candidats.competence_names(["python", "neo4j"])
        candidats_collection.find.assert_called_once_with(
            {"competences.skill_slug": {"$in": ["python", "neo4j"]}},
            {"_id": 0, "competences": 1},
        )


class TestUpsertCandidat:
    async def test_replaces_document_with_upsert(self, candidats_collection):
        document = {"candidat_slug": "alice-martin", "nom": "Martin"}
        await mongo_candidats.upsert_candidat(document)
        candidats_collection.replace_one.assert_awaited_once_with(
            {"candidat_slug": "alice-martin"},
            document,
            upsert=True,
        )

    async def test_raises_when_slug_missing(self):
        with pytest.raises(KeyError):
            await mongo_candidats.upsert_candidat({"nom": "Sans slug"})