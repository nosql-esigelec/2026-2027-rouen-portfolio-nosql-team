// Nom affiché et couleur de chaque domaine (le seed Neo4j génère des noms sans accents)
export const DOMAINES = {
  'data-science': { nom: 'Data Science', color: '#2de2e6' },
  'data-viz': { nom: 'Data Viz', color: '#ffc93c' },
  web: { nom: 'Web', color: '#ff3d7f' },
  'bases-de-donnees': { nom: 'Bases de données', color: '#a78bfa' },
  'big-data': { nom: 'Big Data', color: '#ff8a3d' },
  langages: { nom: 'Langages', color: '#d4ff3a' },
  cloud: { nom: 'Cloud', color: '#60a5fa' },
  devops: { nom: 'DevOps', color: '#34d399' },
  methodes: { nom: 'Méthodes', color: '#f472b6' },
  langues: { nom: 'Langues', color: '#e5e7eb' },
}

const pretty = (slug) => slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export const domaineNom = (slug, fallback) => DOMAINES[slug]?.nom ?? fallback ?? pretty(slug)
export const domaineColor = (slug) => DOMAINES[slug]?.color ?? '#d4ff3a'

// Libellé d'un nœud du graphe R5 (corrige les noms de domaines)
export const nodeLabel = (node) =>
  node.type === 'Domaine' ? domaineNom(node.id.split(':')[1], node.label) : node.label
