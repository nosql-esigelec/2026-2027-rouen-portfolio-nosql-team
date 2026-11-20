# 📜 API_ROUTES - Contrat d'interface de l'équipe

> **Jalon 1** : le contrat entre le backend d'équipe et **chaque** frontend. Il doit être **complet** :
> chaque membre doit pouvoir coder son frontend avec ce seul document, sans attendre le backend.
> Les 5 routes ci-dessous sont le minimum ; ajoutez **toutes** celles dont vos frontends ont besoin.

Base URL : `http://localhost:8000` · Swagger : `http://localhost:8000/docs`

## Conventions

- Identifiants publics = **slugs** (`lea-bernard`, `smartcity-explorer`, `mongodb`), jamais d'`ObjectId` exposé.
- Erreurs : `404 {"detail": "..."}` si la ressource n'existe pas.
- Pagination des projets : `?page=1&limit=10` → `{"pagination": {"page": 1, "limit": 10, "total": 0, "total_pages": 0}, "projets": []}`.
- `page` : entier supérieur ou égal à 1, valeur par défaut : 1.
- `limit` : entier entre 1 et 100, valeur par défaut : 10.
- `total` : nombre de projets correspondant aux filtres, avant pagination.
- `total_pages` : arrondi supérieur de `total / limit`, ou 0 si aucun résultat.

## `GET /api/health`

Fourni. Réponse : `{"status": "ok"}`

## 1. `GET /api/candidats/{slug}` : profil et timeline

- **Paramètres** : `slug` (string, obligatoire), identifiant public du candidat. Exemple : `lea-bernard`.
- **Écran qui l'utilise** : page du profil du candidat, avec sa présentation, ses expériences, ses formations et ses compétences.

```json
{
  "candidat_slug": "lea-bernard",
  "prenom": "Léa",
  "nom": "Bernard",
  "titre": "Élève-ingénieure Big Data — ESIGELEC",
  "bio": "Passionnée par les pipelines de données temps réel.",
  "liens": {
    "github": "https://github.com/lea-bernard",
    "linkedin": "https://www.linkedin.com/in/lea-bernard"
  },
  "experiences": [
    {
      "entreprise": "Renault Digital",
      "poste": "Stagiaire Data Engineer",
      "debut": "2026-04",
      "fin": "2026-08",
      "description": "Mise en place d'un pipeline d'ingestion de données.",
      "competences": [
        "python",
        "kafka",
        "spark"
      ]
    }
  ],
  "formations": [
    {
      "ecole": "ESIGELEC",
      "diplome": "Cycle ingénieur — Big Data (BDTN)",
      "debut": "2024-09",
      "fin": "2027-06"
    }
  ],
  "competences": [
    {
      "skill_slug": "python",
      "nom": "Python",
      "domaine_slug": "langages",
      "niveau": 5
    },
    {
      "skill_slug": "kafka",
      "nom": "Apache Kafka",
      "domaine_slug": "big-data",
      "niveau": 4
    }
  ]
}
```

## 2. `GET /api/candidats/{slug}/projets` : projets d'un candidat

- **Paramètres** : `slug` (string, obligatoire), identifiant du candidat ; `competence` (string, optionnel), filtre par compétence ; `domaine_slug` (string, optionnel), filtre par domaine ; `page` (integer ≥ 1, défaut : 1) ; `limit` (integer de 1 à 100, défaut : 10).
- **Écran** : section « Projets » du portfolio du candidat, avec des filtres par compétence et par domaine et une pagination.

```json
{
  "candidat_slug": "lea-bernard",
  "filtres": {
    "competence": "python",
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
      "projet_slug": "smartcity-explorer",
      "titre": "SmartCity Explorer",
      "description": "Application d'exploration et d'analyse de données urbaines",
      "contexte": "Projet académique NoSQL",
      "architecture": "FastAPI, MongoDB et Neo4j",
      "date_debut": "2026-09",
      "date_fin": "2026-11",
      "candidat_slugs": [
        "hugo-lefebvre",
        "lea-bernard"
      ],
      "competence_slugs": [
        "python",
        "fastapi",
        "mongodb",
        "neo4j"
      ],
      "domaine_slugs": [
        "langages",
        "web",
        "bases-de-donnees"
      ],
      "technologies": [
        "Python",
        "FastAPI",
        "MongoDB",
        "Neo4j"
      ],
      "réalisation": [
        "Développement d'une API REST",
        "Intégration de plusieurs bases de données",
        "Visualisation et exploration de données"
      ],
      "liens": {
        "github": "https://github.com/hugo-lefebvre/smartcity-explorer",
        "demo": "https://smartcity-explorer.example.com"
      },
      "medias": [
        {
          "type": "image",
          "url": "https://example.com/smartcity-explorer.png",
          "description": "Capture d'écran de l'application"
        }
      ]
    }
  ]
}
```

## 3. `GET /api/candidats/{slug}/stats` : statistiques par compétence (agrégation MongoDB)

- **Paramètres** : `slug` (string, obligatoire), identifiant public du candidat. Exemple : `GET /api/candidats/lea-bernard/stats`.
- **Écran** : section « Statistiques de compétences » du portfolio, avec un graphique présentant le nombre de projets dans lesquels chaque compétence a été utilisée.

```json
{
  "candidat_slug": "lea-bernard",
  "total_projets": 1,
  "total_competences_utilisees": 4,
  "statistiques": [
    {
      "competence_slug": "fastapi",
      "nom": "FastAPI",
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
    },
    {
      "competence_slug": "python",
      "nom": "Python",
      "nombre_projets": 1
    }
  ]
}
```

## 4. `GET /api/graph/projets/{slug}/similaires` : projets similaires (Neo4j)

