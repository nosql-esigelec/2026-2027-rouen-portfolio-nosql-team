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



#    R8 : retourne les projets d'un candidat dans un domaine

async def get_projects_by_domain(
    candidat_slug: str,
    domaine_slug: str,
) -> list[dict]:

    db = get_mongo_db()

    filtre = {
        "candidat_slugs": candidat_slug,
        "domaine_slugs": domaine_slug
    }

    projets = await (
        db.projets
        .find(filtre, {"_id": 0})
        .sort("projet_slug", 1)
        .to_list(length=None)
    )

    return projets
