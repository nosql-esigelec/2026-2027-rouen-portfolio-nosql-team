"""Routes API — Graph (Édition 100% NoSQL — Neo4j )."""


from fastapi import APIRouter, HTTPException

from portfolio_api.models import GraphOut
from portfolio_api.services import graph_service

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get(
    "/competences/{slug}",
    response_model=GraphOut,
    summary="R5 — Graphe de compétences d'un candidat",
)
async def get_competence_graph(slug: str) -> GraphOut:
    result = await graph_service.get_competence_graph(slug)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Candidat introuvable dans le graphe",
        )

    return result