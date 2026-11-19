"""Modèles Pydantic — doivent refléter EXACTEMENT les payloads de API_ROUTES.md.

TODO (équipe) : définir CandidatOut, ExperienceOut, FormationOut, ProjetOut, StatsOut, GraphOut…
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ──────────────────────────────────────
# Health
# ──────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"


# ──────────────────────────────────────
# R1 — Profil du candidat
# ──────────────────────────────────────

class CandidatLiens(BaseModel):
    github: str | None = None
    linkedin: str | None = None


class ExperienceOut(BaseModel):
    entreprise: str
    poste: str
    debut: str
    fin: str | None = None
    description: str | None = None
    competences: list[str] = Field(default_factory=list)


class FormationOut(BaseModel):
    ecole: str
    diplome: str
    debut: str
    fin: str | None = None


class CompetenceOut(BaseModel):
    skill_slug: str
    nom: str
    domaine_slug: str
    niveau: int | None = None


class CandidatOut(BaseModel):
    candidat_slug: str
    prenom: str
    nom: str
    titre: str
    bio: str | None = None

    liens: CandidatLiens = Field(
        default_factory=CandidatLiens
    )

    experiences: list[ExperienceOut] = Field(
        default_factory=list
    )

    formations: list[FormationOut] = Field(
        default_factory=list
    )

    competences: list[CompetenceOut] = Field(
        default_factory=list
    )


# ──────────────────────────────────────
# Modèles communs des projets
# Utilisés par R2, R6 et R8
# ──────────────────────────────────────

class ProjetLiens(BaseModel):
    github: str | None = None
    demo: str | None = None


class MediaOut(BaseModel):
    type: str
    url: str
    description: str | None = None


class ProjetOut(BaseModel):
    projet_slug: str
    titre: str

    description: str | None = None
    contexte: str | None = None
    architecture: str | None = None

    date_debut: str | None = None
    date_fin: str | None = None

    candidat_slugs: list[str] = Field(
        default_factory=list
    )

    competence_slugs: list[str] = Field(
        default_factory=list
    )

    domaine_slugs: list[str] = Field(
        default_factory=list
    )

    technologies: list[str] = Field(
        default_factory=list
    )

    # Nom conservé exactement comme dans projets.json.
    réalisation: list[str] = Field(
        default_factory=list
    )

    liens: ProjetLiens = Field(
        default_factory=ProjetLiens
    )

    medias: list[MediaOut] = Field(
        default_factory=list
    )


# ──────────────────────────────────────
# R2 et R8 — Projets filtrés et paginés
# ──────────────────────────────────────

class ProjetFiltres(BaseModel):
    competence: str | None = None
    domaine_slug: str | None = None


class PaginationOut(BaseModel):
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class ProjetsResponse(BaseModel):
    candidat_slug: str
    filtres: ProjetFiltres
    pagination: PaginationOut

    projets: list[ProjetOut] = Field(
        default_factory=list
    )


# ──────────────────────────────────────
# R3 — Statistiques par compétence
# ──────────────────────────────────────

class CompetenceStatOut(BaseModel):
    competence_slug: str
    nom: str
    nombre_projets: int = Field(ge=0)


class StatsOut(BaseModel):
    candidat_slug: str

    total_projets: int = Field(ge=0)
    total_competences_utilisees: int = Field(ge=0)

    statistiques: list[CompetenceStatOut] = Field(
        default_factory=list
    )


# ──────────────────────────────────────
# R4 — Projets similaires
# Également utilisés par R6
# ──────────────────────────────────────

class ProjetSimilaireOut(BaseModel):
    # Le repository Neo4j renvoie "slug".
    slug: str
    titre: str

    competences_communes: list[str] = Field(
        default_factory=list
    )

    nombre_competences_communes: int = Field(ge=0)


class SimilarProjetsOut(BaseModel):
    projet_source: str
    total: int = Field(ge=0)

    projets_similaires: list[ProjetSimilaireOut] = Field(
        default_factory=list
    )


# ──────────────────────────────────────
# R5 — Graphe de compétences
# ──────────────────────────────────────

class GraphNodeOut(BaseModel):
    id: str
    label: str

    type: Literal[
        "Candidat",
        "Projet",
        "Competence",
        "Domaine",
    ]


class GraphLinkOut(BaseModel):
    source: str
    target: str

    type: Literal[
        "MAITRISE",
        "A_REALISE",
        "UTILISE",
        "APPARTIENT_A",
    ]


class GraphOut(BaseModel):
    candidat_slug: str

    nodes: list[GraphNodeOut] = Field(
        default_factory=list
    )

    links: list[GraphLinkOut] = Field(
        default_factory=list
    )


# ──────────────────────────────────────
# R6 — Détail du projet
# Informations MongoDB + projets similaires Neo4j
# ──────────────────────────────────────

class ProjetDetailOut(ProjetOut):
    total_similaires: int = Field(default=0, ge=0)

    projets_similaires: list[ProjetSimilaireOut] = Field(
        default_factory=list
    )


# ──────────────────────────────────────
# R7 — Expérience professionnelle la plus récente
# ──────────────────────────────────────

class ExperienceRecenteOut(BaseModel):
    candidat_slug: str
    experience: ExperienceOut | None = None


# R8 réutilise ProjetsResponse :
# même route et même structure que R2,
# avec le filtre domaine_slug.
