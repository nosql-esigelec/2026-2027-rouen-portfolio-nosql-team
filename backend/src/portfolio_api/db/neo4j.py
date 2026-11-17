"""Connexion Neo4j (singleton AsyncDriver).

TODO (équipe) : reprenez le singleton de SmartCity (`db/neo4j.py`, Sprint 1).
"""

from __future__ import annotations

from neo4j import AsyncGraphDatabase, AsyncDriver

from portfolio_api.core.config import get_settings

_driver: AsyncDriver | None = None

def get_neo4j_driver():
    """Retourne le driver Neo4j asynchrone (instance unique)."""
    global _driver
    if _driver is None:
        settings = get_settings()
        _driver = AsyncGraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))
    return _driver


async def close_neo4j() -> None:
    """Ferme le driver (appelé à l'arrêt de l'API)."""
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
