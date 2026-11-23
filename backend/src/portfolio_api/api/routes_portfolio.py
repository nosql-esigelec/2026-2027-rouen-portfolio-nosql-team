"""Routes adaptées à la page unique et interactive d'un candidat."""

from fastapi import APIRouter, HTTPException, Query

from portfolio_api.models import CompetenceDetailOut, PortfolioOut
from portfolio_api.services import portfolio_service

router = APIRouter(prefix="/portfolio", tags=["portfolio immersif"])


@router.get(
    "/{slug}",
    response_model=PortfolioOut,
    summary="Charger le portfolio complet d'un étudiant",
)
async def get_portfolio(
    slug: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=30, ge=1, le=100),
) -> PortfolioOut:
    result = await portfolio_service.get_portfolio(slug, page=page, limit=limit)
    if result is None:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    return result


@router.get(
    "/{slug}/competences/{skill_slug}",
    response_model=CompetenceDetailOut,
    summary="Afficher une compétence cliquée et ses liens avec le CV",
)
async def get_competence_detail(slug: str, skill_slug: str) -> CompetenceDetailOut:
    result = await portfolio_service.get_competence_detail(slug, skill_slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Candidat ou compétence introuvable")
    return result
