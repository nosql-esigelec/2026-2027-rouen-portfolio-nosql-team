"""Services liés aux détails des projets."""

from portfolio_api.models import ProjetDetailOut
from portfolio_api.repositories import mongo_projets, neo4j_graph

# R6 — Détail d'un projet, avec projets similaires
async def get_projet_detail(slug: str) -> ProjetDetailOut | None:
    """R6 : combine le détail MongoDB et les projets similaires Neo4j."""
    projet = await mongo_projets.find_projet(slug)

    if projet is None:
        return None

    similaires = await neo4j_graph.find_similar_projets(
        slug=slug,
        limit=5,
    )

    data = {
        **projet,
        "total_similaires": (
            similaires["total"] if similaires is not None else 0
        ),
        "projets_similaires": (
            similaires["projets_similaires"]
            if similaires is not None
            else []
        ),
    }

    return ProjetDetailOut.model_validate(data)