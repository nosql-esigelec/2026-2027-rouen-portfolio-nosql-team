# 📜 API_ROUTES - Contrat d'interface de l'équipe

> **Jalon 1** : le contrat entre le backend d'équipe et **chaque** frontend. Il doit être **complet** :
> chaque membre doit pouvoir coder son frontend avec ce seul document, sans attendre le backend.
> Les 5 routes ci-dessous sont le minimum ; ajoutez **toutes** celles dont vos frontends ont besoin.
> Remplacez **tous** les `TODO`. Après la soutenance, toute modification passe par une Pull Request relue par l'équipe.

Base URL : `http://localhost:8000` · Swagger : `http://localhost:8000/docs`

## Conventions

- Identifiants publics = **slugs** (`alice-martin`, `smartcity-explorer`, `mongodb`), jamais d'`ObjectId` exposé.
- Erreurs : `404 {"detail": "..."}` si la ressource n'existe pas.
- Pagination : `?page=1&size=20` → `{"items": [...], "total": 42, "page": 1, "size": 20}`.

## `GET /api/health`

Fourni. Réponse : `{"status": "ok"}`

## 1. `GET /api/candidats/{slug}` : profil et timeline

- **Paramètres** : TODO
- **Écran qui l'utilise** : TODO

```json
{
  "slug": "alice-martin",
  "nom": "Martin",
  "prenom": "Alice",
  "titre": "Eleve ingenieure Big Data",
  "description": "Passionnee par la data science et l'IA",
  "contact": {
    "email": "alice@example.com",
    "telephone": "84775757575"
  },
  "liens": {
    "github": "https://github.com/alice-martin",
    "linkdIn": "https://linkedin.com/in/alice-martin"
  },
  "formations": [
    {
      "etablissement": "ESIGELEC",
      "diplome": "Diplome d'ingenieur",
      "date_debut": "2024-09",
      "date_fin": "2027-06"
    }
  ],
  "experiences": [
    {
      "poste": "Stagiaire Data Engineer",
      "entreprise": "Entreprise Exemple",
      "date_debut": "2026-06",
      "date_fin": "2026-08"
    }
  ],
  "competences": [
    {
      "slug": "python",
      "nom": "Python",
      "type": "technique",
      "domaine_slug": "programmation",
      "niveau": "intermediaire"
    },
    {
      "slug": "mongodb",
      "nom": "MongoDB",
      "type": "technique",
      "domaine_slug": "data-engineering",
      "niveau": "intermediaire"
    },
    {
      "slug": "anglais",
      "nom": "Anglais",
      "type": "linguistique",
      "domaine_slug": "langues",
      "niveau": "B2"
    },
    {
      "slug": "travail-equipe",
      "nom": "Travail en equipe",
      "type": "transversale",
      "domaine_slug": "soft-skills",
      "niveau": null
    }
  ]
}
```

## 2. `GET /api/candidats/{slug}/projets` : projets d'un candidat

- **Paramètres** : TODO (ex. `?competence=mongodb&page=1`)
- **Écran** : TODO

```json

{
  "candidat_slug": "alice-martin",
  "filtres": {
    "competence": "mongodb",
    "domaine_slug": null
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1
  },
  "projets": [
    {
      "slug": "smartcity-explorer",
      "titre": "SmartCity Explorer",
      "description": "Application d'exploration et d'analyse de donnees urbaines",
      "contexte": "Projet academique NoSQL",
      "architecture": "FastAPI, MongoDB et Neo4j",
      "date_debut": "2026-09",
      "date_fin": "2026-11",
      "candidat_slugs": [
        "alice-martin",
        "bob-dupont"
      ],
      "competence_slugs": [
        "python",
        "mongodb",
        "neo4j"
      ],
      "domaine_slugs": [
        "programmation",
        "data-engineering"
      ],
      "technologies": [
        "Python",
        "FastAPI",
        "MongoDB",
        "Neo4j"
      ],
      "réalisation": [
        "Developpement d'une API REST",
        "Integration de plusieurs bases de donnees",
        "Visualisation et exploration de donnees"
      ],
      "liens": {
        "github": "https://github.com/exemple/smartcity-explorer",
        "demo": null
      },
      "medias": [
        {
          "type": "image",
          "url": "https://example.com/smartcity.png",
          "description": "Capture d'ecran de l'application"
        }
      ]
    }
  ]
}
```

## 3. `GET /api/candidats/{slug}/stats` : statistiques par compétence (agrégation MongoDB)

- **Paramètres** : GET /api/candidats/alice-martin/stats   | slug = alice-martin
- **Écran** : Section « Statistiques de compétences » du portfolio, avec un graphique présentant le nombre de projets dans lesquels chaque compétence a été utilisée