- **Paramètres** : `slug` (string, obligatoire), identifiant du projet source ; `limit` (integer de 1 à 100, optionnel, défaut : 5). Exemple : `GET /api/graph/projets/smartcity-explorer/similaires?limit=5`.
- **Écran** : page « Détail d'un projet », section « Projets similaires », permettant au recruteur de découvrir d'autres réalisations utilisant des compétences communes.

```json
{
  "projet_source": "smartcity-explorer",
  "total": 2,
  "projets_similaires": [
    {
      "slug": "portfolio-polyglotte",
      "titre": "Portfolio Polyglotte",
      "competences_communes": [
        "python",
        "fastapi",
        "mongodb",
        "neo4j"
      ],
      "nombre_competences_communes": 4
    },
    {
      "slug": "pipeline-data",
      "titre": "Pipeline Data",
      "competences_communes": [
        "python"
      ],
      "nombre_competences_communes": 1
    }
  ]
}
```

## 5. `GET /api/graph/competences/{slug}` : graphe de compétences prêt à afficher (Neo4j)

- **Paramètres** : `slug` (string, obligatoire), identifiant public du candidat. Exemple : `GET /api/graph/competences/lea-bernard`.
- **Écran** : page « Compétences », section « Graphe interactif », permettant au recruteur de visualiser les relations entre le candidat, ses compétences, les domaines et les projets dans lesquels elles sont utilisées.
- 
```json
{
  "candidat_slug": "lea-bernard",
  "nodes": [
    {
      "id": "candidat:lea-bernard",
      "label": "Léa Bernard",
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
      "id": "domaine:langages",
      "label": "Langages",
      "type": "Domaine"
    }
  ],
  "links": [
    {
      "source": "candidat:lea-bernard",
      "target": "projet:smartcity-explorer",
      "type": "A_REALISE"
    },
    {
      "source": "candidat:lea-bernard",
      "target": "competence:python",
      "type": "MAITRISE"
    },
    {
      "source": "projet:smartcity-explorer",
      "target": "competence:python",
      "type": "UTILISE"
    },
    {
      "source": "competence:python",
      "target": "domaine:langages",
      "type": "APPARTIENT_A"
    }
  ]
}
```

## 6. `GET /api/projets/{slug}` : détail d'un projet

- **Paramètres** : `slug` (string, obligatoire), identifiant public du projet. Exemple : `GET /api/projets/smartcity-explorer`.
- **Écran** : page « Détail d'un projet », présentant sa description, son architecture, ses technologies, ses réalisations, ses liens et ses projets similaires.

```json
{
  "projet_slug": "smartcity-explorer",
  "titre": "SmartCity Explorer",
  "description": "Application d'exploration et d'analyse de données urbaines",
  "contexte": "Projet académique NoSQL",
  "architecture": "FastAPI, MongoDB et Neo4j",
  "date_debut": "2026-09",
  "date_fin": "2026-11",
  "candidat_slugs": [
    "hugo-lefebvre",
    "lea-bernard"
  ],
  "competence_slugs": [
    "python",
    "fastapi",
    "mongodb",
    "neo4j"
  ],
  "domaine_slugs": [
    "langages",
    "web",
    "bases-de-donnees"
  ],
  "technologies": [
    "Python",
    "FastAPI",
    "MongoDB",
    "Neo4j"
  ],
  "réalisation": [
    "Développement d'une API REST",
    "Intégration de plusieurs bases de données",
    "Visualisation et exploration de données"
  ],
  "liens": {
    "github": "https://github.com/hugo-lefebvre/smartcity-explorer",
    "demo": "https://smartcity-explorer.example.com"
  },
  "medias": [
    {
      "type": "image",
      "url": "https://example.com/smartcity-explorer.png",
      "description": "Capture d'écran de l'application"
    }
  ],
  "total_similaires": 1,
  "projets_similaires": [
    {
      "slug": "portfolio-polyglotte",
      "titre": "Portfolio Polyglotte",
      "competences_communes": [
        "python",
        "fastapi",
        "mongodb",
        "neo4j"
      ],
      "nombre_competences_communes": 4
    }
  ]
}
```

## 7. `GET /api/candidats/{slug}/experiences/recente` : expérience professionnelle la plus récente

- **Paramètres** : `slug` (string, obligatoire), identifiant public du candidat. Exemple : `GET /api/candidats/lea-bernard/experiences/recente`.
- **Écran** : section « Dernière expérience professionnelle » du profil du candidat.

```json
{
  "candidat_slug": "lea-bernard",
  "experience": {
    "entreprise": "Renault Digital",
    "poste": "Stagiaire Data Engineer",
    "debut": "2026-04",
    "fin": "2026-08",
    "description": "Mise en place d'un pipeline d'ingestion de données véhicules connectés avec Kafka et Spark Streaming.",
    "competences": [
      "python",
      "kafka",
      "spark"
    ]
  }
}
```

## 8. `GET /api/candidats/{slug}/projets?domaine_slug=...` : projets par domaine

- **Paramètres** : `slug` (string, obligatoire), identifiant du candidat ; `domaine_slug` (string, nécessaire pour ce filtre), identifiant du domaine ; `competence` (string, optionnel), filtre supplémentaire par compétence ; `page` (integer ≥ 1, défaut : 1) ; `limit` (integer de 1 à 100, défaut : 10).
- **Écran** : section « Projets par domaine » du portfolio, permettant au recruteur de consulter les projets associés à un domaine.

```json
{
  "candidat_slug": "lea-bernard",
  "filtres": {
    "competence": null,
    "domaine_slug": "domaine-inconnu"
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "total_pages": 0
  },
  "projets": []
}
```

