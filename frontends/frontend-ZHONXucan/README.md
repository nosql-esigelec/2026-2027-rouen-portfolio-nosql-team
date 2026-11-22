# Portfolio de ZHONG Xucan — intégré au backend de l’équipe

## Démarrage

Double-cliquer sur `启动前端.cmd` à la racine du projet. Le lanceur :

1. réutilise l’API http://127.0.0.1:8000 si elle est déjà démarrée ;
2. sinon, démarre le backend existant avec son propre environnement backend/.venv, sans modifier son code ;
3. configure SSL_CERT_FILE pour ce processus à partir de certifi si disponible ;
4. lance le frontend et ouvre le navigateur. Si le port 5173 est occupé, il utilise le prochain port libre.

Autre possibilité, depuis ce dossier :

```powershell
python serve.py --with-backend --open
```

Si vous lancez déjà le backend séparément :

```powershell
python serve.py --open
```

L’adresse imprimée est normalement http://localhost:5173, ou 5174 si un autre frontend tourne déjà.
Ctrl+C arrête le frontend et le backend qu’il a éventuellement lui-même démarré. Une API préexistante n’est jamais arrêtée.

## Proxy sans modification du backend

Le frontend appelle /api sur son propre serveur. serve.py transmet les GET au backend local. Il n’est donc pas nécessaire de modifier CORS, .env ou le code du backend. Les réponses 404/422/500 du backend sont préservées. Une API inaccessible donne 502. Le frontend n’utilise aucun identifiant MongoDB ou Neo4j.

Configuration frontend : config.js. Slug personnel : zhong-xucan. Le bouton engrenage permet de changer l’adresse et le slug. Les préférences sont propres à ce frontend.

## Profil personnel et données déjà en base

Au moment de la connexion, l’API retourne 404 pour zhong-xucan. Le frontend affiche alors explicitement le CV local et le signale ; son graphe est calculé localement. Cela n’est pas présenté comme une connexion réussie à la base.

Le bouton « Tester le profil d’exemple de l’équipe » charge lea-bernard depuis les vraies routes API et l’identifie clairement comme profil d’exemple. Ce profil n’est pas celui de ZHONG Xucan.

Aucun seed ni écriture en base n’est effectué. Une fois le profil personnel importé par l’équipe, choisir zhong-xucan dans la configuration et connecter l’API. L’import des données personnelles n’est pas réalisé par le frontend.

## API utilisées

| Vue | Route |
| --- | --- |
| Profil et parcours | GET /api/candidats/{slug} |
| Projets, filtres et pagination | GET /api/candidats/{slug}/projets?competence=...&domaine_slug=...&page=1&limit=6 |
| Statistiques | GET /api/candidats/{slug}/stats |
| Graphe | GET /api/graph/competences/{slug} |
| Détail et projets similaires | GET /api/projets/{slug} |
| Repli si le détail ne fournit pas les similaires | GET /api/graph/projets/{slug}/similaires?limit=5 |

Les modèles actuels sont lus sans les modifier : candidat_slug, skill_slug, domaine_slug, bio, debut/fin, ecole, projet_slug, réalisation, total_similaires et projets_similaires.
La recherche textuelle filtre les projets déjà chargés. Les filtres de compétence/domaine et la pagination sont transmis à l’API.

## Interface

Direction visuelle inspirée de https://creatiie.framer.website/ : collines, verre dépoli, étiquettes flottantes, dock d’icônes, papier quadrillé et cartes de projet inclinées. Le graphe reste sélectionnable, déplaçable et zoomable. FAQ, recherche, filtres, formations/expériences, modes jour/nuit et téléchargement du CV sont disponibles.

Le mode CV local reprend CV_ZHONG_2026.docx dans cv-data.json. Les illustrations SVG ne sont pas des captures de logiciels et sont marquées comme illustrations. Les aperçus API utilisent le titre et les outils réellement reçus, sans résultats chiffrés inventés.
Le paysage local provient de l’asset public du site de référence : https://framerusercontent.com/images/02RFtEx03DTNa37qOwrWcR7cP8.png.

Aucune compilation npm n’est nécessaire. Seules les polices Google Fonts nécessitent Internet ; une police système est prévue. Ne pas ouvrir index.html directement : utiliser le serveur Python.
