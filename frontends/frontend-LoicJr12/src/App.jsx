import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import ProjetDetail from './pages/ProjetDetail'

// Structure des pages (remplies étape par étape) :
//  /                 → expérience principale : hero 3D, parcours (R1, R7), projets (R2, R8),
//                      stats (R3), graphe de compétences (R5)
//  /projets/:slug    → détail d'un projet (R6) + projets similaires (R4)
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projets/:slug" element={<ProjetDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
