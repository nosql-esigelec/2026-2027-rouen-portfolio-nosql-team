"""Tests de la route R4 et R5 et R8."""

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from portfolio_api.api.routes_graph import router
from portfolio_api.models import SimilarProjetsOut, ProjetsResponse
from portfolio_api.services import graph_service,candidat_service
from portfolio_api.api.routes_candidats import router as candidats_router


@pytest.fixture
def client():
    # Application limitée aux routes à tester.
    app = FastAPI()
    app.include_router(router, prefix="/api")

    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def client_r8():
    app = FastAPI()
    app.include_router(candidats_router, prefix="/api")

    with TestClient(app) as test_client:
        yield test_client

def test_r4_returns_similar_projets(client, monkeypatch):
    result = SimilarProjetsOut.model_validate(
        {
            "projet_source": "smartcity-explorer",
            "total": 1,
            "projets_similaires": [
                {
                    "slug": "city-dashboard",
                    "titre": "City Dashboard",
                    "competences_communes": ["python", "mongodb"],
                    "nombre_competences_communes": 2,
                }
            ],
        }
    )
    service = AsyncMock(return_value=result)
    monkeypatch.setattr(
        graph_service,
        "get_similar_projets",
        service,
    )

    response = client.get(
        "/api/graph/projets/smartcity-explorer/similaires",
        params={"limit": 3},
    )

    assert response.status_code == 200
    assert response.json() == result.model_dump(mode="json")
    service.assert_awaited_once_with(
        slug="smartcity-explorer",
        limit=3,
    )


def test_r4_default_limit_and_empty_results(client, monkeypatch):
    result = SimilarProjetsOut.model_validate(
        {
            "projet_source": "smartcity-explorer",
            "total": 0,
            "projets_similaires": [],
        }
    )
    service = AsyncMock(return_value=result)
    monkeypatch.setattr(
        graph_service,
        "get_similar_projets",
        service,
    )

    response = client.get(
        "/api/graph/projets/smartcity-explorer/similaires"
    )

    assert response.status_code == 200
    assert response.json() == result.model_dump(mode="json")
    service.assert_awaited_once_with(
        slug="smartcity-explorer",
        limit=5,
    )


def test_r4_unknown_projet(client, monkeypatch):
    monkeypatch.setattr(
        graph_service,
        "get_similar_projets",
        AsyncMock(return_value=None),
    )

    response = client.get("/api/graph/projets/inconnu/similaires")

    assert response.status_code == 404
    assert response.json() == {"detail": "Projet introuvable"}


@pytest.mark.parametrize(
    "params",
    [
        {"limit": 0},
        {"limit": 101},
        {"limit": "abc"},
    ],
)
def test_r4_invalid_limit(client, monkeypatch, params):
    service = AsyncMock()
    monkeypatch.setattr(
        graph_service,
        "get_similar_projets",
        service,
    )

    response = client.get(
        "/api/graph/projets/smartcity-explorer/similaires",
        params=params,
    )

    assert response.status_code == 422
    service.assert_not_awaited()



# R8 : Projets d'un candidat par domaine 


def test_r8_returns_projects_by_domain(client_r8, monkeypatch):
    """R8 : retourne les projets filtrés par domaine."""

    result = ProjetsResponse.model_validate(
        {
            "candidat_slug": "lea-bernard",
            "filtres": {
                "competence": None,
                "domaine_slug": "big-data",
            },
            "pagination": {
                "page": 1,
                "limit": 10,
                "total": 1,
                "total_pages": 1,
            },
            "projets": [
                {
                    "projet_slug": "smartcity-explorer",
                    "titre": "SmartCity Explorer",
                }
            ],
        }
    )

    service = AsyncMock(return_value=result)

    monkeypatch.setattr(
        candidat_service,
        "get_candidat_projets",
        service,
    )

    response = client_r8.get(
        "/api/candidats/lea-bernard/projets",
        params={
            "domaine_slug": "big-data",
            "page": 1,
            "limit": 10,
        },
    )

    assert response.status_code == 200
    assert response.json() == result.model_dump(mode="json")

    service.assert_awaited_once_with(
        slug="lea-bernard",
        competence=None,
        domaine_slug="big-data",
        page=1,
        limit=10,
    )


def test_r8_empty_projects(client_r8, monkeypatch):
    """R8 : domaine sans projet -> liste vide."""

    result = ProjetsResponse.model_validate(
        {
            "candidat_slug": "lea-bernard",
            "filtres": {
                "competence": None,
                "domaine_slug": "cybersecurite",
            },
            "pagination": {
                "page": 1,
                "limit": 10,
                "total": 0,
                "total_pages": 0,
            },
            "projets": [],
        }
    )

    service = AsyncMock(return_value=result)

    monkeypatch.setattr(
        candidat_service,
        "get_candidat_projets",
        service,
    )

    response = client_r8.get(
        "/api/candidats/lea-bernard/projets",
        params={
            "domaine_slug": "cybersecurite",
        },
    )

    assert response.status_code == 200
    assert response.json()["projets"] == []
    assert response.json()["pagination"]["total"] == 0

    service.assert_awaited_once_with(
        slug="lea-bernard",
        competence=None,
        domaine_slug="cybersecurite",
        page=1,
        limit=10,
    )


def test_r8_unknown_candidat(client_r8, monkeypatch):
    """R8 : candidat inexistant -> HTTP 404."""

    service = AsyncMock(return_value=None)

    monkeypatch.setattr(
        candidat_service,
        "get_candidat_projets",
        service,
    )

    response = client_r8.get(
        "/api/candidats/inconnu/projets",
        params={
            "domaine_slug": "big-data",
        },
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Candidat introuvable"
    }

    service.assert_awaited_once_with(
        slug="inconnu",
        competence=None,
        domaine_slug="big-data",
        page=1,
        limit=10,
    )


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page": "abc"},
        {"limit": 0},
        {"limit": 101},
    ],
)
def test_r8_invalid_parameters(client_r8, monkeypatch, params):
    """R8 : paramètres invalides -> HTTP 422."""

    service = AsyncMock()

    monkeypatch.setattr(
        candidat_service,
        "get_candidat_projets",
        service,
    )

    response = client_r8.get(
        "/api/candidats/lea-bernard/projets",
        params={
            "domaine_slug": "big-data",
            **params,
        },
    )

    assert response.status_code == 422

    service.assert_not_awaited()
