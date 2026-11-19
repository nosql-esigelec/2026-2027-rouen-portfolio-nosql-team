"""Tests de la route R4."""

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from portfolio_api.api.routes_graph import router
from portfolio_api.models import SimilarProjetsOut
from portfolio_api.services import graph_service


@pytest.fixture
def client():
    # Application limitée aux routes à tester.
    app = FastAPI()
    app.include_router(router, prefix="/api")

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