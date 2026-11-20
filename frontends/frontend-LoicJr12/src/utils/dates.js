// Outils de dates pour le format "AAAA-MM" de l'API
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

const toIndex = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + (m - 1)
}

export function formatMois(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return `${MOIS[m - 1]} ${y}`
}

export function annee(ym) {
  return ym ? ym.slice(0, 4) : ''
}

export function enCours(fin) {
  if (!fin) return true
  const now = new Date()
  return toIndex(fin) >= now.getFullYear() * 12 + now.getMonth()
}

// Durée lisible : "3 mois", "2 ans", "2 ans 9 mois" (bornes incluses)
export function duree(debut, fin) {
  if (!debut) return ''
  const now = new Date()
  const end = fin ? toIndex(fin) : now.getFullYear() * 12 + now.getMonth()
  const total = end - toIndex(debut) + 1
  const ans = Math.floor(total / 12)
  const mois = total % 12
  const parts = []
  if (ans) parts.push(`${ans} an${ans > 1 ? 's' : ''}`)
  if (mois) parts.push(`${mois} mois`)
  return parts.join(' ') || '1 mois'
}

export function compareDebutDesc(a, b) {
  return (b.debut ?? '').localeCompare(a.debut ?? '')
}
