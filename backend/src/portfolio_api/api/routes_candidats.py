"""Routes API — Candidats (Édition 100% NoSQL — MongoDB)."""

from fastapi import APIRouter, HTTPException, Query

from portfolio_api.models import (
    CandidatOut,
    ExperienceRecenteOut,
    ProjetsResponse,
    StatsOut,
)
from portfolio_api.services import candidat_service


router = APIRouter(
    prefix="/candidats",
    tags=["candidats"],
)


@router.get(
    "/{slug}",
    response_model=CandidatOut,
    summary="R1 — Profil et timeline d'un candidat",
)
async def get_candidat(slug: str) -> CandidatOut:
    result = await candidat_service.get_candidat_profile(slug)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Candidat introuvable",
        )

    return result


@router.get(
    "/{slug}/projets",
    response_model=ProjetsResponse,
    summary="R2 — Projets d'un candidat avec filtres",
)
async def get_candidat_projets(
    slug: str,
    competence: str | None = Query(
        default=None,
        description="Slug de la compétence recherchée",
    ),
    domaine_slug: str | None = Query(
        default=None,
        description="Slug du domaine recherché",
    ),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
) -> ProjetsResponse:
    result = await candidat_service.get_candidat_projets(
        slug=slug,
        competence=competence,
        domaine_slug=domaine_slug,
        page=page,
        limit=limit,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Candidat introuvable",
        )

    return result
