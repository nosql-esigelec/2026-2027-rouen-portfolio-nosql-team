"""Service R4 : recherche de projets similaires avec Neo4j."""

from portfolio_api.models import SimilarProjetsOut
from portfolio_api.repositories import neo4j_graph
from portfolio_api.models import GraphOut

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

# R5 — Graphe de compétences d'un candidat
async def get_competence_graph(slug: str) -> GraphOut | None:
    """R5 : retourne le graphe de compétences d'un candidat."""
    result = await neo4j_graph.find_competence_graph(slug)

    if result is None:
        return None

    return GraphOut.model_validate(result)