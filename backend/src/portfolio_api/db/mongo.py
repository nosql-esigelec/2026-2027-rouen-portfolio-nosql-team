"""Connexion MongoDB (singleton).

TODO (équipe) : reprenez le singleton de SmartCity (`db/mongo.py`, Sprint 1).
Recommandé : `pymongo.AsyncMongoClient` (même API que Motor).

    from pymongo import AsyncMongoClient
    from pymongo.asynchronous.database import AsyncDatabase
"""

from __future__ import annotations


def get_mongo_db():
    """Retourne la base MongoDB du portfolio (instance unique)."""
    raise NotImplementedError("TODO : connexion MongoDB")


async def close_mongo() -> None:
    """Ferme la connexion (appelé à l'arrêt de l'API)."""
    return None
