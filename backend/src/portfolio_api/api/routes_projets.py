"""Routes API — Projets (Édition 100% NoSQL — MongoDB)."""


from fastapi import APIRouter, HTTPException

from portfolio_api.models import ProjetDetailOut
from portfolio_api.services import projet_service


router = APIRouter(
    prefix="/projets",
    tags=["projets"],
)


@router.get(
    "/{slug}",
    response_model=ProjetDetailOut,
    summary="R6 — Détail d'un projet et projets similaires",
)
async def get_projet_detail(slug: str) -> ProjetDetailOut:
    result = await projet_service.get_projet_detail(slug)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Projet introuvable",
        )

    return result
