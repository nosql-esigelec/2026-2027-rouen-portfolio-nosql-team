"""Graphe de compétences et projets similaires : Neo4j uniquement."""
 
from portfolio_api.db.neo4j import get_neo4j_driver
 
 
async def _query(query: str, **parameters) -> list[dict]:
    """Exécute une requête paramétrée et retourne des dictionnaires."""
    driver = get_neo4j_driver()
 
    async with driver.session() as session:
        result = await session.run(query, **parameters)
        return await result.data()
 
 
async def create_constraints() -> None:
    """Crée une contrainte d'unicité sur le slug de chaque label."""
    for label in (
        "Candidat",
        "Projet",
        "Competence",
        "Domaine",
        "Entreprise",
    ):
        # Les labels sont des constantes du programme.
        await _query(
            f"CREATE CONSTRAINT {label.lower()}_slug_unique "
            f"IF NOT EXISTS FOR (n:{label}) "
            "REQUIRE n.slug IS UNIQUE"
        )
 
 
async def upsert_candidat(document: dict) -> None:
    """Crée ou met à jour un candidat et ses relations."""
    await _query(
        """
        MERGE (c:Candidat {slug: $candidat_slug})
        SET c.nom = $nom,
            c.prenom = $prenom,
            c.titre = $titre
        """,
        candidat_slug=document["candidat_slug"],
        nom=document["nom"],
        prenom=document["prenom"],
        titre=document.get("titre", ""),
    )
 
    for competence in document.get("competences", []):
        await _query(
            """
            MATCH (c:Candidat {slug: $candidat_slug})
            MERGE (s:Competence {slug: $skill_slug})
            SET s.nom = $nom
            MERGE (d:Domaine {slug: $domaine_slug})
            ON CREATE SET d.nom = $domaine_slug
            MERGE (c)-[r:MAITRISE]->(s)
            SET r.niveau = $niveau
            MERGE (s)-[:APPARTIENT_A]->(d)
            """,
            candidat_slug=document["candidat_slug"],
            skill_slug=competence["skill_slug"],
            nom=competence["nom"],
            domaine_slug=competence["domaine_slug"],
            niveau=competence.get("niveau"),
        )
 
    for experience in document.get("experiences", []):
        nom = experience.get("entreprise")
        if not nom:
            continue
 
        entreprise_slug = (
            experience.get("entreprise_slug")
            or nom.lower().replace(" ", "-")
        )
 
        await _query(
            """
            MATCH (c:Candidat {slug: $candidat_slug})
            MERGE (e:Entreprise {slug: $entreprise_slug})
            SET e.nom = $nom
            MERGE (c)-[r:A_TRAVAILLE_CHEZ {
                poste: $poste,
                date_debut: $date_debut
            }]->(e)
            SET r.date_fin = $date_fin
            """,
            candidat_slug=document["candidat_slug"],
            entreprise_slug=entreprise_slug,
            nom=nom,
            poste=experience.get("poste", ""),
            date_debut=experience.get("debut", ""),
            date_fin=experience.get("fin"),
        )
 
 
async def upsert_projet(document: dict) -> None:
    """Crée ou met à jour un projet, ses auteurs et ses compétences."""
    await _query(
        """
        MERGE (p:Projet {slug: $projet_slug})
        SET p.titre = $titre
        """,
        projet_slug=document["projet_slug"],
        titre=document["titre"],
    )
 
    for candidat_slug in document.get("candidat_slugs", []):
        await _query(
            """
            MATCH (c:Candidat {slug: $candidat_slug})
            MATCH (p:Projet {slug: $projet_slug})
            MERGE (c)-[:A_REALISE]->(p)
            """,
            candidat_slug=candidat_slug,
            projet_slug=document["projet_slug"],
        )
 
    for skill_slug in document.get("competence_slugs", []):
        await _query(
            """
            MATCH (p:Projet {slug: $projet_slug})
            MERGE (s:Competence {slug: $skill_slug})
            ON CREATE SET s.nom = $skill_slug
            MERGE (p)-[:UTILISE]->(s)
            """,
            projet_slug=document["projet_slug"],
            skill_slug=skill_slug,
        )
 
    # Champ optionnel, absent des fichiers JSON actuels.
    nom = document.get("entreprise")
    if nom:
        entreprise_slug = (
            document.get("entreprise_slug")
            or nom.lower().replace(" ", "-")
        )
 
        await _query(
            """
            MATCH (p:Projet {slug: $projet_slug})
            MERGE (e:Entreprise {slug: $entreprise_slug})
            SET e.nom = $nom
            MERGE (p)-[r:REALISE_POUR]->(e)
            SET r.contexte = $contexte
            """,
            projet_slug=document["projet_slug"],
            entreprise_slug=entreprise_slug,
            nom=nom,
            contexte=document.get("contexte"),
        )
 
 
