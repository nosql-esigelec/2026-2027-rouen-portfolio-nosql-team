"""Tests unitaires — Repository Neo4j du Portfolio Polyglotte.

Fichier testé : backend/src/portfolio_api/repositories/neo4j_graph.py

Fonctions :
    - find_similar_projets(slug, limit)        : R4
    - find_competence_graph(slug)              : R5
    - create_constraints()
    - upsert_candidat(document)
    - upsert_projet(document)
    - delete_projet(slug)

Aucune connexion réelle à Neo4j : le driver et la session sont simulés.

Depuis la racine du dépôt :
    uv run pytest backend/tests/unit/test_neo4j_graph.py -v
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from portfolio_api.repositories import neo4j_graph

pytestmark = pytest.mark.asyncio


class FakeNeo4jResult:
    """Résultat minimal équivalent à neo4j.AsyncResult pour .data()."""

    def __init__(self, records: list[dict]):
        self.records = records

    async def data(self) -> list[dict]:
        return self.records


@pytest.fixture
def neo4j_session():
    """Session simulée ; .run() est awaitable."""
    session = MagicMock()
    session.run = AsyncMock(return_value=FakeNeo4jResult([]))
    return session


@pytest.fixture
def neo4j_driver(monkeypatch, neo4j_session):
    """Driver simulé injecté dans get_neo4j_driver()."""
    driver = MagicMock()
    session_context = MagicMock()
    session_context.__aenter__ = AsyncMock(return_value=neo4j_session)
    session_context.__aexit__ = AsyncMock(return_value=None)
    driver.session.return_value = session_context
    monkeypatch.setattr(neo4j_graph, "get_neo4j_driver", lambda: driver)
    return driver


# ── R4 : find_similar_projets ────────────────────────────────────


class TestFindSimilarProjets:
    """Retrouver les projets partageant des compétences via UTILISE."""

    async def test_returns_similar_projects(self, neo4j_driver, neo4j_session):
        records = [{
            "projet_source": "smartcity-explorer",
            "total": 2,
            "projets_similaires": [
                {
                    "projet_slug": "portfolio-polyglotte",
                    "titre": "Portfolio Polyglotte",
                    "competences_communes": ["python", "neo4j"],
                    "nombre_competences_communes": 2,
                },
                {
                    "projet_slug": "pipeline-data",
                    "titre": "Pipeline Data",
                    "competences_communes": ["python"],
                    "nombre_competences_communes": 1,
                },
            ],
        }]
        neo4j_session.run.return_value = FakeNeo4jResult(records)

        result = await neo4j_graph.find_similar_projets("smartcity-explorer", limit=5)

        assert isinstance(result, dict)
        assert result["projet_source"] == "smartcity-explorer"
        assert result["total"] == 2
        assert len(result["projets_similaires"]) == 2
        assert result["projets_similaires"][0]["nombre_competences_communes"] == 2

    async def test_returns_no_similars(self, neo4j_driver, neo4j_session):
        neo4j_session.run.return_value = FakeNeo4jResult([{
            "projet_source": "projet-solo", "total": 0, "projets_similaires": []
        }])

        result = await neo4j_graph.find_similar_projets("projet-solo")

        assert result == {
            "projet_source": "projet-solo", "total": 0, "projets_similaires": []
        }

    async def test_returns_none_if_project_unknown(self, neo4j_driver, neo4j_session):
        neo4j_session.run.return_value = FakeNeo4jResult([])

        assert await neo4j_graph.find_similar_projets("inconnu") is None

    async def test_calls_session_run_with_parameters(self, neo4j_driver, neo4j_session):
        await neo4j_graph.find_similar_projets("smartcity-explorer", limit=3)

        neo4j_session.run.assert_awaited_once()
        args, kwargs = neo4j_session.run.call_args
        assert kwargs == {"projet_slug": "smartcity-explorer", "limit": 3}
        assert "MATCH (p:Projet" in args[0]
        assert ":UTILISE" in args[0]
        assert "competences_communes" in args[0]


# ── R5 : find_competence_graph ────────────────────────────────────


class TestFindCompetenceGraph:
    """Graphe personnel d'un candidat : nodes et links."""

    async def test_returns_nodes_and_links(self, neo4j_driver, neo4j_session):
        records = [{
            "candidat_slug": "lea-bernard",
            "nodes": [
                {"id": "candidat:lea-bernard", "label": "Léa Bernard", "type": "Candidat"},
                {"id": "competence:python", "label": "Python", "type": "Competence"},
                {"id": "domaine:langages", "label": "Langages", "type": "Domaine"},
            ],
            "links": [
                {"source": "candidat:lea-bernard", "target": "competence:python", "type": "MAITRISE"},
                {"source": "competence:python", "target": "domaine:langages", "type": "APPARTIENT_A"},
            ],
        }]
        neo4j_session.run.return_value = FakeNeo4jResult(records)

        result = await neo4j_graph.find_competence_graph("lea-bernard")

        assert isinstance(result, dict)
        assert result["candidat_slug"] == "lea-bernard"
        assert len(result["nodes"]) == 3
        assert len(result["links"]) == 2
        assert all({"id", "label", "type"} <= set(n) for n in result["nodes"])
        assert all({"source", "target", "type"} <= set(l) for l in result["links"])

    async def test_returns_none_when_candidate_unknown(self, neo4j_driver, neo4j_session):
        neo4j_session.run.return_value = FakeNeo4jResult([])

        assert await neo4j_graph.find_competence_graph("inconnu") is None

    async def test_allows_graph_without_relationships(self, neo4j_driver, neo4j_session):
        neo4j_session.run.return_value = FakeNeo4jResult([{
            "candidat_slug": "lea-bernard",
            "nodes": [{"id": "candidat:lea-bernard", "label": "Léa Bernard", "type": "Candidat"}],
            "links": [],
        }])

        result = await neo4j_graph.find_competence_graph("lea-bernard")

        assert len(result["nodes"]) == 1
        assert result["links"] == []

    async def test_calls_session_run_with_candidate_slug(self, neo4j_driver, neo4j_session):
        await neo4j_graph.find_competence_graph("lea-bernard")

        neo4j_session.run.assert_awaited_once()
        args, kwargs = neo4j_session.run.call_args
        assert kwargs == {"candidat_slug": "lea-bernard"}
        for relation in ("MAITRISE", "A_REALISE", "UTILISE", "APPARTIENT_A"):
            assert relation in args[0]
        assert " AS nodes" in args[0]
        assert " AS links" in args[0]


