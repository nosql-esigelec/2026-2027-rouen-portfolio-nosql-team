"""Tests unitaires — Service R4 (graph_service).

Le repository Neo4j est mocké : aucune connexion au graphe n'est utilisée.

Commande :
    uv run pytest tests/unit/test_graph_service.py -v
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from portfolio_api.models import SimilarProjetsOut
from portfolio_api.services.graph_service import get_similar_projets,get_projects_by_domain

MODULE = "portfolio_api.services.graph_service"


@pytest.fixture
def mock_neo4j():
    """Remplace le module neo4j_graph utilisé par le service."""
    with patch(f"{MODULE}.neo4j_graph", new=AsyncMock()) as mock:
        yield mock


@pytest.fixture
def similar_result():
    """Résultat tel que renvoyé par le repository Neo4j."""
    return {
        "projet_source": "projet-1",
        "total": 2,
        "projets_similaires": [
            {
                "slug": "projet-2",
                "titre": "Projet 2",
                "competences_communes": ["python", "docker"],
                "nombre_competences_communes": 2,
            },
            {
                "slug": "projet-3",
                "titre": "Projet 3",
                "competences_communes": ["python"],
                "nombre_competences_communes": 1,
            },
        ],
    }


class TestGetSimilarProjets:
    """get_similar_projets() — Projets similaires via Neo4j."""

    @pytest.mark.parametrize("limit", [0, -1, 101])
    async def test_invalid_limit_raises_value_error(self, limit, mock_neo4j):
        """Doit lever ValueError si limit n'est pas compris entre 1 et 100."""
        with pytest.raises(ValueError, match="limit"):
            await get_similar_projets("projet-1", limit=limit)

    async def test_invalid_limit_does_not_call_repository(self, mock_neo4j):
        """La validation doit avoir lieu avant l'appel à Neo4j."""
        with pytest.raises(ValueError):
            await get_similar_projets("projet-1", limit=0)

        mock_neo4j.find_similar_projets.assert_not_called()

    @pytest.mark.parametrize("limit", [1, 100])
    async def test_limit_boundaries_are_accepted(
        self, limit, mock_neo4j, similar_result
    ):
        """Les bornes 1 et 100 doivent être acceptées."""
        mock_neo4j.find_similar_projets.return_value = similar_result

        result = await get_similar_projets("projet-1", limit=limit)

        assert isinstance(result, SimilarProjetsOut)

    async def test_returns_none_when_source_projet_not_found(self, mock_neo4j):
        """Doit retourner None si le projet source n'existe pas."""
        mock_neo4j.find_similar_projets.return_value = None

        result = await get_similar_projets("inconnu")

        assert result is None

    async def test_returns_similar_projets_out(
        self, mock_neo4j, similar_result
    ):
        """Doit retourner un SimilarProjetsOut quand tout fonctionne."""
        mock_neo4j.find_similar_projets.return_value = similar_result

        result = await get_similar_projets("projet-1", limit=5)

        assert isinstance(result, SimilarProjetsOut)
        assert result.projet_source == "projet-1"
        assert result.total == 2
        assert len(result.projets_similaires) == 2

    async def test_calls_repository_with_slug_and_limit(
        self, mock_neo4j, similar_result
    ):
        """Doit transmettre le slug et la limite au repository."""
        mock_neo4j.find_similar_projets.return_value = similar_result

        await get_similar_projets("projet-1", limit=3)

        mock_neo4j.find_similar_projets.assert_called_once_with(
            slug="projet-1", limit=3
        )

    async def test_default_limit_is_5(self, mock_neo4j, similar_result):
        """La limite par défaut doit être 5."""
        mock_neo4j.find_similar_projets.return_value = similar_result

        await get_similar_projets("projet-1")

        mock_neo4j.find_similar_projets.assert_called_once_with(
            slug="projet-1", limit=5
        )

    async def test_similar_projet_item_structure(
        self, mock_neo4j, similar_result
    ):
        """Chaque projet similaire doit contenir slug, titre et compétences communes."""
        mock_neo4j.find_similar_projets.return_value = similar_result

        result = await get_similar_projets("projet-1")

        projet = result.projets_similaires[0]
        assert projet.slug == "projet-2"
        assert projet.titre == "Projet 2"
        assert "docker" in projet.competences_communes
        assert projet.nombre_competences_communes == 2

    async def test_empty_similar_projets(self, mock_neo4j):
        """Doit gérer correctement l'absence de projets similaires."""
        mock_neo4j.find_similar_projets.return_value = {
            "projet_source": "projet-1",
            "total": 0,
            "projets_similaires": [],
        }

        result = await get_similar_projets("projet-1")

        assert isinstance(result, SimilarProjetsOut)
        assert result.total == 0
        assert result.projets_similaires == []

