"""Tests des routes R1 ,R2 ,R3 et R7."""

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from portfolio_api.api.routes_candidats import router
from portfolio_api.models import CandidatOut, ProjetsResponse, StatsOut 
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


def test_r3_returns_stats(client, monkeypatch):
    result = StatsOut.model_validate(
        {
            "candidat_slug": "lea-bernard",
            "total_projets": 3,
            "total_competences_utilisees": 2,
            "statistiques": [
                {
                    "competence_slug": "python",
                    "nom": "Python",
                    "nombre_projets": 3,
                },
                {
                    "competence_slug": "mongodb",
                    "nom": "MongoDB",
                    "nombre_projets": 1,
                },
            ],
        }
    )
    service = AsyncMock(return_value=result)
    monkeypatch.setattr(
        candidat_service,
        "get_candidat_stats",
        service,
    )

    response = client.get("/api/candidats/lea-bernard/stats")

    assert response.status_code == 200
    assert response.json() == result.model_dump(mode="json")
    service.assert_awaited_once_with("lea-bernard")


def test_r3_candidat_without_projects(client, monkeypatch):
    result = StatsOut.model_validate(
        {
            "candidat_slug": "lea-bernard",
            "total_projets": 0,
            "total_competences_utilisees": 0,
            "statistiques": [],
        }
    )
    monkeypatch.setattr(
        candidat_service,
        "get_candidat_stats",
        AsyncMock(return_value=result),
    )

    response = client.get("/api/candidats/lea-bernard/stats")

    assert response.status_code == 200
    assert response.json()["statistiques"] == []
    assert response.json()["total_projets"] == 0


def test_r3_unknown_candidat(client, monkeypatch):
    monkeypatch.setattr(
        candidat_service,
        "get_candidat_stats",
        AsyncMock(return_value=None),
    )

    response = client.get("/api/candidats/inconnu/stats")

    assert response.status_code == 404
    assert response.json() == {"detail": "Candidat introuvable"}



# R7 : Dernière expérience professionnelle d'un candidat


def test_r7_returns_latest_experience(client, monkeypatch):
    """R7 : retourne la dernière expérience du candidat."""

    experience = {
            "entreprise": "Renault Digital",
            "poste": "Stagiaire Data Engineer",
            "debut": "2026-04",
            "fin": "2026-08",
    }

    service = AsyncMock(return_value=experience)

    monkeypatch.setattr(
        candidat_service,
        "get_latest_experience",
        service,
    )

    response = client.get(
        "/api/candidats/lea-bernard/experiences/derniere"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["candidat_slug"] == "lea-bernard"
    assert data["experience"] is not None
    assert data["experience"]["entreprise"] == "Renault Digital"
    assert data["experience"]["poste"] == "Stagiaire Data Engineer"
    assert data["experience"]["debut"] == "2026-04"
    assert data["experience"]["fin"] == "2026-08"

    service.assert_awaited_once_with("lea-bernard")



def test_r7_unknown_candidat(client, monkeypatch):
    """R7 : candidat inexistant -> HTTP 404."""

    service = AsyncMock(return_value=None)

    monkeypatch.setattr(
        candidat_service,
        "get_latest_experience",
        service,
    )

    response = client.get(
        "/api/candidats/inconnu/experiences/derniere"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Candidat introuvable ou aucune expérience disponible"
    }

    service.assert_awaited_once_with("inconnu")


def test_r7_candidat_without_experience(client, monkeypatch):
    """R7 : candidat sans expérience -> HTTP 404."""

    service = AsyncMock(return_value=None)

    monkeypatch.setattr(
        candidat_service,
        "get_latest_experience",
        service,
    )

    response = client.get(
        "/api/candidats/lea-bernard/experiences/derniere"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Candidat introuvable ou aucune expérience disponible"
    }

    service.assert_awaited_once_with("lea-bernard")
