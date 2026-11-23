# Suivi du portfolio individuel immersif

Dernière mise à jour : **20 novembre 2026** — version de travail construite à partir de l'archive fournie.

## État de la réalisation

| Élément | Statut | Commentaire |
|---|---|---|
| Structure FastAPI | ✅ Existant, vérifié | Routers intégrés dans `main.py` |
| MongoDB (profils, expériences, projets, stats) | ✅ Code existant | Tests unitaires simulant l'accès DB |
| Neo4j (graphe, projets similaires) | ✅ Code existant, correctif apporté | `domaine_slug` reconnu à l'import |
| Routes classiques R1–R8 | ✅ Conservées | Route R7 corrigée, alias contractuel ajouté, chemin ancien R8 préservé |
| Vue agrégée d'un étudiant | ✅ Ajoutée | `GET /api/portfolio/{slug}` |
| Fiche cliquable d'une compétence | ✅ Ajoutée | `GET /api/portfolio/{slug}/competences/{skill_slug}` |
| Champs facultatifs de présentation immersive | ✅ Modèles prêts | Les données restent à renseigner dans les JSON |
| Validation locale des données | ✅ Ajoutée | `just validate` |
| Tests automatiques backend | ✅ 183 réussis | Tests unitaires/mocks, **sans conteneurs réels** |
| Vérification MongoDB / Neo4j en fonctionnement réel | ⏳ À effectuer | Docker non disponible dans l'environnement de validation |
| Personnalisation avec le vrai CV de l'étudiant | ⏳ À renseigner | Remplacer/ajouter les données de son slug |
| Landing page avec suspense | ⏳ Frontend à développer | React + animations |
| Scroll narratif et panneaux de détail | ⏳ Frontend à développer | Consommation des nouvelles routes |
| Navigation clavier + accessibilité | ⏳ Frontend à développer | Entrée, flèches, Tab, Échap, focus |
| Graphe Neo4j interactif | ⏳ Interface à développer | La route de données existe |

## Avancement actuel

**Backend prêt pour branchement du frontend**, sous réserve des tests d'intégration
sur MongoDB et Neo4j réels. Le frontend immersif n'est pas développé dans cette archive.
Le code partagé du backend a été prolongé sans retirer les routes de l'équipe.

### Prochaines tâches prioritaires

1. Sur ton poste, lancer `just up`, `just install`, `just seed`, `just test`, `just dev`.
2. Modifier ton propre profil et tes projets dans `data/` (voir `docs/PORTFOLIO_IMMERSIF_API.md`).
3. Choisir le dossier `frontends/frontend-<pseudo>/` qui t'appartient pour le React/Vite.
4. Construire d'abord l'écran de suspense, puis les sections scrollables.
5. Ajouter les panneaux compétences/projets, le graphe, le clavier et les essais mobiles.

**Important :** pas de synchronisation automatique en dehors de cette conversation.
Ce fichier constitue un état de suivi réutilisable lors de la prochaine version.
