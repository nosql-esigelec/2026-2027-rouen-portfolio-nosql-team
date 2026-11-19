"""Service R4 : recherche de projets similaires avec Neo4j."""

from portfolio_api.models import SimilarProjetsOut
from portfolio_api.repositories import neo4j_graph


# R4 — Projets similaires à un projet source
async def get_similar_projets(
    slug: str,
    limit: int = 5,
) -> SimilarProjetsOut | None:
    if not 1 <= limit <= 100:
        raise ValueError("limit doit être compris entre 1 et 100")

    result = await neo4j_graph.find_similar_projets(
        slug=slug,
        limit=limit,
    )

    if result is None:
        return None

    return SimilarProjetsOut.model_validate(result)