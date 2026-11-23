// Configuration centrale du portfolio (lue depuis .env via Vite)
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Le portfolio est dédié à un seul candidat : Loïc KAKOU
export const CANDIDAT_SLUG = import.meta.env.VITE_CANDIDAT_SLUG ?? 'loic-kakou'
