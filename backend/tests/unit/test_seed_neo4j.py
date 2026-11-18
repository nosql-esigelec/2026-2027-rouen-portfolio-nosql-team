"""Tests unitaires du seed Neo4j, sans connexion réelle."""

from unittest.mock import AsyncMock, call, patch

import pytest

from portfolio_api.scripts import seed


@pytest.fixture
def graph_mocks():
    """Remplace les fonctions du repository Neo4j."""
    with (
        patch.object(
            seed.neo4j_graph,
            "create_constraints",
            new_callable=AsyncMock,
        ) as constraints,
        patch.object(
            seed.neo4j_graph,
            "upsert_candidat",
            new_callable=AsyncMock,
        ) as candidat,
        patch.object(
            seed.neo4j_graph,
            "upsert_projet",
            new_callable=AsyncMock,
        ) as projet,
    ):
        yield {
            "constraints": constraints,
            "candidat": candidat,
            "projet": projet,
        }


@pytest.mark.asyncio
async def test_seed_neo4j_imports_data_in_order(graph_mocks):
    """Crée les contraintes, puis tous les candidats, puis les projets."""
    candidats = [
        {"candidat_slug": "alice", "nom": "Martin"},
        {"candidat_slug": "bob", "nom": "Dupont"},
    ]
    projets = [
        {
            "projet_slug": "smartcity",
            "candidat_slugs": ["alice", "bob"],
        },
        {
            "projet_slug": "portfolio",
            "candidat_slugs": ["alice"],
        },
    ]

    # Enregistrer l'ordre réel des appels.
    operations = []

    async def create_constraints():
        operations.append(("constraints",))

    async def upsert_candidat(document):
        operations.append(("candidat", document["candidat_slug"]))

    async def upsert_projet(document):
        operations.append(("projet", document["projet_slug"]))

    graph_mocks["constraints"].side_effect = create_constraints
    graph_mocks["candidat"].side_effect = upsert_candidat
    graph_mocks["projet"].side_effect = upsert_projet

    await seed.seed_neo4j(candidats, projets)

    graph_mocks["constraints"].assert_awaited_once_with()

    assert graph_mocks["candidat"].await_args_list == [
        call(candidats[0]),
        call(candidats[1]),
    ]

    assert graph_mocks["projet"].await_args_list == [
        call(projets[0]),
        call(projets[1]),
    ]

    assert operations == [
        ("constraints",),
        ("candidat", "alice"),
        ("candidat", "bob"),
        ("projet", "smartcity"),
        ("projet", "portfolio"),
    ]


@pytest.mark.asyncio
async def test_seed_neo4j_with_empty_lists(graph_mocks):
    """Crée les contraintes sans importer de données."""
    await seed.seed_neo4j([], [])

    graph_mocks["constraints"].assert_awaited_once_with()
    graph_mocks["candidat"].assert_not_awaited()
    graph_mocks["projet"].assert_not_awaited()


@pytest.mark.asyncio
async def test_seed_neo4j_stops_if_constraints_fail(graph_mocks):
    """N'importe aucune donnée si la création des contraintes échoue."""
    graph_mocks["constraints"].side_effect = RuntimeError(
        "Constraint creation failed"
    )

    with pytest.raises(RuntimeError, match="Constraint creation failed"):
        await seed.seed_neo4j(
            [{"candidat_slug": "alice"}],
            [{"projet_slug": "smartcity"}],
        )

    graph_mocks["candidat"].assert_not_awaited()
    graph_mocks["projet"].assert_not_awaited()


@pytest.mark.asyncio
async def test_seed_neo4j_stops_if_candidat_import_fails(graph_mocks):
    """N'importe pas les projets si l'import d'un candidat échoue."""
    graph_mocks["candidat"].side_effect = RuntimeError(
        "Candidate import failed"
    )

    with pytest.raises(RuntimeError, match="Candidate import failed"):
        await seed.seed_neo4j(
            [{"candidat_slug": "alice"}],
            [{"projet_slug": "smartcity"}],
        )

    graph_mocks["constraints"].assert_awaited_once_with()
    graph_mocks["candidat"].assert_awaited_once_with(
        {"candidat_slug": "alice"}
    )
    graph_mocks["projet"].assert_not_awaited()