"""Connexion MongoDB (singleton).

TODO (équipe) : reprenez le singleton de SmartCity (`db/mongo.py`, Sprint 1).
Recommandé : `pymongo.AsyncMongoClient` (même API que Motor).

    from pymongo import AsyncMongoClient
    from pymongo.asynchronous.database import AsyncDatabase
"""

from __future__ import annotations

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from portfolio_api.core.config import get_settings

_client: AsyncMongoClient | None = None
_database: AsyncDatabase | None = None


def get_mongo_db() -> AsyncDatabase:
    """Retourne la base MongoDB du portfolio (instance unique)."""
    global _client, _database
    if _database is None:
        settings = get_settings()
        _client = AsyncMongoClient(settings.mongo_url)
        _database = _client[settings.mongo_db]
    return _database


async def close_mongo() -> None:
    """Ferme la connexion (appelé à l'arrêt de l'API)."""
    global _client, _database
    if _client is not None:
        await _client.close()
        _client = None
        _database = None
