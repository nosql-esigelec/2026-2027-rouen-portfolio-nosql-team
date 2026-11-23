"""Tests unitaires du seed MongoDB, sans connexion réelle."""

from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from portfolio_api.scripts import seed


@pytest.fixture
def mongo_mocks():
    """Remplace les deux collections MongoDB."""
    candidats = MagicMock()
    projets = MagicMock()

    for collection in (candidats, projets):
        collection.delete_many = AsyncMock()
        collection.create_index = AsyncMock()
        collection.insert_many = AsyncMock()

    db = MagicMock()
    collections = {
        "candidats": candidats,
        "projets": projets,
    }
    db.__getitem__.side_effect = collections.__getitem__

    with patch.object(seed, "get_mongo_db", return_value=db):
        yield collections


@pytest.mark.asyncio
async def test_seed_mongo_imports_data(mongo_mocks):
    """Vide les collections, crée les index et insère les données."""
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

    candidats_collection = mongo_mocks["candidats"]
    projets_collection = mongo_mocks["projets"]

    candidats_collection.delete_many.assert_awaited_once_with({})
    projets_collection.delete_many.assert_awaited_once_with({})

    assert candidats_collection.create_index.await_args_list == [
        call("candidat_slug", unique=True),
        call("competences.skill_slug"),
        call("competences.domaine_slug"),
    ]
    assert projets_collection.create_index.await_args_list == [
        call("projet_slug", unique=True),
        call("candidat_slugs"),
        call("competence_slugs"),
        call("domaine_slugs"),
    ]

    candidats_collection.insert_many.assert_awaited_once_with(candidats)
    projets_collection.insert_many.assert_awaited_once_with(projets)


@pytest.mark.asyncio
async def test_seed_mongo_with_empty_lists(mongo_mocks):
    """Avec des listes vides, nettoie sans appeler insert_many."""
    await seed.seed_mongo([], [])

    for collection in mongo_mocks.values():
        collection.delete_many.assert_awaited_once_with({})
        collection.insert_many.assert_not_awaited()

    assert mongo_mocks["candidats"].create_index.await_count == 3
    assert mongo_mocks["projets"].create_index.await_count == 4


@pytest.mark.asyncio
async def test_seed_mongo_with_only_projets(mongo_mocks):
    """Importe les projets même si la liste des candidats est vide."""
    projets = [{"projet_slug": "smartcity"}]

    await seed.seed_mongo([], projets)

    mongo_mocks["candidats"].insert_many.assert_not_awaited()
    mongo_mocks["projets"].insert_many.assert_awaited_once_with(projets)


@pytest.mark.asyncio
async def test_seed_mongo_with_only_candidats(mongo_mocks):
    """Importe les candidats même si la liste des projets est vide."""
    candidats = [{"candidat_slug": "alice"}]

    await seed.seed_mongo(candidats, [])

    mongo_mocks["candidats"].insert_many.assert_awaited_once_with(candidats)
    mongo_mocks["projets"].insert_many.assert_not_awaited()


@pytest.mark.asyncio
async def test_seed_mongo_stops_if_index_creation_fails(mongo_mocks):
    """Arrête le seed si la création d'un index candidat échoue."""
    candidats_collection = mongo_mocks["candidats"]
    projets_collection = mongo_mocks["projets"]

    candidats_collection.create_index.side_effect = RuntimeError(
        "Index creation failed"
    )

    with pytest.raises(RuntimeError, match="Index creation failed"):
        await seed.seed_mongo(
            [{"candidat_slug": "alice"}],
            [{"projet_slug": "smartcity"}],
        )

    # Dans l'implémentation actuelle, le nettoyage précède les index.
    candidats_collection.delete_many.assert_awaited_once_with({})
    candidats_collection.insert_many.assert_not_awaited()

    projets_collection.delete_many.assert_not_awaited()
    projets_collection.create_index.assert_not_awaited()
    projets_collection.insert_many.assert_not_awaited()