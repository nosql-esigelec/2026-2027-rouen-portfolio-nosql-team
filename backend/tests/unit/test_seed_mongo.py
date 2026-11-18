"""Tests unitaires du seed MongoDB, sans connexion réelle."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from portfolio_api.scripts import seed


@pytest.fixture
def mongo_mocks():
    """Remplace la base et les fonctions des repositories."""
    db = MagicMock()
    db.candidats.delete_many = AsyncMock()
    db.projets.delete_many = AsyncMock()

    with (
        patch.object(seed, "get_mongo_db", return_value=db),
        patch.object(
            seed.mongo_candidats,
            "create_indexes",
            new_callable=AsyncMock,
        ) as candidats_indexes,
        patch.object(
            seed.mongo_projets,
            "create_indexes",
            new_callable=AsyncMock,
        ) as projets_indexes,
        patch.object(
            seed.mongo_candidats,
            "upsert_candidat",
            new_callable=AsyncMock,
        ) as upsert_candidat,
        patch.object(
            seed.mongo_projets,
            "upsert_projet",
            new_callable=AsyncMock,
        ) as upsert_projet,
    ):
        yield {
            "db": db,
            "candidats_indexes": candidats_indexes,
            "projets_indexes": projets_indexes,
            "upsert_candidat": upsert_candidat,
            "upsert_projet": upsert_projet,
        }


@pytest.mark.asyncio
async def test_seed_mongo_imports_data(mongo_mocks):
    """Crée les index, vide les collections et importe les documents."""
    candidats = [
        {"candidat_slug": "alice", "nom": "Martin"},
        {"candidat_slug": "bob", "nom": "Dupont"},
    ]
    projets = [
        {
            "projet_slug": "smartcity",
            "candidat_slugs": ["alice", "bob"],
        }
    ]

    await seed.seed_mongo(candidats, projets)

    # Vérifier la création des index.
    mongo_mocks["candidats_indexes"].assert_awaited_once_with()
    mongo_mocks["projets_indexes"].assert_awaited_once_with()

    # Vérifier le nettoyage des collections.
    mongo_mocks["db"].candidats.delete_many.assert_awaited_once_with({})
    mongo_mocks["db"].projets.delete_many.assert_awaited_once_with({})

    # Vérifier que chaque document a été transmis au repository.
    assert mongo_mocks["upsert_candidat"].await_count == 2
    assert [
        call.args[0]
        for call in mongo_mocks["upsert_candidat"].await_args_list
    ] == candidats

    mongo_mocks["upsert_projet"].assert_awaited_once_with(projets[0])


@pytest.mark.asyncio
async def test_seed_mongo_with_empty_lists(mongo_mocks):
    """Avec des listes vides, nettoie sans importer de documents."""
    await seed.seed_mongo([], [])

    mongo_mocks["candidats_indexes"].assert_awaited_once_with()
    mongo_mocks["projets_indexes"].assert_awaited_once_with()

    mongo_mocks["db"].candidats.delete_many.assert_awaited_once_with({})
    mongo_mocks["db"].projets.delete_many.assert_awaited_once_with({})

    mongo_mocks["upsert_candidat"].assert_not_awaited()
    mongo_mocks["upsert_projet"].assert_not_awaited()


@pytest.mark.asyncio
async def test_seed_mongo_stops_if_index_creation_fails(mongo_mocks):
    """Ne vide pas les collections si la création du premier index échoue."""
    mongo_mocks["candidats_indexes"].side_effect = RuntimeError(
        "Index creation failed"
    )

    with pytest.raises(RuntimeError, match="Index creation failed"):
        await seed.seed_mongo([{"candidat_slug": "alice"}], [])

    mongo_mocks["db"].candidats.delete_many.assert_not_awaited()
    mongo_mocks["db"].projets.delete_many.assert_not_awaited()
    mongo_mocks["upsert_candidat"].assert_not_awaited()
    mongo_mocks["upsert_projet"].assert_not_awaited()