# ── Contraintes ─────────────────────────────────────────────────


class TestCreateConstraints:
    async def test_creates_five_slug_constraints(self, neo4j_driver, neo4j_session):
        await neo4j_graph.create_constraints()

        assert neo4j_session.run.await_count == 5
        queries = [call.args[0] for call in neo4j_session.run.await_args_list]
        for label in ("Candidat", "Projet", "Competence", "Domaine", "Entreprise"):
            assert any(f"(n:{label})" in query for query in queries)
        assert all("IF NOT EXISTS" in query for query in queries)
        assert all("REQUIRE n.slug IS UNIQUE" in query for query in queries)


# ── Initialisation des candidats et des projets ────────────────


class TestUpsertCandidat:
    async def test_creates_candidate_skills_and_employer(self, neo4j_driver, neo4j_session):
        # Contrat actuellement attendu par neo4j_graph.py (champs slug / domaine_slug).
        candidat = {
            "candidat_slug": "lea-bernard", "nom": "Bernard", "prenom": "Léa", "titre": "Data Engineer",
            "competences": [{"competences_slug": "python", "nom": "Python", "domaine_slug": "langages", "niveau": 5}],
            "experiences": [{"entreprise": "Renault Digital", "poste": "Data Engineer",
                             "date_debut": "2026-04", "date_fin": "2026-08"}],
        }

        await neo4j_graph.upsert_candidat(candidat)

        assert neo4j_session.run.await_count == 3
        params = [call.kwargs for call in neo4j_session.run.await_args_list]
        assert params[0]["candidat_slug"] == "lea-bernard"
        assert params[1]["skill_slug"] == "python"
        assert params[1]["domaine_slug"] == "langages"
        assert params[1]["niveau"] == 5
        assert params[2]["entreprise_slug"] == "renault-digital"


class TestUpsertProjet:
    async def test_creates_project_authors_skills_company(self, neo4j_driver, neo4j_session):
        projet = {
            "projet_slug": "smartcity-explorer", "titre": "SmartCity Explorer",
            "candidat_slugs": ["lea-bernard", "hugo-lefebvre"],
            "competence_slugs": ["python", "neo4j"],
            "entreprise": "Renault Digital", "contexte": "Stage",
        }

        await neo4j_graph.upsert_projet(projet)

        assert neo4j_session.run.await_count == 6  # 1 projet + 2 auteurs + 2 compétences + 1 entreprise
        queries = [call.args[0] for call in neo4j_session.run.await_args_list]
        assert any(":A_REALISE" in q for q in queries)
        assert any(":UTILISE" in q for q in queries)
        assert any(":REALISE_POUR" in q for q in queries)

    async def test_project_without_company(self, neo4j_driver, neo4j_session):
        projet = {"projet_slug": "portfolio", "titre": "Portfolio", "candidat_slugs": [], "competence_slugs": []}

        await neo4j_graph.upsert_projet(projet)

        neo4j_session.run.assert_awaited_once()
        assert "MERGE (p:Projet" in neo4j_session.run.call_args.args[0]


# ── Suppression d'un projet ─────────────────────────────────────


class TestDeleteProjet:
    async def test_detach_delete_uses_project_slug(self, neo4j_driver, neo4j_session):
        await neo4j_graph.delete_projet("smartcity-explorer")

        neo4j_session.run.assert_awaited_once()
        args, kwargs = neo4j_session.run.call_args
        assert kwargs == {"projet_slug": "smartcity-explorer"}
        assert "DETACH DELETE p" in args[0]
        assert "MATCH (p:Projet" in args[0]
