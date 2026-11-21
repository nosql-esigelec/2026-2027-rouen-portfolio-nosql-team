import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Universe from '../three/Universe'
import Navbar from '../components/Navbar'
import GuideBubble from '../components/GuideBubble'
import ApiState from '../components/ApiState'
import TiltCard from '../components/TiltCard'
import Similaires from '../components/Similaires'
import { GithubIcon, Planet, mainDomaine } from '../components/Projets'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import { CANDIDAT_SLUG } from '../config'
import { FALLBACK_PROFILE } from '../content/fallback'
import { domaineColor, domaineNom } from '../content/domaines'
import { DETAIL_LINES } from '../journey/stops'
import { journey, startJourneyTracking } from '../journey/store'
import { useGuide } from '../journey/useGuide'
import { duree, formatMois } from '../utils/dates'

const prettySlug = (slug) => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// "Python (Pandas, scikit-learn), API Flask et JavaScript" → ["Python (Pandas, scikit-learn)", "API Flask", "JavaScript"]
// On coupe sur les virgules et sur " et ", mais jamais à l'intérieur de parenthèses.
function splitArchitecture(text) {
  const blocs = []
  let courant = ''
  let profondeur = 0
  const src = text ?? ''
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === '(') profondeur++
    if (ch === ')') profondeur--
    const separateurEt = profondeur === 0 && src.slice(i, i + 4) === ' et '
    if ((ch === ',' && profondeur === 0) || separateurEt) {
      blocs.push(courant)
      courant = ''
      if (separateurEt) i += 3
      continue
    }
    courant += ch
  }
  blocs.push(courant)
  return blocs.map((b) => b.trim()).filter(Boolean)
}

