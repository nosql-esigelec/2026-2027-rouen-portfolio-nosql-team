import { useEffect, useRef } from 'react'
import Universe from '../three/Universe'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import JourneyHUD from '../components/JourneyHUD'
import GuideBubble from '../components/GuideBubble'
import { useGuide } from '../journey/useGuide'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import { CANDIDAT_SLUG } from '../config'
import { FALLBACK_PROFILE } from '../content/fallback'
import { STOPS } from '../journey/stops'
import { startJourneyTracking } from '../journey/store'
import { useActiveStop } from '../journey/useActiveStop'

export default function Home() {
  useEffect(() => startJourneyTracking(), [])
  const active = useActiveStop()
  const guide = useGuide(active)
  const bubbleRef = useRef()

  const candidat = useApi(() => api.getCandidat(CANDIDAT_SLUG)) // R1
  const projets = useApi(() => api.getProjetsCandidat(CANDIDAT_SLUG, { limit: 1 })) // R2 (juste le total)
  const stats = useApi(() => api.getStats(CANDIDAT_SLUG)) // R3

  const profil = { ...FALLBACK_PROFILE, ...(candidat.data ?? {}) }
  const chiffres = {
    projets: projets.data?.pagination.total,
    technos: stats.data?.total_competences_utilisees,
    experiences: candidat.data?.experiences?.length,
    formations: candidat.data?.formations?.length,
  }

  return (
    <>
      <Universe guide={guide} bubbleRef={bubbleRef} />
      <GuideBubble ref={bubbleRef} text={guide.text} hasMore={guide.hasMore} onNext={guide.next} />
      <Navbar prenom={profil.prenom} nom={profil.nom} active={active} />
      <JourneyHUD active={active} />

      <main className="content">
        <Hero profil={profil} stats={chiffres} />

        {/* Escales suivantes : contenu ajouté aux prochaines étapes */}
        {STOPS.slice(1).map((s, i) => (
          <section key={s.id} id={s.id} className="stop stop--placeholder" style={{ '--c': s.color }}>
            <p className="eyebrow">Escale {String(i + 1).padStart(2, '0')}</p>
            <h2 className="stop__title">{s.label}</h2>
            <p className="muted">En construction · prochaine étape</p>
          </section>
        ))}
      </main>
    </>
  )
}
