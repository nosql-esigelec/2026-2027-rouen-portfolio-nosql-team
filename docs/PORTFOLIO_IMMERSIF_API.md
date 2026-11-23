# Portfolio immersif — guide backend / frontend

## Objectif

Chaque portfolio est **celui d'un seul étudiant**, identifié par son `candidat_slug`.
L'API FastAPI commune peut servir plusieurs portfolios, mais la page publique ne
charge que le slug de l'étudiant concerné. Les données des expériences, formations,
compétences, projets et liens proviennent de MongoDB. Le graphe utilise Neo4j.

L'animation de suspense, le scroll narratif, les panneaux de détail et les
raccourcis clavier appartiennent au **frontend** et ne sont pas générés par l'API.
Le backend fournit les contenus nécessaires.

## Nouveaux endpoints

| Route | Utilisation frontend | Source |
|---|---|---|
| `GET /api/portfolio/{slug}?page=1&limit=30` | Accueil, hero, chronologie, premières cartes, statistiques | MongoDB |
| `GET /api/portfolio/{slug}/competences/{skill_slug}` | Panneau ouvert en cliquant une compétence | MongoDB |

La réponse de `/api/portfolio/{slug}` contient :

- `candidat_slug`
- `candidat` : nom, titre, bio, `presentation`, liens, expériences, formations, compétences
- `timeline` : événements `experience` et `formation`, triés par date de début décroissante
- `projets` : structure paginée R2 (`filtres`, `pagination`, `projets`)
- `stats` : structure R3 (`total_projets`, statistiques par compétence)

La réponse de `/api/portfolio/{slug}/competences/{skill_slug}` contient :

- `competence` : fiche de compétence (nom, niveau, domaine, description facultative)
- `projets` : les 100 premiers projets du candidat utilisant la compétence
- `total_projets` : nombre total (les suivants restent accessibles avec R2)
- `experiences` : expériences du CV dont la liste `competences` contient cette compétence

Une compétence utilisée seulement dans un projet reste exploratoire, même si elle
n'est pas encore déclarée dans les compétences du CV. Son nom de repli est son slug.

Les autres routes de l'équipe restent inchangées et utiles :

- `GET /api/candidats/{slug}/projets?page=2&limit=30` : pagination des cartes
- `GET /api/candidats/{slug}/projets?competence=python` : filtre par compétence
- `GET /api/candidats/{slug}/projets?domaine_slug=data` : filtre par domaine
- `GET /api/projets/{projet_slug}` : détail complet d'une carte projet, suggestions incluses
- `GET /api/graph/competences/{slug}` : réseau navigable Neo4j
- `GET /api/graph/projets/{projet_slug}/similaires` : suggestions Neo4j
- `GET /api/candidats/{slug}/experiences/derniere` : expérience récente

Exemple, pour les données de démonstration livrées avec le dépôt :

```bash
curl http://localhost:8000/api/portfolio/lea-bernard
curl http://localhost:8000/api/portfolio/lea-bernard/competences/python
curl http://localhost:8000/api/graph/competences/lea-bernard
```

## Champs facultatifs pour l'introduction immersive

Dans le document d'un étudiant, ajouter `presentation` sans effacer ses autres
propriétés. Exemple à adapter **avec les vraies informations** :

```json
{
  "presentation": {
    "accroche": "Au croisement de la data et de l'ingénierie",
    "introduction": [
      "Un parcours à découvrir.",
      "Des compétences qui prennent vie dans mes projets."
    ],
    "photo_url": "/images/profil.webp",
    "cv_url": "/cv.pdf",
    "localisation": "Rouen, France",
    "disponibilite": "À renseigner",
    "couleur_accent": "#a855f7"
  }
}
```

**Attention :** ceci est un *fragment* JSON, et non un document candidat
complet. Ajouter `presentation` à un profil déjà présent dans
`data/candidats/candidats.json` ou dans le fichier individuel du membre.
Les URLs de photo et de CV doivent pointer vers des fichiers **réellement servis**
par le frontend ou un hébergeur. Le backend ne publie pas automatiquement les fichiers.

Dans `competences`, les attributs facultatifs `description`, `icone` sont pris en
charge. Dans `projets`, les attributs facultatifs `couverture_url`, `role`,
`problematique`, `resultats` (tableau) et `mise_en_avant` sont pris en charge.
Si ces champs ne sont pas remplis, le frontend doit utiliser une mise en page
sobre et ne pas afficher de statistiques inventées.

## Flux d'exploration proposé

1. Le navigateur récupère `GET /api/portfolio/{slug}`.
2. L'introduction affiche `candidat.presentation.introduction` et le nom.
3. Le scroll déroule `timeline`, `candidat.competences`, `stats`, puis les `projets.projets`.
4. Un clic sur une compétence charge `/api/portfolio/{slug}/competences/{skill_slug}`.
5. Un clic sur un projet charge `/api/projets/{projet_slug}` ; des liens permettent
   de consulter les projets similaires.
6. La section réseau charge `/api/graph/competences/{slug}` seulement lorsqu'elle
   est utilisée. Si Neo4j est momentanément indisponible, afficher un message local
   sans bloquer le reste du portfolio.

**Navigation clavier (à coder dans le frontend)** : Entrée pour lancer l'intro,
flèches haut/bas pour les sections, Tab/Shift+Tab pour les éléments interactifs,
Entrée/Espace pour ouvrir, Échap pour fermer un panneau. Préserver le focus et
prévoir `prefers-reduced-motion` pour les animations.

## Validation et mise à jour des données

```bash
# Depuis la racine du dépôt
just validate      # contrôle hors ligne des JSON : schéma, doublons, références
just up            # démarre MongoDB et Neo4j (Docker requis)
just install       # installe les dépendances de l'API
just seed          # réimporte les fichiers data/ dans les bases
just test          # exécute les tests
just dev           # lance l'API sur http://localhost:8000
```

`just seed` **réinitialise les collections MongoDB** avant d'importer les
fichiers JSON. Il faut donc enregistrer les modifications souhaitées dans
`data/` avant de lancer le seed : ne pas l'utiliser comme une fonction de
sauvegarde des modifications faites directement dans MongoDB.

Ne pas exposer les identifiants Neo4j, l'URL MongoDB ou les secrets dans le
frontend. Le navigateur ne parle qu'à FastAPI (CORS autorisé pour localhost:5173).