```json

{
  "candidat_slug": "alice-martin",
  "total_projets": 1,
  "total_competences_utilisees": 3,
  "statistiques": [
    {
      "competence_slug": "python",
      "nom": "Python",
      "nombre_projets": 1
    },
    {
      "competence_slug": "mongodb",
      "nom": "MongoDB",
      "nombre_projets": 1
    },
    {
      "competence_slug": "neo4j",
      "nom": "Neo4j",
      "nombre_projets": 1
    }
  ]
}
```

## 4. `GET /api/graph/projets/{slug}/similaires` : projets similaires (Neo4j)

- **Paramètres** : GET /api/graph/projets/smartcity-explorer/similaires?limit=5     | slug = smartcity-explore
- **Écran** : Page « Détail d'un projet », section « Projets similaires », permettant au recruteur de découvrir d'autres réalisations utilisant des compétences communes.

```json
{
  "projet_source": "smartcity-explorer",
  "total": 2,
  "projets_similaires": [
    {
      "slug": "analyse-donnees-python",
      "titre": "Analyse de donnees avec Python",
      "competences_communes": [
        "python",
        "mongodb"
      ],
      "nombre_competences_communes": 2
    },
    {
      "slug": "api-data-engineering",
      "titre": "API Data Engineering",
      "competences_communes": [
        "python",
        "neo4j"
      ],
      "nombre_competences_communes": 2
    }
  ]
}
```

## 5. `GET /api/graph/competences/{slug}` : graphe de compétences prêt à afficher (Neo4j)

- **Paramètres** : GET /api/graph/competences/alice-martin   | slug = alice-martin
- **Écran** : Page « Compétences », section « Graphe interactif », permettant au recruteur de visualiser les relations entre le candidat, ses compétences, les domaines et les projets dans lesquels elles sont utilisées.

```json
{
  "candidat_slug": "alice-martin",
  "nodes": [
    {
      "id": "candidat:alice-martin",
      "label": "Alice Martin",
      "type": "Candidat"
    },
    {
      "id": "projet:smartcity-explorer",
      "label": "SmartCity Explorer",
      "type": "Projet"
    },
    {
      "id": "competence:python",
      "label": "Python",
      "type": "Competence"
    },
    {
      "id": "competence:mongodb",
      "label": "MongoDB",
      "type": "Competence"
    },
    {
      "id": "competence:anglais",
      "label": "Anglais",
      "type": "Competence"
    },
    {
      "id": "competence:travail-equipe",
      "label": "Travail en equipe",
      "type": "Competence"
    },
    {
      "id": "competence:neo4j",
      "label": "Neo4j",
      "type": "Competence"
    },
    {
      "id": "domaine:programmation",
      "label": "Programmation",
      "type": "Domaine"
    },
    {
      "id": "domaine:data-engineering",
      "label": "Data Engineering",
      "type": "Domaine"
    },
    {
      "id": "domaine:langues",
      "label": "Langues",
      "type": "Domaine"
    },
    {
      "id": "domaine:soft-skills",
      "label": "Soft Skills",
      "type": "Domaine"
    }
  ],
  "links": [
    {
      "source": "candidat:alice-martin",
      "target": "projet:smartcity-explorer",
      "type": "A_REALISE"
    },
    {
      "source": "candidat:alice-martin",
      "target": "competence:python",
      "type": "MAITRISE"
    },
    {
      "source": "candidat:alice-martin",
      "target": "competence:mongodb",
      "type": "MAITRISE"
    },
    {
      "source": "candidat:alice-martin",
      "target": "competence:anglais",
      "type": "MAITRISE"
    },
    {
      "source": "candidat:alice-martin",
      "target": "competence:travail-equipe",
      "type": "MAITRISE"
    },
    {
      "source": "projet:smartcity-explorer",
      "target": "competence:python",
      "type": "UTILISE"
    },
    {
      "source": "projet:smartcity-explorer",
      "target": "competence:mongodb",
      "type": "UTILISE"
    },
    {
      "source": "projet:smartcity-explorer",
      "target": "competence:neo4j",
      "type": "UTILISE"
    },
    {
      "source": "competence:python",
      "target": "domaine:programmation",
      "type": "APPARTIENT_A"
    },
    {
      "source": "competence:mongodb",
      "target": "domaine:data-engineering",
      "type": "APPARTIENT_A"
    },
    {
      "source": "competence:neo4j",
      "target": "domaine:data-engineering",
      "type": "APPARTIENT_A"
    },
    {
      "source": "competence:anglais",
      "target": "domaine:langues",
      "type": "APPARTIENT_A"
    },
    {
      "source": "competence:travail-equipe",
      "target": "domaine:soft-skills",
      "type": "APPARTIENT_A"
    }
  ]
}
```

## TODO : vos routes supplémentaires

Une section par route, même format : chemin, paramètres, écran, exemple de réponse.
