# Intégration réelle : frontend Tahirou111 ↔ API FastAPI

- Dossier frontend livré : `frontends/frontend-Tahirou111` (React/Vite).
- Fichier de données factices du frontend : **aucun**.
- Backend : routes `/api/portfolio/{slug}` et `/api/portfolio/{slug}/competences/{skill_slug}`, déjà présentes dans l'archive de backend enrichi.
- MongoDB : profils, formation, expérience, projets, statistiques.
- Neo4j : graphe de compétences et projets similaires.
- Slug exemple : `lea-bernard` **existe uniquement dans le dataset backend**. Il ne représente pas Tahirou111. Personnaliser `VITE_CANDIDAT_SLUG` et importer le véritable profil en base.
- En cas d'échec de l'API, le frontend n'affiche aucune donnée fictive : erreur et bouton Réessayer.

Suivre le `frontends/frontend-Tahirou111/README.md` pour les commandes Windows, le lancement et le diagnostic.

## Vérifications effectuées dans l'environnement de génération

- Analyse syntaxique JSX avec TypeScript (aucune erreur de syntaxe signalée).
- Contrôle des appels frontend par rapport aux routes présentes dans le backend.
- Absence de dataset `src/data` dans le frontend et absence de mode démo dans `App.jsx`.

## À confirmer sur le poste de développement

- `npm install && npm run build` (dépendances npm non disponibles hors ligne ici).
- `just test` et démarrage du backend (dépendance Python `pymongo` absente de l'environnement de test).
- Test navigateur, chargement des vraies données MongoDB et chargement du graphe Neo4j.

### Collaborateurs

Cette livraison est basée sur l'archive de backend enrichi échangée dans la conversation. Si ton dépôt local a évolué depuis, **fusionner les changements** au lieu de remplacer les fichiers modifiés par l'équipe.
