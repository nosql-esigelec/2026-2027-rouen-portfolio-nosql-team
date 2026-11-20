"""Tests des services R7 et R8."""

from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from portfolio_api.models import ProjetsResponse
from portfolio_api.services import candidat_service


pytestmark = pytest.mark.asyncio


@pytest.fixture
def candidat_collection(monkeypatch):
    """Remplace l'accès MongoDB utilisé par R7."""
    collection = SimpleNamespace(find_one=AsyncMock())
    db = SimpleNamespace(candidats=collection)

    monkeypatch.setattr(
        candidat_service,
        "get_mongo_db",
        Mock(return_value=db),
    )

    return collection


async def test_r7_selects_latest_start_date(candidat_collection):
    """Sélectionne selon debut, même si la liste n'est pas triée."""
    experiences = [
        {
            "entreprise": "Entreprise A",
            "poste": "Développeuse",
            "debut": "2025-09",
            "fin": "2026-12",
        },
        {
            "entreprise": "Renault Digital",
            "poste": "Data Engineer",
            "debut": "2026-04",
            "fin": "2026-08",
        },
        {
            "entreprise": "Entreprise B",
            "poste": "Stagiaire",
            "debut": "2024-06",
            "fin": "2024-08",
        },
    ]
    original = deepcopy(experiences)

    candidat_collection.find_one.return_value = {
        "experiences": experiences,
    }

    result = await candidat_service.get_latest_experience(
        "lea-bernard"
    )

    assert result == original[1]
    assert experiences == original
    candidat_collection.find_one.assert_awaited_once_with(
        {"candidat_slug": "lea-bernard"},
        {"_id": 0, "experiences": 1},
    )


async def test_r7_unknown_candidat(candidat_collection):
    candidat_collection.find_one.return_value = None

    result = await candidat_service.get_latest_experience(
        "inconnu"
    )

    assert result is None


@pytest.mark.parametrize(
    "candidat",
    [
        {"experiences": []},
        {},
    ],
)
async def test_r7_without_experiences(
    candidat_collection,
    candidat,
):
    candidat_collection.find_one.return_value = candidat

    result = await candidat_service.get_latest_experience(
        "lea-bernard"
    )

    assert result is None


@pytest.mark.parametrize("competence", [None, "python"])
async def test_r8_passes_filters_and_builds_pagination(
    monkeypatch,
    competence,
):
    """Transmet les filtres et calcule le nombre total de pages."""
    find_candidat = AsyncMock(
        return_value={"candidat_slug": "lea-bernard"}
    )
    projets = [
        {
            "projet_slug": "smartcity-explorer",
            "titre": "SmartCity Explorer",
            "domaine_slugs": ["web"],
            "competence_slugs": ["python"],
        }
    ]
    list_projets = AsyncMock(return_value=(projets, 21))

    monkeypatch.setattr(
        candidat_service.mongo_candidats,
        "find_candidat",
        find_candidat,
    )
    monkeypatch.setattr(
        candidat_service.mongo_projets,
        "list_projets",
        list_projets,
    )

    result = await candidat_service.get_candidat_projets(
        slug="lea-bernard",
        competence=competence,
        domaine_slug="web",
        page=3,
        limit=10,
    )

    assert isinstance(result, ProjetsResponse)
    assert result.candidat_slug == "lea-bernard"
    assert result.filtres.domaine_slug == "web"
    assert result.filtres.competence == competence
    assert result.pagination.model_dump() == {
        "page": 3,
        "limit": 10,
        "total": 21,
        "total_pages": 3,
    }
    assert [
        projet.projet_slug for projet in result.projets
    ] == ["smartcity-explorer"]

    find_candidat.assert_awaited_once_with("lea-bernard")
    list_projets.assert_awaited_once_with(
        candidat_slug="lea-bernard",
        competence=competence,
        domaine_slug="web",
        page=3,
        limit=10,
    )


async def test_r8_domain_without_results(monkeypatch):
    """Un candidat connu sans résultat retourne une liste vide."""
    monkeypatch.setattr(
        candidat_service.mongo_candidats,
        "find_candidat",
        AsyncMock(return_value={"candidat_slug": "lea-bernard"}),
    )
    monkeypatch.setattr(
        candidat_service.mongo_projets,
        "list_projets",
        AsyncMock(return_value=([], 0)),
    )

    result = await candidat_service.get_candidat_projets(
        slug="lea-bernard",
        domaine_slug="domaine-inexistant",
    )

    assert isinstance(result, ProjetsResponse)
    assert result.projets == []
    assert result.pagination.total == 0
    assert result.pagination.total_pages == 0
    assert result.filtres.domaine_slug == "domaine-inexistant"


async def test_r8_unknown_candidat(monkeypatch):
    """Ne recherche pas les projets d'un candidat inconnu."""
    list_projets = AsyncMock()

    monkeypatch.setattr(
        candidat_service.mongo_candidats,
        "find_candidat",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        candidat_service.mongo_projets,
        "list_projets",
        list_projets,
    )

    result = await candidat_service.get_candidat_projets(
        slug="inconnu",
        domaine_slug="web",
    )

    assert result is None
    list_projets.assert_not_awaited()


async def test_r8_page_beyond_results(monkeypatch):
    """Une page vide conserve le total et le nombre de pages."""
    monkeypatch.setattr(
        candidat_service.mongo_candidats,
        "find_candidat",
        AsyncMock(return_value={"candidat_slug": "lea-bernard"}),
    )
    monkeypatch.setattr(
        candidat_service.mongo_projets,
        "list_projets",
        AsyncMock(return_value=([], 2)),
    )

    result = await candidat_service.get_candidat_projets(
        slug="lea-bernard",
        domaine_slug="web",
        page=3,
        limit=10,
    )

    assert result is not None
    assert result.projets == []
    assert result.pagination.page == 3
    assert result.pagination.total == 2
    assert result.pagination.total_pages == 1