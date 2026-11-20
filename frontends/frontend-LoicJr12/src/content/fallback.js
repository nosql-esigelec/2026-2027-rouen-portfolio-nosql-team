// Valeurs affichées tant que l'API (R1) ne répond pas ou que la fiche n'est pas encore seedée.
// Dès que /api/candidats/loic-kakou répond, ce sont les vraies données qui s'affichent.
export const FALLBACK_PROFILE = {
  prenom: 'Loïc',
  nom: 'KAKOU',
  titre: 'Data Analyst · Développeur web',
  bio: 'Je transforme de gros volumes de données en décisions, et je construis les outils web pour les explorer.',
}
