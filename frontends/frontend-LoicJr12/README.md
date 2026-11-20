# Frontend de @LoicJr12 — Portfolio 3D de Loïc KAKOU

- **Technologie** : React 19 + Vite (JavaScript), Three.js via React Three Fiber + drei pour l'univers 3D et le robot guide.
- **Prérequis** : Node.js ≥ 20, backend d'équipe lancé (`just up && just seed && just dev` à la racine du dépôt).

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
| R2 | `GET /api/candidats/{slug}/projets?competence=` | Accueil — galerie de projets filtrable |
| R3 | `GET /api/candidats/{slug}/stats` | Accueil — statistiques de compétences |
| R4 | `GET /api/graph/projets/{slug}/similaires` | Détail projet — projets similaires |
| R5 | `GET /api/graph/competences/{slug}` | Accueil — graphe de compétences 3D |
| R6 | `GET /api/projets/{slug}` | `/projets/:slug` — détail d'un projet |
| R7 | `GET /api/candidats/{slug}/experiences/recente` | Accueil — dernière expérience |
| R8 | `GET /api/candidats/{slug}/projets?domaine_slug=` | Accueil — projets par domaine |

Toutes les fonctions d'appel sont regroupées dans `src/api/client.js`.
