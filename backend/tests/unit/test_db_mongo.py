"""Tests unitaires — Connexion MongoDB.

Vérifier que le client Motor et la base sont créés correctement
à partir de la configuration (sans ouvrir de vraie connexion).

Commande :
    uv run pytest tests/unit/test_db_mongo.py -v

Fichier à implementer pour le test :
    packages/backend/src/portfolio_api/db/mongo.py

"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import asyncio

import pytest


@pytest.fixture(autouse=True)
def reset_mongo_singleton():
    """Isole les tests en réinitialisant les deux variables du singleton."""
    import portfolio_api.db.mongo as mongo_module

    old_client = mongo_module._client
    old_database = mongo_module._database
    mongo_module._client = None
    mongo_module._database = None
    yield
    mongo_module._client = old_client
    mongo_module._database = old_database


class TestGetMongoDb:
    """Tests de get_mongo_db()."""

    def test_creates_client_with_url_and_returns_db(self):
        """Crée AsyncMongoClient avec l'URL et sélectionne la bonne base."""
        from portfolio_api.db import mongo

        mock_settings = MagicMock()
        mock_settings.mongo_url = "mongodb://localhost:27017"
        mock_settings.mongo_db = "portfolio"

        mock_db = MagicMock()
        mock_client = MagicMock()
        """mock_client.__getitem__ = MagicMock(return_value = mock_db)"""
        mock_client.__getitem__.return_value = mock_db

        with (
            patch("portfolio_api.db.mongo.get_settings", return_value=mock_settings) as settings_mock,
            patch("portfolio_api.db.mongo.AsyncMongoClient", return_value=mock_client) as client_mock,
        ):
            db = mongo.get_mongo_db()

        assert db is mock_db
        assert mongo._client is mock_client
        assert mongo._database is mock_db
        settings_mock.assert_called_once_with()
        client_mock.assert_called_once_with("mongodb://localhost:27017")
        mock_client.__getitem__.assert_called_once_with("portfolio")

    def test_returns_same_db_on_second_call(self):
        """Réutilise la même base sans recréer le client ou relire la config."""
        from portfolio_api.db import mongo

        mock_settings = MagicMock(
            mongo_url="mongodb://localhost:27017",
            mongo_db="portfolio",
        )
        mock_db = MagicMock()
        mock_client = MagicMock()
        mock_client.__getitem__.return_value = mock_db

        with (
            patch("portfolio_api.db.mongo.get_settings", return_value=mock_settings) as settings_mock,
            patch("portfolio_api.db.mongo.AsyncMongoClient", return_value=mock_client) as client_mock,
        ):
            first = mongo.get_mongo_db()
            second = mongo.get_mongo_db()

        assert first is second is mock_db
        settings_mock.assert_called_once_with()
        client_mock.assert_called_once_with("mongodb://localhost:27017")
        mock_client.__getitem__.assert_called_once_with("portfolio")


class TestGetMongoDb:
    """Tests de get_mongo_db()."""

    def test_creates_client_with_url_and_returns_db(self):
        """Crée AsyncMongoClient avec l'URL et sélectionne la bonne base."""
        from portfolio_api.db import mongo

        mock_settings = MagicMock()
        mock_settings.mongo_url = "mongodb://localhost:27017"
        mock_settings.mongo_db = "portfolio"

        mock_db = MagicMock()
        mock_client = MagicMock()
        mock_client.__getitem__.return_value = mock_db

        with (
            patch("portfolio_api.db.mongo.get_settings", return_value=mock_settings) as settings_mock,
            patch("portfolio_api.db.mongo.AsyncMongoClient", return_value=mock_client) as client_mock,
        ):
            db = mongo.get_mongo_db()

        assert db is mock_db
        assert mongo._client is mock_client
        assert mongo._database is mock_db
        settings_mock.assert_called_once_with()
        client_mock.assert_called_once_with("mongodb://localhost:27017")
        mock_client.__getitem__.assert_called_once_with("portfolio")

    def test_returns_same_db_on_second_call(self):
        """Réutilise la même base sans recréer le client ou relire la config."""
        from portfolio_api.db import mongo

        mock_settings = MagicMock(
            mongo_url="mongodb://localhost:27017",
            mongo_db="portfolio",
        )
        mock_db = MagicMock()
        mock_client = MagicMock()
        mock_client.__getitem__.return_value = mock_db

        with (
            patch("portfolio_api.db.mongo.get_settings", return_value=mock_settings) as settings_mock,
            patch("portfolio_api.db.mongo.AsyncMongoClient", return_value=mock_client) as client_mock,
        ):
            first = mongo.get_mongo_db()
            second = mongo.get_mongo_db()

        assert first is second is mock_db
        settings_mock.assert_called_once_with()
        client_mock.assert_called_once_with("mongodb://localhost:27017")
        mock_client.__getitem__.assert_called_once_with("portfolio")


class TestCloseMongo:
    """Tests de close_mongo()."""

    def test_closes_client_and_resets_singleton(self):
        """Ferme le client et remet client et base à None."""
        from portfolio_api.db import mongo

        mock_client = MagicMock()
        mock_client.close = AsyncMock()
        mongo._client = mock_client
        mongo._database = MagicMock()

        asyncio.run(mongo.close_mongo())

        mock_client.close.assert_awaited_once_with()
        assert mongo._client is None
        assert mongo._database is None

    def test_close_without_client_does_nothing(self):
        """N'échoue pas si aucune connexion n'a été créée."""
        from portfolio_api.db import mongo

        asyncio.run(mongo.close_mongo())

        assert mongo._client is None
        assert mongo._database is None