# R8 — get_projects_by_domain Projets d'un candidat filtrés par domaine (MongoDB)

@pytest.fixture
def mock_db_r8():
    """Simule la connexion MongoDB utilisée par R8."""

    with patch(f"{MODULE}.get_mongo_db") as mock_get_db:
        db = mock_get_db.return_value

        # Simulation de la chaîne :
        # find().sort().to_list()
        cursor = db.projets.find.return_value
        cursor.sort.return_value = cursor
        cursor.to_list = AsyncMock()

        yield db


class TestGetProjectsByDomain:
    """Tests unitaires du service R8."""

    @pytest.fixture
    def projets_result(self):
        """Projets MongoDB simulés."""
        return [
            {
                "projet_slug": "smartcity-explorer",
                "titre": "SmartCity Explorer",
                "domaine_slugs": ["big-data"],
                "candidat_slugs": ["lea-bernard"],
            },
            {
                "projet_slug": "data-pipeline",
                "titre": "Data Pipeline",
                "domaine_slugs": ["big-data"],
                "candidat_slugs": ["lea-bernard"],
            },
        ]

    async def test_returns_projects_by_domain(
        self, mock_db_r8, projets_result
    ):
        """Retourne les projets du candidat dans le domaine demandé."""

        cursor = mock_db_r8.projets.find.return_value
        cursor.to_list.return_value = projets_result

        result = await get_projects_by_domain(
            "lea-bernard", "big-data"
        )

        assert isinstance(result, list)
        assert len(result) == 2

        assert result == projets_result

        assert result[0]["projet_slug"] == "smartcity-explorer"
        assert result[1]["projet_slug"] == "data-pipeline"

    async def test_empty_projects(self, mock_db_r8):
        """Retourne une liste vide lorsqu'aucun projet ne correspond."""

        cursor = mock_db_r8.projets.find.return_value
        cursor.to_list.return_value = []

        result = await get_projects_by_domain(
            "lea-bernard", "cybersecurite"
        )

        assert result == []

    async def test_unknown_candidat(self, mock_db_r8):
        """Retourne une liste vide pour un candidat sans projet."""

        cursor = mock_db_r8.projets.find.return_value
        cursor.to_list.return_value = []

        result = await get_projects_by_domain(
            "inconnu", "big-data"
        )

        assert result == []

    async def test_calls_mongodb_with_correct_filters(
        self, mock_db_r8
    ):
        """Vérifie les filtres envoyés à MongoDB."""

        cursor = mock_db_r8.projets.find.return_value
        cursor.to_list.return_value = []

        await get_projects_by_domain(
            "lea-bernard", "big-data"
        )

        mock_db_r8.projets.find.assert_called_once_with(
            {
                "candidat_slugs": "lea-bernard",
                "domaine_slugs": "big-data",
            },
            {"_id": 0},
        )

    async def test_sorts_projects_by_slug(
        self, mock_db_r8
    ):
        """Vérifie le tri des projets par projet_slug croissant."""

        cursor = mock_db_r8.projets.find.return_value
        cursor.to_list.return_value = []

        await get_projects_by_domain(
            "lea-bernard", "big-data"
        )

        cursor.sort.assert_called_once_with(
            "projet_slug", 1
        )

    async def test_returns_all_matching_projects(
        self, mock_db_r8
    ):
        """Vérifie que tous les projets correspondants sont récupérés."""

        cursor = mock_db_r8.projets.find.return_value
        cursor.to_list.return_value = []

        await get_projects_by_domain(
            "lea-bernard", "big-data"
        )

        cursor.to_list.assert_awaited_once_with(
            length=None
        )

    async def test_returns_mongodb_result_unchanged(
        self, mock_db_r8, projets_result
    ):
        """Vérifie que le service retourne les données récupérées."""

        cursor = mock_db_r8.projets.find.return_value
        cursor.to_list.return_value = projets_result

        result = await get_projects_by_domain(
            "lea-bernard", "big-data"
        )

        assert result == projets_result

