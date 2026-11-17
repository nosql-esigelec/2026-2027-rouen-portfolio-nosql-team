"""Tests unitaires — Connexion Neo4j.

Vérifier que le driver Neo4j est créé correctement
à partir de la configuration (sans ouvrir de vraie connexion).

Commande :
    uv run pytest tests/unit/test_db_neo4j.py -v

Fichier à implémenter pour le test :
    packages/backend/src/backend/db/neo4j.py

"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def reset_neo4j_singleton():
    """Réinitialise le singleton entre chaque test."""
    import portfolio_api.db.neo4j as neo4j_module

    old_driver = neo4j_module._driver
    neo4j_module._driver = None
    yield
    neo4j_module._driver = old_driver


class TestGetNeo4jDriver:
    """neo4j.get_neo4j_driver() — Driver Neo4j async."""

    def test_creates_driver_with_uri_and_auth(self, reset_neo4j_singleton):
        """Doit créer le driver avec l'URI et les identifiants de get_settings()."""
        from portfolio_api.db import neo4j

        mock_settings = MagicMock()
        mock_settings.neo4j_uri = "bolt://localhost:7687"
        mock_settings.neo4j_user = "neo4j"
        mock_settings.neo4j_password = "secret"
        mock_driver = MagicMock()

        with (
            patch("portfolio_api.db.neo4j.get_settings", return_value=mock_settings),
            patch("portfolio_api.db.neo4j.AsyncGraphDatabase", ) as graph_mock,
        ):
            graph_mock.driver = MagicMock(return_value=mock_driver)
            driver = neo4j.get_neo4j_driver()

        assert driver is mock_driver
        graph_mock.driver.assert_called_once_with(
            "bolt://localhost:7687",
            auth=("neo4j", "secret"),
        )

    def test_returns_same_driver_on_second_call(self, reset_neo4j_singleton):
        """Doit retourner le même driver (singleton)."""
        from portfolio_api.db import neo4j

        mock_driver = MagicMock()
        mock_settings = MagicMock()
        mock_settings.neo4j_uri = "bolt://localhost:7687"
        mock_settings.neo4j_user = "neo4j"
        mock_settings.neo4j_password = "pass"

        with (
            patch("portfolio_api.db.neo4j.get_settings", return_value=mock_settings),
            patch("portfolio_api.db.neo4j.AsyncGraphDatabase", ) as graph_mock,
        ):
            graph_mock.driver = MagicMock(return_value=mock_driver)
            first = neo4j.get_neo4j_driver()
            second = neo4j.get_neo4j_driver()

        assert first is second


class TestCloseNeo4j:
    """Tests de close_neo4j()."""

    def test_closes_driver_and_resets_singleton(self):
        """Ferme le driver et le remet à None."""
        from portfolio_api.db import neo4j

        mock_driver = MagicMock()
        mock_driver.close = AsyncMock()
        neo4j._driver = mock_driver

        asyncio.run(neo4j.close_neo4j())

        mock_driver.close.assert_awaited_once_with()
        assert neo4j._driver is None

    def test_close_without_driver_does_nothing(self):
        """N'échoue pas si aucun driver n'a été créé."""
        from portfolio_api.db import neo4j

        asyncio.run(neo4j.close_neo4j())

        assert neo4j._driver is None