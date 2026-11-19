"""Tests unitaires — Services R1 à R3 (candidat_service).

Les repositories sont mockés : aucune connexion MongoDB n'est utilisée.

Commande :
    uv run pytest tests/unit/test_candidat_service.py -v
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from portfolio_api.models import CandidatOut, ProjetsResponse, StatsOut
from portfolio_api.services.candidat_service import (
    get_candidat_profile,
    get_candidat_projets,
    get_candidat_stats,
)

MODULE = "portfolio_api.services.candidat_service"


# ──────────────────────────────────────
# Fixtures
# ──────────────────────────────────────

@pytest.fixture
def mock_candidats():
    """Remplace le module mongo_candidats utilisé par le service."""
    with patch(f"{MODULE}.mongo_candidats", new=AsyncMock()) as mock:
        yield mock


@pytest.fixture
def mock_projets():
    """Remplace le module mongo_projets utilisé par le service."""
    with patch(f"{MODULE}.mongo_projets", new=AsyncMock()) as mock:
        yield mock


@pytest.fixture
def candidat_doc():
    """Document candidat tel que renvoyé par le repository."""
    return {
        "candidat_slug": "alice-martin",
        "prenom": "Alice",
        "nom": "Martin",
        "titre": "Développeuse backend",
        "bio": "Passionnée de bases de données.",
        "liens": {"github": "https://github.com/alice", "linkedin": None},
        "experiences": [
            {
                "entreprise": "Alpha",
                "poste": "Stagiaire",
                "debut": "2021-06",
                "fin": "2021-09",
            },
            {
                "entreprise": "Gamma",
                "poste": "Développeuse",
                "debut": "2023-09",
                "fin": None,
            },
            {
                "entreprise": "Beta",
                "poste": "Alternante",
                "debut": "2022-09",
                "fin": "2023-08",
            },
        ],
        "formations": [
            {
                "ecole": "IUT",
                "diplome": "BUT Informatique",
                "debut": "2019",
                "fin": "2022",
            },
            {
                "ecole": "Université",
                "diplome": "Master",
                "debut": "2022",
                "fin": "2024",
            },
        ],
        "competences": [
            {
                "skill_slug": "python",
                "nom": "Python",
                "domaine_slug": "backend",
                "niveau": 4,
            },
        ],
    }


# ──────────────────────────────────────
# R1 — get_candidat_profile
# ──────────────────────────────────────

class TestGetCandidatProfile:
    """get_candidat_profile() — Profil et timeline du candidat."""

    async def test_returns_none_when_candidat_not_found(self, mock_candidats):
        """Doit retourner None si le candidat n'existe pas."""
        mock_candidats.find_candidat.return_value = None

        result = await get_candidat_profile("inconnu")

        assert result is None

    async def test_calls_repository_with_slug(
        self, mock_candidats, candidat_doc
    ):
        """Doit chercher le candidat avec le slug reçu."""
        mock_candidats.find_candidat.return_value = candidat_doc

        await get_candidat_profile("alice-martin")

        mock_candidats.find_candidat.assert_called_once_with("alice-martin")

    async def test_returns_candidat_out(self, mock_candidats, candidat_doc):
        """Doit retourner un CandidatOut quand le candidat existe."""
        mock_candidats.find_candidat.return_value = candidat_doc

        result = await get_candidat_profile("alice-martin")

        assert isinstance(result, CandidatOut)
        assert result.candidat_slug == "alice-martin"
        assert result.prenom == "Alice"
        assert result.liens.github == "https://github.com/alice"
        assert result.competences[0].skill_slug == "python"

    async def test_experiences_sorted_most_recent_first(
        self, mock_candidats, candidat_doc
    ):
        """Les expériences doivent être triées de la plus récente à la plus ancienne."""
        mock_candidats.find_candidat.return_value = candidat_doc

        result = await get_candidat_profile("alice-martin")

        debuts = [experience.debut for experience in result.experiences]
        assert debuts == ["2023-09", "2022-09", "2021-06"]

    async def test_formations_sorted_most_recent_first(
        self, mock_candidats, candidat_doc
    ):
        """Les formations doivent être triées de la plus récente à la plus ancienne."""
        mock_candidats.find_candidat.return_value = candidat_doc

        result = await get_candidat_profile("alice-martin")

        debuts = [formation.debut for formation in result.formations]
        assert debuts == ["2022", "2019"]

    async def test_does_not_mutate_repository_document(
        self, mock_candidats, candidat_doc
    ):
        """Le document renvoyé par le repository ne doit pas être modifié."""
        mock_candidats.find_candidat.return_value = candidat_doc
        ordre_initial = [e["debut"] for e in candidat_doc["experiences"]]

        await get_candidat_profile("alice-martin")

        ordre_apres = [e["debut"] for e in candidat_doc["experiences"]]
        assert ordre_apres == ordre_initial

    async def test_missing_experiences_and_formations_give_empty_lists(
        self, mock_candidats
    ):
        """Un candidat sans expériences ni formations doit avoir des listes vides."""
        mock_candidats.find_candidat.return_value = {
            "candidat_slug": "bob-durand",
            "prenom": "Bob",
            "nom": "Durand",
            "titre": "Data engineer",
        }

        result = await get_candidat_profile("bob-durand")

        assert isinstance(result, CandidatOut)
        assert result.experiences == []
        assert result.formations == []
        assert result.competences == []


