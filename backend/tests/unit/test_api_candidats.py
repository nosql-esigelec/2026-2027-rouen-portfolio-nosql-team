"""Tests des routes R1 et R2."""

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from portfolio_api.api.routes_candidats import router
from portfolio_api.models import CandidatOut, ProjetsResponse
from portfolio_api.services import candidat_service


@pytest.fixture
def client():
    # Application limitée aux routes à tester.
    app = FastAPI()
    app.include_router(router, prefix="/api")

    with TestClient(app) as test_client:
        yield test_client


def test_r1_returns_profile(client, monkeypatch):
    profile = CandidatOut.model_validate(
        {
            "candidat_slug": "lea-bernard",
            "prenom": "Léa",
            "nom": "Bernard",
            "titre": "Élève-ingénieure Big Data",
            "bio": "Passionnée par les données.",
        }
    )
    service = AsyncMock(return_value=profile)
    monkeypatch.setattr(
        candidat_service,
        "get_candidat_profile",
        service,
    )

    response = client.get("/api/candidats/lea-bernard")

    assert response.status_code == 200
    assert response.json() == profile.model_dump(mode="json")
    service.assert_awaited_once_with("lea-bernard")


def test_r1_unknown_candidat(client, monkeypatch):
    monkeypatch.setattr(
        candidat_service,
        "get_candidat_profile",
        AsyncMock(return_value=None),
    )

    response = client.get("/api/candidats/inconnu")

    assert response.status_code == 404
    assert response.json() == {"detail": "Candidat introuvable"}


def test_r2_passes_filters_and_pagination(client, monkeypatch):
    result = ProjetsResponse.model_validate(
        {
            "candidat_slug": "lea-bernard",
            "filtres": {
                "competence": "python",
                "domaine_slug": "web",
            },
            "pagination": {
                "page": 2,
                "limit": 1,
                "total": 2,
                "total_pages": 2,
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

    response = client.get(
        "/api/candidats/lea-bernard/projets",
        params={
            "competence": "python",
            "domaine_slug": "web",
            "page": 2,
            "limit": 1,
        },
    )

    assert response.status_code == 200
    assert response.json() == result.model_dump(mode="json")
    service.assert_awaited_once_with(
        slug="lea-bernard",
        competence="python",
        domaine_slug="web",
        page=2,
        limit=1,
    )


def test_r2_defaults_and_empty_results(client, monkeypatch):
    result = ProjetsResponse.model_validate(
        {
            "candidat_slug": "lea-bernard",
            "filtres": {
                "competence": None,
                "domaine_slug": None,
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

    response = client.get("/api/candidats/lea-bernard/projets")

    assert response.status_code == 200
    assert response.json() == result.model_dump(mode="json")
    service.assert_awaited_once_with(
        slug="lea-bernard",
        competence=None,
        domaine_slug=None,
        page=1,
        limit=10,
    )


def test_r2_unknown_candidat(client, monkeypatch):
    monkeypatch.setattr(
        candidat_service,
        "get_candidat_projets",
        AsyncMock(return_value=None),
    )

    response = client.get("/api/candidats/inconnu/projets")

    assert response.status_code == 404
    assert response.json() == {"detail": "Candidat introuvable"}


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page": "abc"},
        {"limit": 0},
        {"limit": 101},
    ],
)
def test_r2_invalid_parameters(client, monkeypatch, params):
    service = AsyncMock()
    monkeypatch.setattr(
        candidat_service,
        "get_candidat_projets",
        service,
    )

    response = client.get(
        "/api/candidats/lea-bernard/projets",
        params=params,
    )

    assert response.status_code == 422
    service.assert_not_awaited()