import { useParams, Link } from 'react-router-dom'

// Rempli à une étape suivante : R6 (détail) + R4 (projets similaires)
export default function ProjetDetail() {
  const { slug } = useParams()
  return (
    <main className="check">
      <Link to="/">← Retour</Link>
      <h1>Projet : {slug}</h1>
      <p className="muted">Page à construire (R6 + R4).</p>
    </main>
  )
}
