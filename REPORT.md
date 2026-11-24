# Rendu — Projet Portfolio

## 1. Documentation

- [Architecture du projet](./ARCHITECTURE.md)
- [Routes de l’API](./API_ROUTES.md)

## 2. Backend déployé

- API : https://2026-2027-rouen-portfolio-nosql-tea-rouge.vercel.app
- Documentation interactive : https://2026-2027-rouen-portfolio-nosql-tea-rouge.vercel.app/docs

## 3. Vérification des bases de données

Dans la documentation interactive, cliquer sur « Try it out »,
renseigner les paramètres, puis cliquer sur « Execute ».

### MongoDB — Profil du candidat

GET /api/candidats/lea-bernard

### MongoDB — Projets du candidat

GET /api/candidats/lea-bernard/projets

### Neo4j — Graphe des compétences

GET /api/graph/competences/lea-bernard

Les réponses doivent avoir le statut HTTP 200 et contenir les données
du candidat ou de ses projets.

## 4. Portfolios déployés

| Membre | Lien du portfolio |
| --- | --- |
| Yifei HE | https://yifei-portfolio-beta.vercel.app/ |
| Xucan ZHONG | https://xucan-portfolio.vercel.app/ |
| Loïc KAKOU | https://loickakou-portfolio-beta.vercel.app/ |
