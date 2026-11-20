// Valeurs affichées tant que l'API (R1) ne répond pas ou que la fiche n'est pas encore seedée.
// Dès que /api/candidats/loic-kakou répond, ce sont les vraies données qui s'affichent.
export const FALLBACK_PROFILE = {
  prenom: 'Loïc',
  nom: 'KAKOU',
  titre: 'Élève-ingénieur Big Data — ESIGELEC',
  bio: "Étudiant ingénieur spécialisé en Big Data, passionné par l'analyse et la valorisation des données, les modèles prédictifs et le développement web.",
}
