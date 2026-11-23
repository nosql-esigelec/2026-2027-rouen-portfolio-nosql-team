# Frontend individuel — Tahirou111 (React + Vite)

## Fonctionnement

**Aucun dataset dans ce frontend.** Toutes les données sont chargées depuis FastAPI.
Le navigateur ne se connecte jamais directement à MongoDB ni à Neo4j.

| Zone de la page | Requête backend |
|---|---|
| CV, identité, expériences, formations, projets, statistiques | `GET /api/portfolio/{slug}?limit=100` |
| Clic sur une compétence | `GET /api/portfolio/{slug}/competences/{skill_slug}` |
| Fiche projet | `GET /api/projets/{projet_slug}` |
| Projets similaires | `GET /api/graph/projets/{projet_slug}/similaires` |
| Réseau interactif | `GET /api/graph/competences/{slug}` |

Quand FastAPI est absent, la page affiche une **erreur explicite** et un bouton Réessayer ; aucune donnée de démonstration ne remplace la réponse de l'API. Si Neo4j ne répond pas, le graphe affiche une erreur visible sans cacher les autres données du CV.

## Installation Windows (PowerShell / Terminal VS Code)

À la racine du dépôt, dans un premier terminal :

```powershell
Copy-Item .env.example .env
just up
just install
just validate
just seed
just dev
```

> Le backend enrichi doit contenir `backend/src/portfolio_api/api/routes_portfolio.py`, enregistré dans `main.py`. Il doit écouter sur `http://localhost:8000`. Requiert Docker Desktop, `uv` et `just`.

Dans un deuxième terminal :

```powershell
cd frontends/frontend-Tahirou111
Copy-Item .env.example .env
notepad .env
npm install
npm run dev
```

Dans `.env`, remplacer `VITE_CANDIDAT_SLUG=lea-bernard` par le slug **existant dans MongoDB** pour ton propre CV. `lea-bernard` est seulement un exemple fourni dans la base du dépôt ; rien n'est copié côté frontend. Quand `.env` change, redémarrer Vite.

Ouvrir `http://localhost:5173/`. Vite redirige automatiquement les requêtes `/api/...` vers `http://127.0.0.1:8000` grâce à `vite.config.js`. Pour tester un autre candidat existant ponctuellement, `http://localhost:5173/?slug=son-slug`.

## Diagnostic

1. `http://localhost:8000/api/health` doit retourner `{"status":"ok"}`.
2. `http://localhost:8000/api/portfolio/lea-bernard` doit renvoyer un objet avec `candidat`, `timeline`, `projets` et `stats` si ce candidat a été importé.
3. Depuis `http://localhost:5173`, ouvrir F12 > Réseau. Contrôler le statut de `GET /api/portfolio/{slug}`.
4. `404` signifie que le slug est absent ; `500` signifie une erreur serveur ; erreur réseau indique que l'API est inaccessible ou que le proxy Vite n'atteint pas FastAPI.
5. Si seul le graphe échoue, vérifier Neo4j et la route `/api/graph/competences/{slug}`. Le site n'invente plus de graphe.

## Raccourcis et présentation

Écran d'introduction, navigation au scroll et au clavier (Entrée, flèches, 1–6, Échap et ?), fiches cliquables, projets filtrables et graphe Neo4j interactif. Le site est mono-étudiant ; change son slug, pas une collection de données dans React.

**Note** : `index.html` est l'entrée Vite, pas une page HTML autonome à ouvrir par double clic. L'installation npm et un test de bout en bout avec des bases en fonctionnement restent à réaliser sur la machine de l'équipe.