async def find_similar_projets(
    slug: str,
    limit: int = 5,
) -> dict | None:
    """R4 : retourne les projets partageant des compétences."""
    rows = await _query(
        """
        MATCH (p:Projet {slug: $slug})
        OPTIONAL MATCH
            (p)-[:UTILISE]->(c:Competence)
               <-[:UTILISE]-(similaire:Projet)
        WHERE similaire <> p
        WITH p, similaire,
             collect(DISTINCT c.slug) AS competences,
             count(DISTINCT c) AS nombre
        ORDER BY nombre DESC, similaire.slug ASC
        WITH p, [
            item IN collect(
                CASE WHEN similaire IS NOT NULL THEN {
                    slug: similaire.slug,
                    titre: similaire.titre,
                    competences_communes: competences,
                    nombre_competences_communes: nombre
                } ELSE null END
            )
            WHERE item IS NOT NULL
        ] AS similaires
        RETURN p.slug AS projet_source,
               size(similaires) AS total,
               similaires[..$limit] AS projets_similaires
        """,
        slug=slug,
        limit=limit,
    )
 
    return rows[0] if rows else None
 
 
async def find_competence_graph(slug: str) -> dict | None:
    """R5 : retourne les nodes et links du graphe d'un candidat."""
    rows = await _query(
        """
        MATCH (c:Candidat {slug: $slug})
        OPTIONAL MATCH (c)-[r1:MAITRISE]->(s:Competence)
        OPTIONAL MATCH (s)-[r2:APPARTIENT_A]->(d:Domaine)
        OPTIONAL MATCH (c)-[r3:A_REALISE]->(p:Projet)
        OPTIONAL MATCH (p)-[r4:UTILISE]->(ps:Competence)
        OPTIONAL MATCH (ps)-[r5:APPARTIENT_A]->(pd:Domaine)
        WITH c,
             [c] + collect(DISTINCT s)
                 + collect(DISTINCT d)
                 + collect(DISTINCT p)
                 + collect(DISTINCT ps)
                 + collect(DISTINCT pd) AS raw_nodes,
             collect(DISTINCT r1)
                 + collect(DISTINCT r2)
                 + collect(DISTINCT r3)
                 + collect(DISTINCT r4)
                 + collect(DISTINCT r5) AS raw_links
        WITH c,
             reduce(acc = [], n IN raw_nodes |
                 CASE WHEN n IS NULL OR n IN acc
                 THEN acc ELSE acc + [n] END
             ) AS nodes,
             reduce(acc = [], r IN raw_links |
                 CASE WHEN r IS NULL OR r IN acc
                 THEN acc ELSE acc + [r] END
             ) AS links
        RETURN c.slug AS candidat_slug,
               [n IN nodes | {
                   id: toLower(labels(n)[0]) + ':' + n.slug,
                   label: CASE
                       WHEN n:Candidat
                       THEN trim(
                           coalesce(n.prenom, '') + ' ' +
                           coalesce(n.nom, '')
                       )
                       ELSE coalesce(n.nom, n.titre, n.slug)
                   END,
                   type: labels(n)[0]
               }] AS nodes,
               [r IN links | {
                   source: toLower(labels(startNode(r))[0])
                           + ':' + startNode(r).slug,
                   target: toLower(labels(endNode(r))[0])
                           + ':' + endNode(r).slug,
                   type: type(r)
               }] AS links
        """,
        slug=slug,
    )
 
    return rows[0] if rows else None
 
 
async def delete_projet(slug: str) -> None:
    """Supprime le projet et ses relations, sans supprimer les compétences."""
    await _query(
        """
        MATCH (p:Projet {slug: $slug})
        DETACH DELETE p
        """,
        slug=slug,
    )