# ──────────────────────────────────────
# R2 — get_candidat_projets
# ──────────────────────────────────────

class TestGetCandidatProjets:
    """get_candidat_projets() — Projets filtrés et paginés."""

    @pytest.mark.parametrize("page", [0, -1])
    async def test_invalid_page_raises_value_error(
        self, page, mock_candidats, mock_projets
    ):
        """Doit lever ValueError si page < 1."""
        with pytest.raises(ValueError, match="page"):
            await get_candidat_projets("alice-martin", page=page)

    @pytest.mark.parametrize("limit", [0, -5, 101])
    async def test_invalid_limit_raises_value_error(
        self, limit, mock_candidats, mock_projets
    ):
        """Doit lever ValueError si limit n'est pas compris entre 1 et 100."""
        with pytest.raises(ValueError, match="limit"):
            await get_candidat_projets("alice-martin", limit=limit)

    async def test_invalid_params_do_not_call_repositories(
        self, mock_candidats, mock_projets
    ):
        """La validation doit avoir lieu avant tout appel aux repositories."""
        with pytest.raises(ValueError):
            await get_candidat_projets("alice-martin", page=0)

        mock_candidats.find_candidat.assert_not_called()
        mock_projets.list_projets.assert_not_called()

    @pytest.mark.parametrize("limit", [1, 100])
    async def test_limit_boundaries_are_accepted(
        self, limit, mock_candidats, mock_projets, candidat_doc
    ):
        """Les bornes 1 et 100 doivent être acceptées."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.list_projets.return_value = ([], 0)

        result = await get_candidat_projets("alice-martin", limit=limit)

        assert isinstance(result, ProjetsResponse)

    async def test_returns_none_when_candidat_not_found(
        self, mock_candidats, mock_projets
    ):
        """Doit retourner None si le candidat n'existe pas."""
        mock_candidats.find_candidat.return_value = None

        result = await get_candidat_projets("inconnu")

        assert result is None
        mock_projets.list_projets.assert_not_called()

    async def test_returns_projets_response(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Doit retourner un ProjetsResponse avec les projets du repository."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.list_projets.return_value = (
            [
                {"projet_slug": "projet-1", "titre": "Projet 1"},
                {"projet_slug": "projet-2", "titre": "Projet 2"},
            ],
            2,
        )

        result = await get_candidat_projets("alice-martin")

        assert isinstance(result, ProjetsResponse)
        assert result.candidat_slug == "alice-martin"
        assert [p.projet_slug for p in result.projets] == [
            "projet-1",
            "projet-2",
        ]

    async def test_passes_filters_and_pagination_to_repository(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Doit transmettre les filtres et la pagination à list_projets()."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.list_projets.return_value = ([], 0)

        await get_candidat_projets(
            "alice-martin",
            competence="python",
            domaine_slug="backend",
            page=2,
            limit=5,
        )

        mock_projets.list_projets.assert_called_once_with(
            candidat_slug="alice-martin",
            competence="python",
            domaine_slug="backend",
            page=2,
            limit=5,
        )

    async def test_response_contains_applied_filters(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """La réponse doit rappeler les filtres appliqués."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.list_projets.return_value = ([], 0)

        result = await get_candidat_projets(
            "alice-martin", competence="python", domaine_slug="backend"
        )

        assert result.filtres.competence == "python"
        assert result.filtres.domaine_slug == "backend"

    async def test_response_without_filters_has_none_values(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Sans filtre, les valeurs de filtres doivent être None."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.list_projets.return_value = ([], 0)

        result = await get_candidat_projets("alice-martin")

        assert result.filtres.competence is None
        assert result.filtres.domaine_slug is None

    @pytest.mark.parametrize(
        ("total", "limit", "expected_pages"),
        [
            (0, 10, 0),
            (1, 10, 1),
            (10, 10, 1),
            (11, 10, 2),
            (25, 10, 3),
            (100, 1, 100),
        ],
    )
    async def test_total_pages_computation(
        self,
        total,
        limit,
        expected_pages,
        mock_candidats,
        mock_projets,
        candidat_doc,
    ):
        """total_pages doit être l'arrondi supérieur de total / limit."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.list_projets.return_value = ([], total)

        result = await get_candidat_projets("alice-martin", limit=limit)

        assert result.pagination.total == total
        assert result.pagination.total_pages == expected_pages

    async def test_pagination_contains_page_and_limit(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """La pagination doit reprendre page et limit demandés."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.list_projets.return_value = ([], 25)

        result = await get_candidat_projets("alice-martin", page=3, limit=10)

        assert result.pagination.page == 3
        assert result.pagination.limit == 10

    async def test_candidat_without_projet_returns_empty_list(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Un candidat connu sans projet doit donner une réponse vide, pas None."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.list_projets.return_value = ([], 0)

        result = await get_candidat_projets("alice-martin")

        assert isinstance(result, ProjetsResponse)
        assert result.projets == []
        assert result.pagination.total == 0


# ──────────────────────────────────────
# R3 — get_candidat_stats
# ──────────────────────────────────────

class TestGetCandidatStats:
    """get_candidat_stats() — Statistiques par compétence."""

    async def test_returns_none_when_candidat_not_found(
        self, mock_candidats, mock_projets
    ):
        """Doit retourner None si le candidat n'existe pas."""
        mock_candidats.find_candidat.return_value = None

        result = await get_candidat_stats("inconnu")

        assert result is None
        mock_projets.aggregate_stats.assert_not_called()

    async def test_returns_stats_out(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Doit retourner un StatsOut avec les totaux et le détail."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.aggregate_stats.return_value = {
            "total_projets": 5,
            "statistiques": [
                {"competence_slug": "python", "nombre_projets": 4},
                {"competence_slug": "docker", "nombre_projets": 2},
            ],
        }
        mock_candidats.competence_names.return_value = {
            "python": "Python",
            "docker": "Docker",
        }

        result = await get_candidat_stats("alice-martin")

        assert isinstance(result, StatsOut)
        assert result.candidat_slug == "alice-martin"
        assert result.total_projets == 5
        assert result.total_competences_utilisees == 2
        assert result.statistiques[0].competence_slug == "python"
        assert result.statistiques[0].nom == "Python"
        assert result.statistiques[0].nombre_projets == 4

    async def test_calls_aggregate_stats_with_slug(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Doit demander l'agrégation pour le bon candidat."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.aggregate_stats.return_value = {
            "total_projets": 0,
            "statistiques": [],
        }

        await get_candidat_stats("alice-martin")

        mock_projets.aggregate_stats.assert_called_once_with("alice-martin")

    async def test_requests_names_for_all_skill_slugs(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Doit demander les noms de toutes les compétences trouvées."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.aggregate_stats.return_value = {
            "total_projets": 3,
            "statistiques": [
                {"competence_slug": "python", "nombre_projets": 3},
                {"competence_slug": "docker", "nombre_projets": 1},
            ],
        }
        mock_candidats.competence_names.return_value = {}

        await get_candidat_stats("alice-martin")

        mock_candidats.competence_names.assert_called_once_with(
            ["python", "docker"]
        )

    async def test_falls_back_to_slug_when_name_is_missing(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Si le nom d'une compétence est introuvable, le slug sert de nom."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.aggregate_stats.return_value = {
            "total_projets": 3,
            "statistiques": [
                {"competence_slug": "python", "nombre_projets": 3},
                {"competence_slug": "rust", "nombre_projets": 1},
            ],
        }
        mock_candidats.competence_names.return_value = {"python": "Python"}

        result = await get_candidat_stats("alice-martin")

        noms = {s.competence_slug: s.nom for s in result.statistiques}
        assert noms == {"python": "Python", "rust": "rust"}

    async def test_empty_statistics(
        self, mock_candidats, mock_projets, candidat_doc
    ):
        """Sans statistiques, la réponse est vide et competence_names n'est pas appelé."""
        mock_candidats.find_candidat.return_value = candidat_doc
        mock_projets.aggregate_stats.return_value = {
            "total_projets": 0,
            "statistiques": [],
        }

        result = await get_candidat_stats("alice-martin")

        assert isinstance(result, StatsOut)
        assert result.total_projets == 0
        assert result.total_competences_utilisees == 0
        assert result.statistiques == []
        mock_candidats.competence_names.assert_not_called()
