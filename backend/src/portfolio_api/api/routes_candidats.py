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

@router.get(
    "/{slug}/stats",
    response_model=StatsOut,
    summary="R3 — Statistiques par compétence d'un candidat",
)
async def get_candidat_stats(slug: str) -> StatsOut:
    result = await candidat_service.get_candidat_stats(slug)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Candidat introuvable",
        )

    return result

@router.get(
    "/{slug}/experiences/recente",
    response_model=ExperienceRecenteOut,
    summary="R7 — Dernière expérience professionnelle d'un candidat",
)
async def get_candidat_latest_experience(
    slug: str,
) -> ExperienceRecenteOut:

    result = await candidat_service.get_latest_experience(slug)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Candidat introuvable ou aucune expérience disponible",
        )

    return ExperienceRecenteOut.model_validate(
        {
            "candidat_slug": slug,
            "experience": result,
        }
    )
