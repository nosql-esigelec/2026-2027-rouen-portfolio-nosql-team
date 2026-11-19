"""Tests unitaires — seed Neo4j du Portfolio Polyglotte.

Fonction testée : portfolio_api.scripts.seed.seed_neo4j(candidats, projets)
Aucun serveur Neo4j nécessaire : le driver async est simulé.

Depuis la racine du dépôt :
    uv run --project .\\backend pytest backend/tests/unit/test_seed_neo4j.py -v
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from portfolio_api.scripts import seed

pytestmark = pytest.mark.asyncio


@pytest.fixture
def neo4j_session():
    """Session Neo4j simulée : run() et consume() sont asynchrones."""
    result = MagicMock()
    result.consume = AsyncMock()
    session = MagicMock()
    session.run = AsyncMock(return_value=result)
    return session


@pytest.fixture
def neo4j_driver(neo4j_session):
    """Remplace le driver recherché par seed_neo4j dans son module.

    create=True est nécessaire si get_neo4j_driver n'est pas importé
    au niveau du module seed.py fourni.
    """
    driver = MagicMock()
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=neo4j_session)
    context.__aexit__ = AsyncMock(return_value=None)
    driver.session.return_value = context

    with patch.object(seed, "get_neo4j_driver", return_value=driver, create=True):
        yield driver


@pytest.fixture
def candidats():
    return [{
        "candidat_slug": "lea-bernard",
        "nom": "Bernard",
        "prenom": "Léa",
        "titre": "Data Engineer",
        "competences": [
            {"skill_slug": "python", "nom": "Python", "domaine": "langages", "niveau": 5},
        ],
        "experiences": [
            {"entreprise": "Renault Digital", "poste": "Stage Data", "debut": "2026-04", "fin": "2026-08"},
        ],
    }]


@pytest.fixture
def projets():
    return [{
        "projet_slug": "portfolio-polyglotte",
        "titre": "Portfolio Polyglotte",
        "candidat_slugs": ["lea-bernard"],
        "competence_slugs": ["python"],
        "domaine_slugs": ["langages"],
        "entreprise_slug": "renault-digital",
    }]


class TestSeedNeo4jConstraints:
    async def test_creates_five_unique_constraints(self, neo4j_driver, neo4j_session, projets):
        """Les cinq contraintes sont créées en premier, une par label."""
        await seed.seed_neo4j([], projets)
        calls = neo4j_session.run.await_args_list
        labels = ["Candidat", "Projet", "Competence", "Domaine", "Entreprise"]
        assert len(calls) >= 5
        for call, label in zip(calls[:5], labels):
            cypher = call.args[0]
            assert "CREATE CONSTRAINT" in cypher
            assert f":{label}" in cypher
            assert "REQUIRE" in cypher
            assert "slug IS UNIQUE" in cypher

    async def test_does_not_delete_existing_graph(self, neo4j_driver, neo4j_session, projets):
        """Le seed idempotent ne doit pas exécuter DETACH DELETE."""
        await seed.seed_neo4j([], projets)
        queries = [call.args[0] for call in neo4j_session.run.await_args_list]
        assert all("DETACH DELETE" not in query for query in queries)


class TestSeedNeo4jNodes:
    async def test_creates_candidates_projects_and_competences(
        self, neo4j_driver, neo4j_session, candidats, projets
    ):
        """Les MERGE reçoivent les vrais noms des champs du JSON."""
        await seed.seed_neo4j(candidats, projets)
        calls = neo4j_session.run.await_args_list

        def parameters_for(fragment):
            return [c.kwargs for c in calls if fragment in c.args[0]]

        assert parameters_for("MERGE (c:Candidat")[0]["candidat_slug"] == "lea-bernard"
        assert parameters_for("MERGE (p:Projet")[0]["projet_slug"] == "portfolio-polyglotte"
        assert any(p["skill_slug"] == "python" for p in parameters_for("MERGE (c:Competence"))
        assert any(p["domaine_slug"] == "langages" for p in parameters_for("MERGE (d:Domaine"))
        assert parameters_for("MERGE (e:Entreprise")[0]["entreprise_slug"] == "renault-digital"

    async def test_consumes_every_result(self, neo4j_driver, neo4j_session, candidats, projets):
        """Chaque session.run() doit être consommé avant de continuer."""
        await seed.seed_neo4j(candidats, projets)
        result = neo4j_session.run.return_value
        assert result.consume.await_count == neo4j_session.run.await_count


class TestSeedNeo4jRelationships:
    async def test_creates_six_relationship_types(
        self, neo4j_driver, neo4j_session, candidats, projets
    ):
        """Vérifie toutes les relations exigées par ARCHITECTURE.md."""
        await seed.seed_neo4j(candidats, projets)
        cypher = "\n".join(c.args[0] for c in neo4j_session.run.await_args_list)
        for relation in (
            "A_REALISE", "MAITRISE", "UTILISE", "APPARTIENT_A",
            "A_TRAVAILLE_CHEZ", "REALISE_POUR",
        ):
            assert f":{relation}" in cypher

    async def test_experience_transmits_dates(
        self, neo4j_driver, neo4j_session, candidats, projets
    ):
        """L'expérience professionnelle transmet poste, début et fin."""
        await seed.seed_neo4j(candidats, projets)
        experience_calls = [
            c for c in neo4j_session.run.await_args_list
            if "MERGE (c)-[r:A_TRAVAILLE_CHEZ" in c.args[0]
        ]
        assert len(experience_calls) == 1
        params = experience_calls[0].kwargs
        assert params["poste"] == "Stage Data"
        assert params["debut"] == "2026-04"
        assert params["fin"] == "2026-08"


class TestSeedNeo4jEdgeCases:
    async def test_empty_lists_create_only_constraints(self, neo4j_driver, neo4j_session):
        """Seed vide : aucune donnée ajoutée, les cinq contraintes seulement."""
        await seed.seed_neo4j([], [])
        calls = neo4j_session.run.await_args_list
        assert len(calls) == 5
        assert all("CREATE CONSTRAINT" in c.args[0] for c in calls)

    async def test_propagates_database_errors(self, neo4j_driver, neo4j_session, projets):
        """Une erreur de Neo4j arrête l'import sans être masquée."""
        neo4j_session.run.side_effect = RuntimeError("Neo4j indisponible")
        with pytest.raises(RuntimeError, match="Neo4j indisponible"):
            await seed.seed_neo4j([], projets)
        neo4j_session.run.assert_awaited_once()
