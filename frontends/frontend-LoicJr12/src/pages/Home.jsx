import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Universe from '../three/Universe'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import JourneyHUD from '../components/JourneyHUD'
import GuideBubble from '../components/GuideBubble'
import Parcours from '../components/Parcours'
import Competences from '../components/Competences'
import Projets from '../components/Projets'
import Contact from '../components/Contact'
import { useGuide } from '../journey/useGuide'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import { CANDIDAT_SLUG } from '../config'
import { FALLBACK_PROFILE } from '../content/fallback'
import { STOPS } from '../journey/stops'
import { startJourneyTracking } from '../journey/store'
import { useActiveStop } from '../journey/useActiveStop'

export default function Home() {
  useEffect(() => {
    startJourneyTracking()
  }, [])

  // Arrivée depuis une autre page avec une ancre (ex. /#projets) → on rejoint l'escale
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) return
    const id = setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }), 120)
    return () => clearTimeout(id)
  }, [location.hash, location.key])
  const active = useActiveStop()
  const bubbleRef = useRef()

  const candidat = useApi(() => api.getCandidat(CANDIDAT_SLUG)) // R1
  const recente = useApi(() => api.getExperienceRecente(CANDIDAT_SLUG)) // R7
  const catalogue = useApi(() => api.getProjetsCandidat(CANDIDAT_SLUG, { limit: 100 })) // R2 sans filtre : catalogue complet
  const stats = useApi(() => api.getStats(CANDIDAT_SLUG)) // R3
  const graph = useApi(() => api.getGraphCompetences(CANDIDAT_SLUG)) // R5

  const profil = { ...FALLBACK_PROFILE, ...(candidat.data ?? {}) }
  const chiffres = {
    projets: catalogue.data?.pagination.total,
    technos: stats.data?.total_competences_utilisees,
    experiences: candidat.data?.experiences?.length,
    formations: candidat.data?.formations?.length,
  }

  // Le robot peut citer les vraies données dans ses répliques
  const guide = useGuide(active, STOPS[active].lines, {
    candidat: candidat.data,
    recente: recente.data?.experience,
    chiffres,
    stats: stats.data,
    graph: graph.data,
    catalogue: catalogue.data,
  })

  return (
    <>
      <Universe guide={guide} bubbleRef={bubbleRef} />
      <GuideBubble ref={bubbleRef} text={guide.text} hasMore={guide.hasMore} onNext={guide.next} />
      <Navbar prenom={profil.prenom} nom={profil.nom} active={active} />
      <JourneyHUD active={active} />

      <main className="content">
        <Hero profil={profil} stats={chiffres} />
        <Parcours candidat={candidat} recente={recente} />
        <Competences graph={graph} stats={stats} candidat={candidat} />
        <Projets catalogue={catalogue} stats={stats} />

        <Contact candidat={candidat.data} />
      </main>
    </>
  )
}
