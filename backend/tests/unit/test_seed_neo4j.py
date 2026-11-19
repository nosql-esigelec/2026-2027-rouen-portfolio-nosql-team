"""Tests unitaires du seed Neo4j, sans connexion réelle."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from portfolio_api.scripts import seed


@pytest.fixture
def graph_mocks():
    """Remplace le driver, la session et les résultats Neo4j."""
    result = MagicMock()
    result.consume = AsyncMock()

    session = MagicMock()
    session.run = AsyncMock(return_value=result)

    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=session)
    context.__aexit__ = AsyncMock(return_value=False)

    driver = MagicMock()
    driver.session.return_value = context

    with patch.object(
        seed,
        "get_neo4j_driver",
        return_value=driver,
    ):
        yield {
            "driver": driver,
            "session": session,
            "result": result,
        }


@pytest.mark.asyncio
async def test_seed_neo4j_imports_nodes_and_relations(graph_mocks):
    """Crée les nœuds et les relations à partir des champs JSON."""
    candidats = [
        {
            "candidat_slug": "lea-bernard",
            "nom": "Bernard",
            "prenom": "Léa",
            "titre": "Data Engineer",
            "competences": [
                {
                    "skill_slug": "python",
                    "nom": "Python",
                    "domaine_slug": "langages",
                    "niveau": 5,
                }
            ],
            "experiences": [
                {
                    "entreprise": "Renault Digital",
                    "poste": "Stagiaire Data Engineer",
                    "debut": "2026-04",
                    "fin": "2026-08",
                }
            ],
        }
    ]
    projets = [
        {
            "projet_slug": "smartcity-explorer",
            "titre": "SmartCity Explorer",
            "candidat_slugs": ["lea-bernard"],
            "competence_slugs": ["python"],
            "domaine_slugs": ["langages"],
            "entreprise_slug": "renault-digital",
            "entreprise": "Renault Digital",
        }
    ]

    await seed.seed_neo4j(candidats, projets)

    session = graph_mocks["session"]
    calls = session.run.await_args_list

    # Vérifier les contraintes des cinq labels.
    constraint_queries = [
        item.args[0]
        for item in calls
        if "CREATE CONSTRAINT" in item.args[0]
    ]

    assert len(constraint_queries) == 5

    for label in (
        "Candidat",
        "Projet",
        "Competence",
        "Domaine",
        "Entreprise",
    ):
        assert any(
            f":{label})" in query
            and "IF NOT EXISTS" in query
            and ".slug IS UNIQUE" in query
            for query in constraint_queries
        )

    # Vérifier les identifiants transmis lors de la création des nœuds.
    assert any(
        "MERGE (c:Candidat" in item.args[0]
        and item.kwargs.get("candidat_slug") == "lea-bernard"
        for item in calls
    )

    assert any(
        "MERGE (p:Projet" in item.args[0]
        and item.kwargs.get("projet_slug") == "smartcity-explorer"
        for item in calls
    )

    # Vérifier les six types de relations attendus.
    for relation in (
        "A_REALISE",
        "MAITRISE",
        "UTILISE",
        "APPARTIENT_A",
        "A_TRAVAILLE_CHEZ",
        "REALISE_POUR",
    ):
        assert any(
            f":{relation}" in item.args[0]
            for item in calls
        ), f"Relation manquante : {relation}"

    # Vérifier le niveau de maîtrise.
    mastery_call = next(
        item for item in calls
        if ":MAITRISE" in item.args[0]
    )
    assert mastery_call.kwargs["niveau"] == 5

    # Vérifier le lien compétence → domaine.
    domain_call = next(
        item for item in calls
        if ":APPARTIENT_A" in item.args[0]
    )
    assert domain_call.kwargs["skill_slug"] == "python"
    assert domain_call.kwargs["domaine_slug"] == "langages"

    # Vérifier les dates de l'expérience professionnelle.
    experience_call = next(
        item for item in calls
        if ":A_TRAVAILLE_CHEZ" in item.args[0]
    )
    assert experience_call.kwargs["entreprise_slug"] == "renault-digital"
    assert experience_call.kwargs["debut"] == "2026-04"
    assert experience_call.kwargs["fin"] == "2026-08"

    # Chaque résultat doit être consommé.
    assert (
        graph_mocks["result"].consume.await_count
        == session.run.await_count
    )


@pytest.mark.asyncio
async def test_seed_neo4j_with_empty_lists(graph_mocks):
    """Avec des listes vides, crée uniquement les contraintes."""
    await seed.seed_neo4j([], [])

    calls = graph_mocks["session"].run.await_args_list

    assert len(calls) == 5
    assert all(
        "CREATE CONSTRAINT" in item.args[0]
        for item in calls
    )


@pytest.mark.asyncio
async def test_seed_neo4j_stops_if_constraints_fail(graph_mocks):
    """N'importe aucune donnée si la première contrainte échoue."""
    session = graph_mocks["session"]
    session.run.side_effect = RuntimeError(
        "Constraint creation failed"
    )

    with pytest.raises(RuntimeError, match="Constraint creation failed"):
        await seed.seed_neo4j(
            [
                {
                    "candidat_slug": "lea-bernard",
                    "nom": "Bernard",
                    "prenom": "Léa",
                }
            ],
            [],
        )

    session.run.assert_awaited_once()
    assert "CREATE CONSTRAINT" in session.run.await_args.args[0]
    graph_mocks["result"].consume.assert_not_awaited()
    graph_mocks["driver"].session.return_value.__aexit__.assert_awaited_once()


@pytest.mark.asyncio
async def test_seed_neo4j_stops_if_candidate_import_fails(graph_mocks):
    """Arrête le seed avant les projets si un candidat échoue."""
    session = graph_mocks["session"]
    result = graph_mocks["result"]

    async def run_query(query, **parameters):
        if "MERGE (c:Candidat" in query:
            raise RuntimeError("Candidate import failed")
        return result

    session.run.side_effect = run_query

    with pytest.raises(RuntimeError, match="Candidate import failed"):
        await seed.seed_neo4j(
            [
                {
                    "candidat_slug": "lea-bernard",
                    "nom": "Bernard",
                    "prenom": "Léa",
                }
            ],
            [
                {
                    "projet_slug": "smartcity-explorer",
                    "titre": "SmartCity Explorer",
                }
            ],
        )

    calls = session.run.await_args_list

    assert any(
        "MERGE (c:Candidat" in item.args[0]
        for item in calls
    )
    assert not any(
        "MERGE (p:Projet" in item.args[0]
        for item in calls
    )