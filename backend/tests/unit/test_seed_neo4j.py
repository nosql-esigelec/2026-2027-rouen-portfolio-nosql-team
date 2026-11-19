"""Tests unitaires du seed Neo4j (sans serveur Neo4j).

Depuis la racine du dépôt :
    uv run --project .\\backend pytest backend/tests/unit/test_seed_neo4j.py -v
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from portfolio_api.scripts import seed


@pytest.fixture
def neo4j_mocks():
    """Simule get_neo4j_driver() dans l'espace global de seed_neo4j.

    Cela marche même si get_neo4j_driver n'est pas importé comme attribut
    du module portfolio_api.scripts.seed.
    """
    resultat = MagicMock()
    resultat.consume = AsyncMock()

    session = MagicMock()
    session.run = AsyncMock(return_value=resultat)

    session_context = MagicMock()
    session_context.__aenter__ = AsyncMock(return_value=session)
    session_context.__aexit__ = AsyncMock(return_value=None)

    driver = MagicMock()
    driver.session.return_value = session_context

    # patch.dict n'exige pas que le nom existe déjà dans le module.
    # On patche les variables globales réellement lues par cette fonction.
    with patch.dict(
        seed.seed_neo4j.__globals__,
        {"get_neo4j_driver": lambda: driver},
    ):
        yield session


def appels_pour(session, texte):
    """Filtre les appels session.run par extrait de requête Cypher."""
    return [
        appel for appel in session.run.await_args_list
        if texte in appel.args[0]
    ]


@pytest.mark.asyncio
async def test_cree_cinq_contraintes(neo4j_mocks):
    """Les cinq labels ont une contrainte d'unicité sur slug."""
    await seed.seed_neo4j([], [{"projet_slug": "exemple", "titre": "Exemple"}])

    appels = appels_pour(neo4j_mocks, "CREATE CONSTRAINT")
    assert len(appels) == 5
    for label in ("Candidat", "Projet", "Competence", "Domaine", "Entreprise"):
        assert any(f":{label}" in appel.args[0] for appel in appels)
    assert all("slug IS UNIQUE" in appel.args[0] for appel in appels)


@pytest.mark.asyncio
async def test_cree_candidat_et_projet(neo4j_mocks):
    candidats = [{
        "candidat_slug": "alice-martin",
        "prenom": "Alice", "nom": "Martin", "titre": "Data Engineer",
    }]
    projets = [{"projet_slug": "portfolio", "titre": "Portfolio"}]

    await seed.seed_neo4j(candidats, projets)

    candidats_crees = appels_pour(neo4j_mocks, "MERGE (c:Candidat")
    projets_crees = appels_pour(neo4j_mocks, "MERGE (p:Projet")
    assert len(candidats_crees) == 1
    assert len(projets_crees) == 1
    assert candidats_crees[0].kwargs["candidat_slug"] == "alice-martin"
    assert projets_crees[0].kwargs["projet_slug"] == "portfolio"
    assert projets_crees[0].kwargs["titre"] == "Portfolio"


@pytest.mark.asyncio
async def test_cree_les_six_types_de_relations(neo4j_mocks):
    candidat = {
        "candidat_slug": "alice-martin",
        "prenom": "Alice", "nom": "Martin", "titre": "Data Engineer",
        "competences": [{
            "skill_slug": "python", "nom": "Python",
            "domaine": "langages", "niveau": 5,
        }],
        "experiences": [{
            "entreprise": "Renault Digital", "poste": "Stagiaire",
            "debut": "2026-04", "fin": "2026-08",
        }],
    }
    projet = {
        "projet_slug": "portfolio", "titre": "Portfolio",
        "candidat_slugs": ["alice-martin"],
        "competence_slugs": ["python"],
        "domaine_slugs": ["langages"],
        "entreprise_slug": "renault-digital",
    }

    await seed.seed_neo4j([candidat], [projet])

    for relation in (
        "A_REALISE", "MAITRISE", "UTILISE", "APPARTIENT_A",
        "A_TRAVAILLE_CHEZ", "REALISE_POUR",
    ):
        assert appels_pour(neo4j_mocks, f":{relation}"), relation

    maitrise = appels_pour(neo4j_mocks, "MERGE (c)-[r:MAITRISE]")
    assert maitrise[0].kwargs["niveau"] == 5
    experience = appels_pour(neo4j_mocks, "A_TRAVAILLE_CHEZ")
    assert experience[0].kwargs["debut"] == "2026-04"
    assert experience[0].kwargs["fin"] == "2026-08"


@pytest.mark.asyncio
async def test_listes_vides_ne_creent_que_les_contraintes(neo4j_mocks):
    """Ce test détecte la boucle 'domaines' hors de 'for projet' dans seed.py."""
    await seed.seed_neo4j([], [])
    assert neo4j_mocks.run.await_count == 5
    assert len(appels_pour(neo4j_mocks, "CREATE CONSTRAINT")) == 5


@pytest.mark.asyncio
async def test_erreur_neo4j_interrompt_seed(neo4j_mocks):
    neo4j_mocks.run.side_effect = RuntimeError("Neo4j indisponible")

    with pytest.raises(RuntimeError, match="Neo4j indisponible"):
        await seed.seed_neo4j([], [])

    neo4j_mocks.run.assert_awaited_once()
