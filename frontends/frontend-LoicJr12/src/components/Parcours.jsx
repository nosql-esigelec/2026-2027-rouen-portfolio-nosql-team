import { useEffect, useMemo, useRef, useState } from 'react'
import ApiState from './ApiState'
import TiltCard from './TiltCard'
import { annee, compareDebutDesc, duree, enCours, formatMois } from '../utils/dates'
import { CANDIDAT_SLUG } from '../config'

const FILTRES = [
  { id: 'tout', label: 'Tout' },
  { id: 'experience', label: 'Expériences' },
  { id: 'formation', label: 'Formations' },
]

function Periode({ debut, fin }) {
  const live = enCours(fin)
  return (
    <span className="periode">
      {formatMois(debut)} → {live ? <b className="live">en cours</b> : formatMois(fin)}
      <i> · {duree(debut, live ? null : fin)}</i>
    </span>
  )
}

function Chips({ slugs, noms }) {
  if (!slugs?.length) return null
  return (
    <ul className="chips">
      {slugs.map((s) => (
        <li key={s}>{noms[s] ?? s}</li>
      ))}
    </ul>
  )
}

// R7 — la mission la plus récente, présentée comme une transmission entrante
function DerniereMission({ experience, noms }) {
  return (
    <TiltCard className="mission" max={5}>
      <div className="mission__radar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="mission__signal">
        <span className="eyebrow__dot" /> Transmission entrante · dernière mission
      </p>
      <h3 className="mission__poste">{experience.poste}</h3>
      <p className="mission__entreprise">@ {experience.entreprise}</p>
      <Periode debut={experience.debut} fin={experience.fin} />
      <p className="mission__desc">{experience.description}</p>
      <Chips slugs={experience.competences} noms={noms} />
    </TiltCard>
  )
}

// Fait apparaître les éléments [data-reveal] quand ils entrent à l'écran
function useReveal(rootRef, deps) {
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-reveal]') ?? []
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-revealed')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.2 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// Remplissage du rail en fonction du défilement
function useRailProgress(railRef) {
  useEffect(() => {
    let raf
    const tick = () => {
      const el = railRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        const p = (window.innerHeight * 0.6 - r.top) / r.height
        el.style.setProperty('--fill', Math.min(1, Math.max(0, p)).toFixed(3))
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [railRef])
}

function Timeline({ candidat, recente }) {
  const [filtre, setFiltre] = useState('tout')
  const root = useRef()
  const rail = useRef()

  const noms = useMemo(
    () => Object.fromEntries((candidat.competences ?? []).map((c) => [c.skill_slug, c.nom])),
    [candidat],
  )

  const items = useMemo(() => {
    const exps = (candidat.experiences ?? []).map((e) => ({ ...e, type: 'experience' }))
    const forms = (candidat.formations ?? []).map((f) => ({ ...f, type: 'formation' }))
    return [...exps, ...forms].sort(compareDebutDesc)
  }, [candidat])

  const visibles = items.filter((i) => filtre === 'tout' || i.type === filtre)
  const counts = {
    tout: items.length,
    experience: items.filter((i) => i.type === 'experience').length,
    formation: items.filter((i) => i.type === 'formation').length,
  }

  useReveal(root, [filtre, items])
  useRailProgress(rail)

  const estRecente = (i) =>
    recente && i.type === 'experience' && i.entreprise === recente.entreprise && i.debut === recente.debut

  let lastYear = null

  return (
    <div ref={root}>
      {recente && <DerniereMission experience={recente} noms={noms} />}

      <div className="filters" role="tablist" aria-label="Filtrer le parcours">
        {FILTRES.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filtre === f.id}
            className={`filter ${filtre === f.id ? 'is-active' : ''}`}
            onClick={() => setFiltre(f.id)}
          >
            {f.label} <span>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <ol ref={rail} className="rail">
        {visibles.map((item) => {
          const y = annee(item.debut)
          const showYear = y !== lastYear
          lastYear = y
          const isExp = item.type === 'experience'
          return (
            <li
              key={`${item.type}-${item.debut}-${isExp ? item.entreprise : item.ecole}`}
              className={`rail__item rail__item--${item.type}`}
              data-reveal
            >
              {showYear && <span className="rail__year">{y}</span>}
              <span className="rail__node" aria-hidden="true" />
              <TiltCard as="article" className="step">
                <header className="step__head">
                  <span className="step__type">{isExp ? 'Expérience' : 'Formation'}</span>
                  {estRecente(item) && <span className="step__badge">★ Dernière mission</span>}
                  {!isExp && enCours(item.fin) && <span className="step__badge step__badge--live">En cours</span>}
                </header>
                <h3 className="step__title">{isExp ? item.poste : item.diplome}</h3>
                <p className="step__org">{isExp ? item.entreprise : item.ecole}</p>
                <Periode debut={item.debut} fin={item.fin} />
                {isExp && <p className="step__desc">{item.description}</p>}
                {isExp && <Chips slugs={item.competences} noms={noms} />}
              </TiltCard>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// Escale 01 — Parcours : R1 (timeline) + R7 (expérience la plus récente)
export default function Parcours({ candidat, recente }) {
  return (
    <section id="parcours" className="stop parcours" style={{ '--c': 'var(--cyan)' }}>
      <p className="eyebrow">Escale 01</p>
      <h2 className="stop__title">Parcours</h2>
      <p className="stop__lead">
        Ses missions et ses formations, de la plus récente à la plus ancienne.
      </p>

      <ApiState state={candidat} route={`GET /api/candidats/${CANDIDAT_SLUG}`}>
        {(data) => <Timeline candidat={data} recente={recente.data?.experience ?? null} />}
      </ApiState>
    </section>
  )
}
