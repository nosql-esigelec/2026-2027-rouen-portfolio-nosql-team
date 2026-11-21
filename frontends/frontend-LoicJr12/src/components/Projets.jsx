import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ApiState from './ApiState'
import TiltCard from './TiltCard'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import { CANDIDAT_SLUG } from '../config'
import { formatMois } from '../utils/dates'
import { domaineColor, domaineNom } from '../content/domaines'

const PAGE_SIZE = 6

// Le domaine "langages" est présent partout : on préfère un domaine plus parlant pour la couleur
export function mainDomaine(projet) {
  return projet.domaine_slugs?.find((d) => d !== 'langages') ?? projet.domaine_slugs?.[0] ?? 'langages'
}

export function Planet({ color, index }) {
  return (
    <div className="planet" style={{ '--p': color, '--spin': `${14 + index * 3}s` }} aria-hidden="true">
      <span className="planet__glow" />
      <span className="planet__body" />
      <span className="planet__ring" />
      <span className="planet__moon" />
    </div>
  )
}

export function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"
      />
    </svg>
  )
}

function ProjetCard({ projet, index, noms }) {
  const domaine = mainDomaine(projet)
  const color = domaineColor(domaine)
  const { github, demo } = projet.liens ?? {}

  return (
    <TiltCard as="article" className="projet" style={{ '--p': color, '--d': `${index * 90}ms` }} max={6}>
      <div className="projet__top">
        <Planet color={color} index={index} />
        <div className="projet__meta">
          <span className="projet__num">{String(index + 1).padStart(2, '0')}</span>
          <span className="projet__dates">
            {formatMois(projet.date_debut)} → {formatMois(projet.date_fin)}
          </span>
        </div>
      </div>

      <p className="projet__contexte">{projet.contexte}</p>
      <h3 className="projet__titre">{projet.titre}</h3>
      <p className="projet__desc">{projet.description}</p>

      <ul className="projet__domaines">
        {projet.domaine_slugs?.map((d) => (
          <li key={d} style={{ '--p': domaineColor(d) }}>
            {domaineNom(d)}
          </li>
        ))}
      </ul>

      <ul className="chips">
        {(projet.technologies?.length ? projet.technologies : projet.competence_slugs.map((s) => noms[s] ?? s)).map(
          (t) => (
            <li key={t}>{t}</li>
          ),
        )}
      </ul>

      <footer className="projet__foot">
        <div className="projet__links">
          {github && (
            <a href={github} target="_blank" rel="noreferrer" className="icon-link">
              <GithubIcon /> Code
            </a>
          )}
          {demo && (
            <a href={demo} target="_blank" rel="noreferrer" className="icon-link">
              ↗ Démo
            </a>
          )}
          {!github && !demo && <span className="projet__prive">🔒 Mission en entreprise · code confidentiel</span>}
        </div>
        <Link to={`/projets/${projet.projet_slug}`} className="projet__explore">
          Explorer <span>→</span>
        </Link>
      </footer>
    </TiltCard>
  )
}

