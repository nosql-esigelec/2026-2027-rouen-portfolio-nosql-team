# Portfolio de Yifei HE — HE020215

Portfolio personnel de Yifei HE sur une seule page :
ordinateur interactif, projets filtrables, fiches projet, parcours
et visualisation des relations entre projets, compétences et domaines.

Développé en HTML, CSS et JavaScript natifs, sans npm ni compilation.
Les données sont récupérées depuis l’API de l’équipe déployée sur Vercel.

## Démarrage habituel

Le frontend utilise le backend de l’équipe déployé sur Vercel,
connecté aux bases cloud MongoDB et Neo4j.

Dans `config.js`, configurer l’adresse de l’API :

```javascript
apiBase: "https://2026-2027-rouen-portfolio-nosql-tea-rouge.vercel.app/api",
```

Depuis la racine du projet, ouvrir un terminal PowerShell :

```powershell
cd frontends/frontend-HE020215
python dev.py
```

Ouvrir http://127.0.0.1:5173 dans le navigateur.
Garder le terminal ouvert pendant l’utilisation.

Il n’est pas nécessaire de démarrer le backend local ni Docker.
Ne pas ouvrir `index.html` directement.

Le backend doit autoriser `http://127.0.0.1:5173`
dans sa configuration CORS.
Les données de `he-yifei` doivent déjà être importées dans les bases cloud.

## Adaptation au backend existant

 `app.js` adapte les réponses de l'équipe :

| Réponse de l'API | Utilisation dans l'affichage |
| --- | --- |
| `candidat_slug`, `bio` | Identité et présentation |
| `experiences[].debut/fin` | Dates des expériences |
| `formations[].ecole`, `debut/fin` | École et dates des formations |
| `competences[].skill_slug`, `domaine_slug` | Filtres et groupes de compétences |
| `projets[].projet_slug` | Ouverture de la fiche projet |
| `statistiques`, `nodes`, `links` | Comptages et relations réellement renvoyés |

Le contact et les niveaux de langue CECRL du CV sont dans `config.js`, car
`CandidatOut` ne les expose pas. Les niveaux numériques `niveau` ne sont pas
inventés ni convertis arbitrairement depuis « B1 » : ils restent `null` dans les JSON.
Les descriptions, expériences, formations, projets et relations viennent de l'API.

## Données personnelles à importer

- `data/candidats/HE020215.json` : profil, stage, engagement, formations et 29 compétences.
- `data/projets/HE020215.json` : les trois projets du CV.

Les fichiers de l'équipe et les exemples existants restent inchangés. Le seed actuel
charge les fichiers `*.json` hors préfixe `_`. Chaque compétence contient
`domaine_slug` pour les modèles API et son alias identique `domaine` pour le seed
Neo4j existant, qui lit ce second nom. Cela évite de changer le backend.

L'import JSON ne se fait pas au simple démarrage de l'API. Après ajout des fichiers,
il faut importer les données dans les bases choisies par l'équipe. La commande
existante est, depuis `backend` :

```powershell
uv run python -m portfolio_api.scripts.seed
```

Attention : le seed actuel efface les collections MongoDB `candidats` et `projets`
avant de recharger les JSON du dépôt. Vérifier que les fichiers de tous les membres
sont présents et que les bases ciblées sont les bonnes avant de l'exécuter.
Le seed n'a pas été exécuté sur les bases cloud pendant cette intégration.


## Routes utilisées

- R1 : `GET /api/candidats/he-yifei`.
- R2 : `GET /api/candidats/he-yifei/projets` avec filtres et pagination.
- R3 : `GET /api/candidats/he-yifei/stats`.
- R4 : `GET /api/graph/projets/{slug}/similaires`.
- R5 : `GET /api/graph/competences/he-yifei`.
- R6 : `GET /api/projets/{slug}`.

R7 et R8 restent disponibles dans le backend. Le parcours dispose déjà des
expériences via R1 et le filtre par domaine utilise R2 : aucun appel supplémentaire
n'est nécessaire pour reproduire le frontend demandé.

Les illustrations SVG sont originales et les schémas des projets sont indiqués
comme illustratifs. Le CV original reste téléchargeable. Les animations peuvent être
suspendues et respectent la préférence système de réduction des mouvements.
