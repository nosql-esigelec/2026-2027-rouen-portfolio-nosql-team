// Couche d'accès à l'API d'équipe — une fonction par requête R1 à R8 (voir API_ROUTES.md)
import { API_URL } from '../config'

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail)
    this.status = status
  }
}

async function get(path, params = {}) {
  const url = new URL(path, API_URL)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.detail ?? `Erreur ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => get('/api/health'),

  // R1 — Profil + timeline (expériences, formations, compétences)
  getCandidat: (slug) => get(`/api/candidats/${slug}`),

  // R2 — Projets du candidat, filtrables par compétence (paginés)
  // R8 — même route avec domaine_slug : projets par domaine
  getProjetsCandidat: (slug, { competence, domaine_slug, page = 1, limit = 10 } = {}) =>
    get(`/api/candidats/${slug}/projets`, { competence, domaine_slug, page, limit }),

  // R3 — Statistiques par compétence (agrégation MongoDB)
  getStats: (slug) => get(`/api/candidats/${slug}/stats`),

  // R4 — Projets similaires (Neo4j)
  getProjetsSimilaires: (projetSlug, limit = 5) =>
    get(`/api/graph/projets/${projetSlug}/similaires`, { limit }),

  // R5 — Graphe de compétences (Neo4j) : { nodes, links }
  getGraphCompetences: (slug) => get(`/api/graph/competences/${slug}`),

  // R6 — Détail d'un projet (MongoDB + similaires Neo4j)
  getProjet: (projetSlug) => get(`/api/projets/${projetSlug}`),

  // R7 — Expérience professionnelle la plus récente
  getExperienceRecente: (slug) => get(`/api/candidats/${slug}/experiences/recente`),
}
