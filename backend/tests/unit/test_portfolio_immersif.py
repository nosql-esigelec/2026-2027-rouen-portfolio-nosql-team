"""Tests sans serveur MongoDB ni Neo4j pour le chargement immersif."""

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from portfolio_api.api.routes_portfolio import router
from portfolio_api.models import (
    CandidatOut,
    CompetenceDetailOut,
    PortfolioOut,
    ProjetsResponse,
    StatsOut,
)
from portfolio_api.services import candidat_service, portfolio_service


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def candidate():
    return CandidatOut.model_validate({
        "candidat_slug": "lea-bernard",
        "nom": "Bernard",
        "prenom": "Léa",
        "titre": "Data engineer",
        "presentation": {"accroche": "Explorer mes projets", "introduction": ["Bienvenue"]},
        "experiences": [
            {"entreprise": "Alpha", "poste": "Stage", "debut": "2025-04", "competences": ["python"]},
        ],
        "formations": [{"ecole": "ESIGELEC", "diplome": "Ingénieur", "debut": "2024-09"}],
        "competences": [
            {"skill_slug": "python", "nom": "Python", "domaine_slug": "langages", "niveau": 4}
        ],
    })


@pytest.fixture
def projects():
    return ProjetsResponse.model_validate({
        "candidat_slug": "lea-bernard",
        "filtres": {"competence": None, "domaine_slug": None},
        "pagination": {"page": 1, "limit": 30, "total": 1, "total_pages": 1},
        "projets": [{
            "projet_slug": "smartcity", "titre": "SmartCity",
            "competence_slugs": ["python"], "domaine_slugs": ["data"],
        }],
    })


@pytest.fixture
def stats():
    return StatsOut(candidat_slug="lea-bernard", total_projets=1,
                    total_competences_utilisees=1, statistiques=[])


def test_api_portfolio_success(client, candidate, projects, stats, monkeypatch):
    portfolio = PortfolioOut(
        candidat_slug="lea-bernard", candidat=candidate,
        timeline=portfolio_service.build_timeline(candidate), projets=projects, stats=stats,
    )
    fetch = AsyncMock(return_value=portfolio)
    monkeypatch.setattr(portfolio_service, "get_portfolio", fetch)

    result = client.get("/api/portfolio/lea-bernard")
    assert result.status_code == 200
    data = result.json()
    assert data["candidat"]["presentation"]["accroche"] == "Explorer mes projets"
    assert data["timeline"][0]["type"] == "experience"
    assert data["projets"]["projets"][0]["titre"] == "SmartCity"
    fetch.assert_awaited_once_with("lea-bernard", page=1, limit=30)


def test_api_portfolio_not_found(client, monkeypatch):
    monkeypatch.setattr(portfolio_service, "get_portfolio", AsyncMock(return_value=None))
    result = client.get("/api/portfolio/inconnu")
    assert result.status_code == 404
    assert result.json()["detail"] == "Candidat introuvable"


@pytest.mark.parametrize("query", ["?page=0", "?limit=0", "?limit=101", "?page=abc"])
def test_api_portfolio_invalid_query(client, monkeypatch, query):
    fetch = AsyncMock()
    monkeypatch.setattr(portfolio_service, "get_portfolio", fetch)
    assert client.get("/api/portfolio/lea-bernard" + query).status_code == 422
    fetch.assert_not_awaited()


def test_api_competence_detail(client, candidate, projects, monkeypatch):
    detail = CompetenceDetailOut(
        candidat_slug="lea-bernard", competence=candidate.competences[0],
        projets=projects.projets, total_projets=1, experiences=candidate.experiences,
    )
    fetch = AsyncMock(return_value=detail)
    monkeypatch.setattr(portfolio_service, "get_competence_detail", fetch)
    result = client.get("/api/portfolio/lea-bernard/competences/python")
    assert result.status_code == 200
    assert result.json()["total_projets"] == 1
    assert result.json()["experiences"][0]["entreprise"] == "Alpha"
    fetch.assert_awaited_once_with("lea-bernard", "python")


def test_api_competence_detail_not_found(client, monkeypatch):
    monkeypatch.setattr(portfolio_service, "get_competence_detail", AsyncMock(return_value=None))
    result = client.get("/api/portfolio/lea-bernard/competences/inconnue")
    assert result.status_code == 404


@pytest.mark.asyncio
async def test_service_portfolio_aggregates_and_sorts(candidate, projects, stats, monkeypatch):
    profile_fetch = AsyncMock(return_value=candidate)
    projects_fetch = AsyncMock(return_value=projects)
    stats_fetch = AsyncMock(return_value=stats)
    monkeypatch.setattr(candidat_service, "get_candidat_profile", profile_fetch)
    monkeypatch.setattr(candidat_service, "get_candidat_projets", projects_fetch)
    monkeypatch.setattr(candidat_service, "get_candidat_stats", stats_fetch)

    result = await portfolio_service.get_portfolio("lea-bernard")
    assert result is not None
    assert [x.type for x in result.timeline] == ["experience", "formation"]
    assert result.candidat.presentation.introduction == ["Bienvenue"]
    projects_fetch.assert_awaited_once_with("lea-bernard", page=1, limit=30)
    stats_fetch.assert_awaited_once_with("lea-bernard")


@pytest.mark.asyncio
async def test_service_portfolio_unknown_candidate(monkeypatch):
    monkeypatch.setattr(candidat_service, "get_candidat_profile", AsyncMock(return_value=None))
    projects_fetch = AsyncMock()
    monkeypatch.setattr(candidat_service, "get_candidat_projets", projects_fetch)
    assert await portfolio_service.get_portfolio("absent") is None
    projects_fetch.assert_not_awaited()


@pytest.mark.asyncio
async def test_service_skill_returns_related_projects_and_experiences(candidate, projects, monkeypatch):
    monkeypatch.setattr(candidat_service, "get_candidat_profile", AsyncMock(return_value=candidate))
    fetch = AsyncMock(return_value=projects)
    monkeypatch.setattr(candidat_service, "get_candidat_projets", fetch)
    result = await portfolio_service.get_competence_detail("lea-bernard", "python")
    assert result is not None
    assert result.competence.nom == "Python"
    assert result.projets[0].projet_slug == "smartcity"
    assert result.experiences[0].poste == "Stage"
    fetch.assert_awaited_once_with("lea-bernard", competence="python", page=1, limit=100)


@pytest.mark.asyncio
async def test_service_skill_not_in_cv_but_used_in_project(candidate, projects, monkeypatch):
    projects.projets[0].competence_slugs = ["neo4j"]
    monkeypatch.setattr(candidat_service, "get_candidat_profile", AsyncMock(return_value=candidate))
    monkeypatch.setattr(candidat_service, "get_candidat_projets", AsyncMock(return_value=projects))
    detail = await portfolio_service.get_competence_detail("lea-bernard", "neo4j")
    assert detail.competence.nom == "neo4j"
    assert detail.competence.domaine_slug == "data"


@pytest.mark.asyncio
async def test_service_skill_not_found(candidate, projects, monkeypatch):
    projects.projets = []
    projects.pagination.total = 0
    monkeypatch.setattr(candidat_service, "get_candidat_profile", AsyncMock(return_value=candidate))
    monkeypatch.setattr(candidat_service, "get_candidat_projets", AsyncMock(return_value=projects))
    assert await portfolio_service.get_competence_detail("lea-bernard", "inconnue") is None
