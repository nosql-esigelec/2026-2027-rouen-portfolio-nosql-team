# Frontend de @LoicJr12 — Portfolio 3D de Loïc KAKOU

- **Technologie** : React 19 + Vite (JavaScript), Three.js via React Three Fiber + drei (univers 3D, robot guide, graphe de compétences), d3-force-3d (placement du graphe).
- **Prérequis** : **Node.js 22 LTS** (minimum 20.19 — Node 18 ne fonctionne pas avec Vite 8), backend d'équipe lancé (`just up && just seed && just dev` à la racine du dépôt).

## Lancer

```bash
cd frontends/frontend-LoicJr12
cp .env.example .env      # VITE_API_URL et VITE_CANDIDAT_SLUG
npm install
npm run dev               # http://localhost:5173 (origine déjà autorisée par le CORS du backend)
```

## Routes de `API_ROUTES.md` consommées

| Requête | Route | Page / section |
|---|---|---|
| R1 | `GET /api/candidats/{slug}` | Accueil — profil & timeline du parcours |
| R2 | `GET /api/candidats/{slug}/projets?competence=` | Escale Projets — filtre par compétence + pagination (et catalogue complet pour la carte « Projets » de l’accueil) |
| R3 | `GET /api/candidats/{slug}/stats` | Accueil (carte « Technos ») + escale Compétences — barres « projets par compétence » |
| R4 | `GET /api/graph/projets/{slug}/similaires?limit=` | `/projets/:slug` — carte orbitale + liste des projets similaires, sélecteur `limit` (3 / 5 / 10) |
| R5 | `GET /api/graph/competences/{slug}` | Escale Compétences — constellation 3D interactive + fiche du nœud |
| R6 | `GET /api/projets/{slug}` | `/projets/:slug` — détail complet : architecture, réalisations, technologies, équipe, liens, médias |
| R7 | `GET /api/candidats/{slug}/experiences/recente` | Accueil — dernière expérience |
| R8 | `GET /api/candidats/{slug}/projets?domaine_slug=` | Escale Projets — filtre par domaine (combinable avec R2) |

Toutes les fonctions d'appel sont regroupées dans `src/api/client.js`.