function FilterRow({ titre, route, options, value, onChange, colorOf }) {
  return (
    <div className="filter-row">
      <p className="filter-row__title">
        {titre} <code>{route}</code>
      </p>
      <div className="filter-row__chips">
        {options.map((o) => (
          <button
            key={o.slug}
            type="button"
            aria-pressed={value === o.slug}
            className={`fchip ${value === o.slug ? 'is-active' : ''}`}
            style={colorOf ? { '--p': colorOf(o.slug) } : undefined}
            onClick={() => onChange(value === o.slug ? null : o.slug)}
          >
            {colorOf && <i />}
            {o.nom} <span>{o.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Escale 03 — Projets : R2 (filtre compétence) + R8 (filtre domaine), avec pagination de l'API
export default function Projets({ catalogue, stats }) {
  const [competence, setCompetence] = useState(null)
  const [domaine, setDomaine] = useState(null)
  const [page, setPage] = useState(1)

  // Liste affichée : toujours demandée à l'API avec les filtres actifs
  const liste = useApi(
    () => api.getProjetsCandidat(CANDIDAT_SLUG, { competence, domaine_slug: domaine, page, limit: PAGE_SIZE }),
    [competence, domaine, page],
  )

  const noms = useMemo(
    () => Object.fromEntries((stats.data?.statistiques ?? []).map((s) => [s.competence_slug, s.nom])),
    [stats.data],
  )

  // Options des filtres (avec le nombre de projets) tirées du catalogue complet
  const { optDomaines, optCompetences } = useMemo(() => {
    const projets = catalogue.data?.projets ?? []
    const count = (key) => {
      const m = {}
      projets.forEach((p) => p[key]?.forEach((s) => (m[s] = (m[s] ?? 0) + 1)))
      return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    }
    return {
      optDomaines: count('domaine_slugs').map(([slug, c]) => ({ slug, count: c, nom: domaineNom(slug) })),
      optCompetences: count('competence_slugs').map(([slug, c]) => ({ slug, count: c, nom: noms[slug] ?? slug })),
    }
  }, [catalogue.data, noms])

  const setFiltre = (setter) => (v) => {
    setter(v)
    setPage(1)
  }

  const params = new URLSearchParams()
  if (competence) params.set('competence', competence)
  if (domaine) params.set('domaine_slug', domaine)
  if (page > 1) params.set('page', page)
  const requete = `GET /api/candidats/${CANDIDAT_SLUG}/projets${params.size ? `?${params}` : ''}`
  const requetes = [competence && 'R2', domaine && 'R8'].filter(Boolean).join(' + ') || 'R2'

  return (
    <section id="projets" className="stop projets-stop" style={{ '--c': 'var(--pink)' }}>
      <p className="eyebrow">Escale 03</p>
      <h2 className="stop__title">Projets</h2>
      <p className="stop__lead">
        Chaque projet est une planète. Filtre-les par domaine ou par compétence pour trouver ce qui t'intéresse.
      </p>

      <ApiState state={catalogue} route={`GET /api/candidats/${CANDIDAT_SLUG}/projets`}>
        {() => (
          <>
            <div className="filters-panel">
              <FilterRow
                titre="Domaines"
                route="R8 · ?domaine_slug="
                options={optDomaines}
                value={domaine}
                onChange={setFiltre(setDomaine)}
                colorOf={domaineColor}
              />
              <FilterRow
                titre="Compétences"
                route="R2 · ?competence="
                options={optCompetences}
                value={competence}
                onChange={setFiltre(setCompetence)}
              />
              <div className="query-line">
                <span className="query-line__tag">{requetes}</span>
                <code>{requete}</code>
                {liste.data && (
                  <b>
                    → {liste.data.pagination.total} résultat{liste.data.pagination.total > 1 ? 's' : ''}
                  </b>
                )}
                {(competence || domaine) && (
                  <button
                    type="button"
                    className="query-line__reset"
                    onClick={() => {
                      setCompetence(null)
                      setDomaine(null)
                      setPage(1)
                    }}
                  >
                    Réinitialiser ✕
                  </button>
                )}
              </div>
            </div>

            <ApiState state={liste} route={requete}>
              {(data) =>
                data.projets.length === 0 ? (
                  <div className="empty-space">
                    <p>Aucune planète ne correspond à ces deux filtres.</p>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setCompetence(null)
                        setDomaine(null)
                      }}
                    >
                      Revoir toute la galaxie
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="projets-grid" key={requete}>
                      {data.projets.map((p, i) => (
                        <ProjetCard
                          key={p.projet_slug}
                          projet={p}
                          index={(page - 1) * PAGE_SIZE + i}
                          noms={noms}
                        />
                      ))}
                    </div>
                    {data.pagination.total_pages > 1 && (
                      <nav className="pager" aria-label="Pagination des projets">
                        <button type="button" className="filter" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                          ← Précédent
                        </button>
                        <span>
                          Page {data.pagination.page} / {data.pagination.total_pages}
                        </span>
                        <button
                          type="button"
                          className="filter"
                          disabled={page >= data.pagination.total_pages}
                          onClick={() => setPage(page + 1)}
                        >
                          Suivant →
                        </button>
                      </nav>
                    )}
                  </>
                )
              }
            </ApiState>
          </>
        )}
      </ApiState>
    </section>
  )
}
