"""Connexion Neo4j (singleton AsyncDriver).

TODO (équipe) : reprenez le singleton de SmartCity (`db/neo4j.py`, Sprint 1).
"""

from __future__ import annotations


def get_neo4j_driver():
    """Retourne le driver Neo4j asynchrone (instance unique)."""
    raise NotImplementedError("TODO : connexion Neo4j")


async def close_neo4j() -> None:
    """Ferme le driver (appelé à l'arrêt de l'API)."""
    return None
