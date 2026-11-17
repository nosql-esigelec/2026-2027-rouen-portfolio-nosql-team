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


def get_mongo_db()-> AsyncDatabase:
    """Retourne la base MongoDB du portfolio (instance unique)."""
    global _client

    settings = get_settings()

    if _client is None:
        _client = AsyncMongoClient(settings.mongo_url)

    return _client[settings.mongo_db]


async def close_mongo() -> None:
    """Ferme la connexion (appelé à l'arrêt de l'API)."""
    global _client

    if _client is not None:
        await _client.close()
        _client = None
