"""Peuple MongoDB et Neo4j avec les VRAIES données de tous les membres (dossier data/).

Exigences (évaluées au Jalon 2) :
- 1 seule commande : `just seed`
- idempotent : relancer le seed ne crée pas de doublons
- reproductible sur une machine neuve après `just up`
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from portfolio_api.db.mongo import get_mongo_db
from portfolio_api.db.neo4j import get_neo4j_driver

DATA_DIR = Path(__file__).resolve().parents[4] / "data"

def load_member_files(kind: str) -> list[dict]:
    """Charge data/<kind>/*.json (hors fichiers commençant par '_', ex. _exemple.json)."""
    docs: list[dict] = []
    for path in sorted((DATA_DIR / kind).glob("*.json")):
        if path.name.startswith("_"):
            continue
        content = json.loads(path.read_text(encoding="utf-8"))
        docs.extend(content if isinstance(content, list) else [content])
    return docs

candidats = load_member_files("candidats")
projets = load_member_files("projets")
async def seed_mongo(candidats: list[dict], projets: list[dict]) -> None:
    # TODO (équipe) : vider puis insérer selon VOTRE modèle (ARCHITECTURE.md §3), créer les index
    
    db = get_mongo_db()

    # --- Collection candidats ---
    await db["candidats"].delete_many({})
    await db["candidats"].create_index("candidat_slug", unique=True)
    await db["candidats"].create_index("competences.skill_slug")
    await db["candidats"].create_index("competences.domaine_slug")
    if candidats:
        await db["candidats"].insert_many(candidats)

    # --- Collection projets ---
    await db["projets"].delete_many({})
    await db["projets"].create_index("projet_slug", unique=True)
    await db["projets"].create_index("candidat_slugs")
    await db["projets"].create_index("competence_slugs")
    await db["projets"].create_index("domaine_slugs")
    if projets:
        await db["projets"].insert_many(projets)



async def seed_neo4j(candidats: list[dict], projets: list[dict]) -> None:
    driver = get_neo4j_driver()

    async with driver.session() as session:
        async def executer(requete: str, **parametres) -> None:
            resultat = await session.run(requete, **parametres)
            await resultat.consume()

        # Ne pas effacer le graphe systématiquement lors d'un seed.
        # Pour une réinitialisation volontaire en environnement de test :
        # await executer("MATCH (n) DETACH DELETE n")

        # Contraintes d'unicité des cinq labels
        contraintes = [
            """
            CREATE CONSTRAINT candidat_slug_unique
            IF NOT EXISTS
            FOR (c:Candidat)
            REQUIRE c.slug IS UNIQUE
            """,
            """
            CREATE CONSTRAINT projet_slug_unique
            IF NOT EXISTS
            FOR (p:Projet)
            REQUIRE p.slug IS UNIQUE
            """,
            """
            CREATE CONSTRAINT competence_slug_unique
            IF NOT EXISTS
            FOR (c:Competence)
            REQUIRE c.slug IS UNIQUE
            """,
            """
            CREATE CONSTRAINT domaine_slug_unique
            IF NOT EXISTS
            FOR (d:Domaine)
            REQUIRE d.slug IS UNIQUE
            """,
            """
            CREATE CONSTRAINT entreprise_slug_unique
            IF NOT EXISTS
            FOR (e:Entreprise)
            REQUIRE e.slug IS UNIQUE
            """
        ]

        for contrainte in contraintes:
            await executer(contrainte)

        # création des différents noeuds
        # 2.1 Noeuds Candidat
        for candidat in candidats:

            await executer(
                """
                MERGE (c:Candidat {slug: $candidat_slug})
                SET c.nom = $nom,
                    c.prenom = $prenom,
                    c.titre = $titre
                """,
                candidat_slug=candidat["candidat_slug"],
                nom=candidat.get("nom"),
                prenom=candidat.get("prenom"),
                titre=candidat.get("titre")
            )

        # 2.2 Noeuds Projet
        for projet in projets:

            projet_slug = (
                projet.get("projet_slug")
                or projet.get("slug")
            )

            await executer(
                """
                MERGE (p:Projet {slug: $projet_slug})
                SET p.titre = $titre
                """,
                projet_slug=projet_slug,
                titre=projet.get("titre")
            )
        # 2.3 Noeuds Competence
        for candidat in candidats:

            for comp in candidat.get("competences", []):

                await executer(
                    """
                    MERGE (c:Competence {slug: $skill_slug})
                    SET c.nom = $nom
                    """,
                    skill_slug=comp["skill_slug"],
                    nom=comp.get("nom")
                )

        # Compétences mentionnées dans les projets
        for projet in projets:

            for skill_slug in projet.get(
                "competence_slugs", []
            ):

                await executer(
                    """
                    MERGE (c:Competence {slug: $skill_slug})
                    ON CREATE SET c.nom = $skill_slug
                    """,
                    skill_slug=skill_slug
                )
        # 2.4 Noeuds Domaine
        for candidat in candidats:

            for comp in candidat.get("competences", []):

                domaine = comp.get("domaine_slug") or comp.get("domaine")

                if domaine:

                    await executer(
                        """
                        MERGE (d:Domaine {slug: $domaine_slug})
                        ON CREATE SET d.nom = $nom
                        """,
                        domaine_slug=domaine,
                        nom=domaine.replace("-", " ").title()
                    )

        # Domaines déclarés dans les projets
        for projet in projets:

            for domaine in projet.get("domaine_slugs", []):

                await executer(
                    """
                    MERGE (d:Domaine {slug: $domaine_slug})
                    ON CREATE SET d.nom = $nom
                    """,
                    domaine_slug=domaine,
                    nom=domaine.replace("-", " ").title()
                )

        #  projets utilisant domaines[]
            for domaine in projet.get("domaines", []):

                domaine_slug = (
                    domaine.get("domaine_slug")
                    if isinstance(domaine, dict)
                    else domaine
                )

                nom = (
                    domaine.get("nom") or domaine_slug
                    if isinstance(domaine, dict)
                    else domaine_slug.replace("-", " ").title()
                )

                await executer(
                    """
                    MERGE (d:Domaine {slug: $domaine_slug})
                    ON CREATE SET d.nom = $nom
                    """,
                    domaine_slug=domaine_slug,
                    nom=nom
                )
        # 2.5 Noeuds Entreprise
        for candidat in candidats:

            for exp in candidat.get("experiences", []):

                entreprise = exp.get("entreprise")

                if entreprise:

                    entreprise_slug = (
                        entreprise.strip()
                        .casefold()
                        .replace(" ", "-")
                    )

                    await executer(
                        """
                        MERGE (e:Entreprise {slug: $entreprise_slug})
                        SET e.nom = $nom
                        """,
                        entreprise_slug=entreprise_slug,
                        nom=entreprise
                    )

        # Entreprises éventuellement associées aux projets
        for projet in projets:

            entreprise_slug = projet.get("entreprise_slug")

            if entreprise_slug:

                await executer(
                    """
                    MERGE (e:Entreprise {slug: $entreprise_slug})
                    ON CREATE SET e.nom = $nom
                    """,
                    entreprise_slug=entreprise_slug,
                    nom=projet.get("entreprise") or entreprise_slug
                )
        # 3.1 Candidat - A_REALISE -> Projet
        for projet in projets:

            projet_slug = (
                projet.get("projet_slug")
                or projet.get("slug")
            )

            for candidat_slug in projet.get(
                "candidat_slugs", []
            ):

                await executer(
                    """
                    MATCH (c:Candidat {slug: $candidat_slug})
                    MATCH (p:Projet {slug: $projet_slug})
                    MERGE (c)-[:A_REALISE]->(p)
                    """,
                    candidat_slug=candidat_slug,
                    projet_slug=projet_slug
                )

        # 3.2 Candidat - MAITRISE -> Competence
        for candidat in candidats:

            for comp in candidat.get("competences", []):

                await executer(
                    """
                    MATCH (c:Candidat {slug: $candidat_slug})
                    MATCH (s:Competence {slug: $skill_slug})
                    MERGE (c)-[r:MAITRISE]->(s)
                    SET r.niveau = $niveau
                    """,
                    candidat_slug=candidat["candidat_slug"],
                    skill_slug=comp["skill_slug"],
                    niveau=comp.get("niveau")
                )
        # 3.3 Projet - UTILISE -> Competence
        for projet in projets:

            projet_slug = (
                projet.get("projet_slug")
                or projet.get("slug")
            )

            for skill_slug in projet.get(
                "competence_slugs", []
            ):

                await executer(
                    """
                    MATCH (p:Projet {slug: $projet_slug})
                    MATCH (s:Competence {slug: $skill_slug})
                    MERGE (p)-[:UTILISE]->(s)
                    """,
                    projet_slug=projet_slug,
                    skill_slug=skill_slug
                )

        # 3.4 Competence - APPARTIENT_A -> Domaine
        for candidat in candidats:

            for comp in candidat.get("competences", []):

                domaine = comp.get("domaine_slug") or comp.get("domaine")

                if domaine:

                    await executer(
                        """
                        MATCH (s:Competence {slug: $skill_slug})
                        MATCH (d:Domaine {slug: $domaine_slug})
                        MERGE (s)-[:APPARTIENT_A]->(d)
                        """,
                        skill_slug=comp["skill_slug"],
                        domaine_slug=domaine
                    )
         # 3.5 Candidat - A_TRAVAILLE_CHEZ -> Entreprise
        for candidat in candidats:

            for exp in candidat.get("experiences", []):

                entreprise = exp.get("entreprise")

                if entreprise:

                    entreprise_slug = (
                        entreprise.strip()
                        .casefold()
                        .replace(" ", "-")
                    )

                    await executer(
                        """
                        MATCH (c:Candidat {slug: $candidat_slug})
                        MATCH (e:Entreprise {slug: $entreprise_slug})
                        MERGE (c)-[r:A_TRAVAILLE_CHEZ {
                            poste: $poste,
                            date_debut: $debut
                        }]->(e)
                        SET r.date_fin = $fin
                        """,
                        candidat_slug=candidat["candidat_slug"],
                        entreprise_slug=entreprise_slug,
                        poste=exp["poste"],
                        debut=exp["debut"],
                        fin=exp.get("fin")
                    )

        # 3.6 Projet - REALISE_POUR -> Entreprise
        for projet in projets:

            projet_slug = (
                projet.get("projet_slug")
                or projet.get("slug")
            )

            entreprise_slug = projet.get("entreprise_slug")

            if entreprise_slug:

                await executer(
                    """
                    MATCH (p:Projet {slug: $projet_slug})
                    MATCH (e:Entreprise {slug: $entreprise_slug})
                    MERGE (p)-[:REALISE_POUR]->(e)
                    """,
                    projet_slug=projet_slug,
                    entreprise_slug=entreprise_slug
                )
    print("Seed Neo4j terminé avec succès.")


async def main() -> None:
    candidats = load_member_files("candidats")
    projets = load_member_files("projets")
    print(f"[seed] {len(candidats)} candidat(s), {len(projets)} projet(s) trouvés dans {DATA_DIR}")
    await seed_mongo(candidats, projets)
    await seed_neo4j(candidats, projets)
    print("[seed] OK")


if __name__ == "__main__":
    asyncio.run(main())
