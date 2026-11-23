"""Lecture des données pour le portfolio immersif d'un seul étudiant.

Toutes les informations personnelles viennent des collections MongoDB ; le front
contrôle les animations, le scroll et les interactions clavier. Le graphe Neo4j
reste disponible sur /api/graph/competences/{slug}, indépendamment du chargement
initial (un graphe indisponible ne doit pas bloquer toute la page d'accueil).
"""

from __future__ import annotations

import asyncio

from portfolio_api.models import (
    CompetenceDetailOut,
    CompetenceOut,
    PortfolioOut,
    TimelineEventOut,
)
from portfolio_api.services import candidat_service


def build_timeline(candidat) -> list[TimelineEventOut]:
    """Réunit formations et expériences dans une seule chronologie décroissante."""
    events = [
        TimelineEventOut(
            type="experience",
            titre=experience.poste,
            organisation=experience.entreprise,
            debut=experience.debut,
            fin=experience.fin,
            description=experience.description,
        )
        for experience in candidat.experiences
    ]
    events.extend(
        TimelineEventOut(
            type="formation",
            titre=formation.diplome,
            organisation=formation.ecole,
            debut=formation.debut,
            fin=formation.fin,
        )
        for formation in candidat.formations
    )
    return sorted(events, key=lambda event: event.debut, reverse=True)


async def get_portfolio(slug: str, page: int = 1, limit: int = 30) -> PortfolioOut | None:
    """Point d'entrée du front : profil + timeline + projets + stats."""
    candidat = await candidat_service.get_candidat_profile(slug)
    if candidat is None:
        return None

    # Les deux lectures sont indépendantes, exécutables en parallèle.
    projets, stats = await asyncio.gather(
        candidat_service.get_candidat_projets(slug, page=page, limit=limit),
        candidat_service.get_candidat_stats(slug),
    )
    if projets is None or stats is None:
        return None

    return PortfolioOut(
        candidat_slug=slug,
        candidat=candidat,
        timeline=build_timeline(candidat),
        projets=projets,
        stats=stats,
    )


async def get_competence_detail(
    candidat_slug: str,
    skill_slug: str,
) -> CompetenceDetailOut | None:
    """Détails d'une compétence : fiche CV, projets associés, expériences."""
    candidat = await candidat_service.get_candidat_profile(candidat_slug)
    if candidat is None:
        return None

    result = await candidat_service.get_candidat_projets(
        candidat_slug,
        competence=skill_slug,
        page=1,
        limit=100,
    )
    if result is None:
        return None

    competence = next(
        (skill for skill in candidat.competences if skill.skill_slug == skill_slug),
        None,
    )
    if competence is None and result.projets:
        # Les projets peuvent mentionner une techno non listée dans les
        # compétences du CV. Elle reste explorable depuis une carte de projet.
        premier_projet = result.projets[0]
        competence = CompetenceOut(
            skill_slug=skill_slug,
            nom=skill_slug,
            domaine_slug=(premier_projet.domaine_slugs or ["autre"])[0],
        )

    if competence is None:
        return None

    experiences = [
        experience
        for experience in candidat.experiences
        if skill_slug in experience.competences
    ]

    return CompetenceDetailOut(
        candidat_slug=candidat_slug,
        competence=competence,
        total_projets=result.pagination.total,
        projets=result.projets,
        experiences=experiences,
    )
