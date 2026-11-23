"""Services R1 à R3, R5 et R7 : profil, projets et statistiques."""

from portfolio_api.models import (
    CandidatOut,
    ProjetsResponse,
    StatsOut,
)
from portfolio_api.repositories import (
    mongo_candidats,
    mongo_projets,
)

from portfolio_api.db.mongo import get_mongo_db
# R1 — Profil et timeline du candidat
async def get_candidat_profile(
    slug: str,
) -> CandidatOut | None:
    candidat = await mongo_candidats.find_candidat(slug)

    if candidat is None:
        return None

    data = dict(candidat)

    # Trier les expériences de la plus récente à la plus ancienne.
    data["experiences"] = sorted(
        candidat.get("experiences", []),
        key=lambda experience: experience.get("debut") or "",
        reverse=True,
    )

    # Trier les formations de la plus récente à la plus ancienne.
    data["formations"] = sorted(
        candidat.get("formations", []),
        key=lambda formation: formation.get("debut") or "",
        reverse=True,
    )

    return CandidatOut.model_validate(data)


# R2 — Projets du candidat, avec filtres et pagination
async def get_candidat_projets(
    slug: str,
    competence: str | None = None,
    domaine_slug: str | None = None,
    page: int = 1,
    limit: int = 10,
) -> ProjetsResponse | None:
    if page < 1:
        raise ValueError("page doit être supérieur ou égal à 1")

    if not 1 <= limit <= 100:
        raise ValueError("limit doit être compris entre 1 et 100")

    # Distinguer un candidat inconnu d'un candidat sans projet.
    candidat = await mongo_candidats.find_candidat(slug)

    if candidat is None:
        return None

    projets, total = await mongo_projets.list_projets(
        candidat_slug=slug,
        competence=competence,
        domaine_slug=domaine_slug,
        page=page,
        limit=limit,
    )

    total_pages = (total + limit - 1) // limit

    return ProjetsResponse.model_validate(
        {
            "candidat_slug": slug,
            "filtres": {
                "competence": competence,
                "domaine_slug": domaine_slug,
            },
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
            },
            "projets": projets,
        }
    )


# R3 — Statistiques par compétence
async def get_candidat_stats(
    slug: str,
) -> StatsOut | None:
    candidat = await mongo_candidats.find_candidat(slug)

    if candidat is None:
        return None

    # Le repository calcule les statistiques avec MongoDB.
    result = await mongo_projets.aggregate_stats(slug)

    statistiques = result["statistiques"]

    skill_slugs = [
        item["competence_slug"]
        for item in statistiques
    ]

    # Retrouver les noms des compétences.
    names: dict[str, str] = {}

    if skill_slugs:
        names = await mongo_candidats.competence_names(
            skill_slugs
        )

    statistiques_out = []

    for item in statistiques:
        skill_slug = item["competence_slug"]

        statistiques_out.append(
            {
                "competence_slug": skill_slug,
                "nom": names.get(skill_slug) or skill_slug,
                "nombre_projets": item["nombre_projets"],
            }
        )

    return StatsOut.model_validate(
        {
            "candidat_slug": slug,
            "total_projets": result["total_projets"],
            "total_competences_utilisees": len(statistiques_out),
            "statistiques": statistiques_out,
        }
    )
# R7 : retourne la dernière expérience professionnelle d'un candidat.
async def get_latest_experience(
    candidat_slug: str,
) -> dict | None:

    db = get_mongo_db()

    candidat = await db.candidats.find_one(
        {"candidat_slug": candidat_slug},
        {"_id": 0, "experiences": 1}
    )

    if candidat is None:
        return None

    experiences = candidat.get("experiences", [])

    if not experiences:
        return None

    derniere_experience = max(
        experiences,
        key=lambda exp: exp.get("debut") or ""
    )

    return derniere_experience