function Architecture({ text }) {
  const blocs = splitArchitecture(text)
  return (
    <div className="archi" aria-label={`Architecture : ${text}`}>
      {blocs.map((b, i) => (
        <div key={b} className="archi__step" style={{ '--d': `${i * 120}ms` }}>
          <span className="archi__node">{b}</span>
          {i < blocs.length - 1 && <span className="archi__wire" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}

function Journal({ items }) {
  const root = useRef()
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('is-revealed')),
      { threshold: 0.3 },
    )
    root.current?.querySelectorAll('li').forEach((li) => io.observe(li))
    return () => io.disconnect()
  }, [items])

  return (
    <ol ref={root} className="journal">
      {items.map((r, i) => (
        <li key={r} style={{ '--d': `${i * 110}ms` }}>
          <span className="journal__check" aria-hidden="true">
            ✓
          </span>
          <span className="journal__num">{String(i + 1).padStart(2, '0')}</span>
          <p>{r}</p>
        </li>
      ))}
    </ol>
  )
}

function Fiche({ projet, noms, candidat }) {
  const domaine = mainDomaine(projet)
  const color = domaineColor(domaine)
  const { github, demo } = projet.liens ?? {}
  const estALoic = projet.candidat_slugs?.includes(CANDIDAT_SLUG)

  return (
    <article className="detail" style={{ '--p': color }}>
      {/* --- Atterrissage --- */}
      <header className="detail__hero">
        <Link to="/#projets" className="back">
          ← Retour à la galaxie
        </Link>
        <div className="detail__planet">
          <Planet color={color} index={2} />
        </div>
        <p className="eyebrow detail__eyebrow">
          <span className="eyebrow__dot" /> Atterrissage · {projet.contexte}
        </p>
        <h1 className="detail__titre">{projet.titre}</h1>
        <p className="detail__desc">{projet.description}</p>

        <div className="detail__facts">
          <span>
            <b>Période</b>
            {formatMois(projet.date_debut)} → {formatMois(projet.date_fin)}
          </span>
          <span>
            <b>Durée</b>
            {duree(projet.date_debut, projet.date_fin)}
          </span>
          <span>
            <b>Domaines</b>
            <span className="detail__doms">
              {projet.domaine_slugs?.map((d) => (
                <i key={d} style={{ '--p': domaineColor(d) }}>
                  {domaineNom(d)}
                </i>
              ))}
            </span>
          </span>
        </div>

        <div className="hero__ctas">
          {github && (
            <a className="btn btn--primary detail__btn" href={github} target="_blank" rel="noreferrer">
              <GithubIcon /> Voir le code
            </a>
          )}
          {demo && (
            <a className="btn btn--ghost" href={demo} target="_blank" rel="noreferrer">
              ↗ Voir la démo
            </a>
          )}
          {!github && !demo && <span className="projet__prive">🔒 Mission en entreprise · code confidentiel</span>}
        </div>
      </header>

      {/* --- Bord : architecture, réalisations, stack --- */}
      <div className="detail__grid">
        <TiltCard className="panel panel--wide" max={3}>
          <p className="panel__kicker">Architecture</p>
          <Architecture text={projet.architecture} />
        </TiltCard>

        <TiltCard className="panel panel--tall" max={3}>
          <p className="panel__kicker">Journal de mission · réalisations</p>
          <Journal items={projet['réalisation'] ?? []} />
        </TiltCard>

        <TiltCard className="panel" max={4}>
          <p className="panel__kicker">Technologies</p>
          <ul className="chips">
            {projet.technologies?.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="panel__kicker panel__kicker--gap">Compétences mobilisées</p>
          <ul className="chips chips--comp">
            {projet.competence_slugs?.map((c) => (
              <li key={c}>{noms[c] ?? prettySlug(c)}</li>
            ))}
          </ul>
        </TiltCard>

        <TiltCard className="panel" max={4}>
          <p className="panel__kicker">Équipage</p>
          <ul className="crew">
            {projet.candidat_slugs?.map((s) => (
              <li key={s} className={s === CANDIDAT_SLUG ? 'is-me' : ''}>
                <span className="crew__avatar">
                  {(s === CANDIDAT_SLUG ? `${candidat.prenom} ${candidat.nom}` : prettySlug(s))
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                {s === CANDIDAT_SLUG ? `${candidat.prenom} ${candidat.nom}` : prettySlug(s)}
              </li>
            ))}
          </ul>
          {!estALoic && <p className="crew__note">Ce projet n'est pas l'un de ceux de Loïc : tu explores une planète voisine.</p>}
        </TiltCard>

        {projet.medias?.length > 0 && (
          <div className="panel panel--wide">
            <p className="panel__kicker">Médias</p>
            <div className="medias">
              {projet.medias.map((m) => (
                <figure key={m.url}>
                  <img
                    src={m.url}
                    alt={m.description}
                    loading="lazy"
                    onError={(e) => e.currentTarget.closest('figure').classList.add('is-broken')}
                  />
                  <figcaption>{m.description}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

// Page /projets/:slug — R6 (détail MongoDB) + R4 (projets similaires Neo4j)
export default function ProjetDetail() {
  const { slug } = useParams()
  const bubbleRef = useRef()
  const [limit, setLimit] = useState(5)

  useEffect(() => {
    startJourneyTracking()
    journey.forceCorner = true // sur la page d'un projet, Nova reste dans son coin
    return () => {
      journey.forceCorner = false
    }
  }, [])
  // Accolades obligatoires : dans Chrome récent, scrollTo() renvoie une Promise,
  // que React prendrait pour une fonction de nettoyage ("destroy is not a function").
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [slug])

  const projet = useApi(() => api.getProjet(slug), [slug]) // R6
  const similaires = useApi(() => api.getProjetsSimilaires(slug, limit), [slug, limit]) // R4
  const candidat = useApi(() => api.getCandidat(CANDIDAT_SLUG)) // R1 : nom + noms des compétences
  const catalogue = useApi(() => api.getProjetsCandidat(CANDIDAT_SLUG, { limit: 100 })) // R2 : repérer les projets de Loïc

  const profil = { ...FALLBACK_PROFILE, ...(candidat.data ?? {}) }
  const mine = useMemo(() => new Set((catalogue.data?.projets ?? []).map((p) => p.projet_slug)), [catalogue.data])
  const noms = useMemo(
    () => Object.fromEntries((candidat.data?.competences ?? []).map((c) => [c.skill_slug, c.nom])),
    [candidat.data],
  )

  const guide = useGuide(`projet:${slug}`, DETAIL_LINES, { projet: projet.data, similaires: similaires.data, erreur: projet.error })

  useEffect(() => {
    if (projet.data) document.title = `${projet.data.titre} — Portfolio de Loïc KAKOU`
    return () => {
      document.title = 'Loïc KAKOU — Portfolio'
    }
  }, [projet.data])

  return (
    <>
      <Universe guide={guide} bubbleRef={bubbleRef} />
      <GuideBubble ref={bubbleRef} text={guide.text} hasMore={guide.hasMore} onNext={guide.next} />
      <Navbar prenom={profil.prenom} nom={profil.nom} />

      <main className="content detail-page">
        <ApiState state={projet} route={`GET /api/projets/${slug}`}>
          {(p) => (
            <>
              <div className="query-line query-line--top">
                <span className="query-line__tag">R6</span>
                <code>GET /api/projets/{slug}</code>
              </div>
              <Fiche projet={p} noms={noms} candidat={profil} />

              <section className="detail__voisins" style={{ '--c': 'var(--cyan)', '--p': domaineColor(mainDomaine(p)) }}>
                <p className="eyebrow">Planètes voisines · Neo4j</p>
                <h2 className="stop__title stop__title--sm">Projets similaires</h2>
                <p className="stop__lead">
                  Les projets qui partagent des compétences avec celui-ci (relation <code>UTILISE</code> du graphe).
                </p>
                <ApiState state={similaires} route={`GET /api/graph/projets/${slug}/similaires?limit=${limit}`}>
                  {(d) => (
                    <Similaires
                      data={d}
                      limit={limit}
                      setLimit={setLimit}
                      mine={mine}
                      nomCompetence={(c) => noms[c] ?? prettySlug(c)}
                    />
                  )}
                </ApiState>
              </section>
            </>
          )}
        </ApiState>
        {projet.error && (
          <Link to="/#projets" className="btn btn--ghost back-btn">
            ← Retour aux projets
          </Link>
        )}
      </main>
    </>
  )
}
