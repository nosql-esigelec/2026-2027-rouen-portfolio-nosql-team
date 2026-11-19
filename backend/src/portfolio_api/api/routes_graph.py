"""Routes API — Graph (Édition 100% NoSQL — Neo4j )."""

from fastapi import APIRouter, HTTPException, Query

from portfolio_api.models import SimilarProjetsOut
from portfolio_api.services import graph_service


router = APIRouter(
    prefix="/graph/projets",
    tags=["graphe"],
)


@router.get(
    "/{slug}/similaires",
    response_model=SimilarProjetsOut,
    summary="R4 — Projets similaires à un projet",
)
async def get_similar_projets(
    slug: str,
    limit: int = Query(default=5, ge=1, le=100),
) -> SimilarProjetsOut:
    result = await graph_service.get_similar_projets(
        slug=slug,
        limit=limit,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Projet introuvable",
        )

    return result