"""Tests unitaires — Service R4 (graph_service).

Le repository Neo4j est mocké : aucune connexion au graphe n'est utilisée.

Commande :
    uv run pytest tests/unit/test_graph_service.py -v
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from portfolio_api.models import SimilarProjetsOut
from portfolio_api.services.graph_service import get_similar_projets

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
