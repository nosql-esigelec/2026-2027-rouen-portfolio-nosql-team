import { useState } from 'react'
import { Link } from 'react-router-dom'

const W = 520
const H = 520
const C = W / 2

// Carte orbitale des projets similaires (R4) : plus un projet partage de compétences, plus il est proche du centre
function OrbitMap({ source, items, max, hovered, setHovered, mine }) {
  const R_MIN = 105
  const R_MAX = 225
  const points = items.map((p, i) => {
    const angle = -Math.PI / 2 + (i / items.length) * Math.PI * 2
    const r = R_MAX - ((p.nombre_competences_communes - 1) / Math.max(1, max - 1)) * (R_MAX - R_MIN)
    return { ...p, x: C + Math.cos(angle) * r, y: C + Math.sin(angle) * r, r }
  })
  const orbits = [...new Set(points.map((p) => Math.round(p.r)))]

  return (
    <svg className="orbit-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Carte des projets voisins de ${source}`}>
      <defs>
        <radialGradient id="src-glow">
          <stop offset="0%" stopColor="var(--p)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--p)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {orbits.map((r) => (
        <circle key={r} cx={C} cy={C} r={r} className="orbit-map__orbit" />
      ))}
      {points.map((p) => (
        <line
          key={`l-${p.slug}`}
          x1={C}
          y1={C}
          x2={p.x}
          y2={p.y}
          className={`orbit-map__link ${hovered === p.slug ? 'is-on' : ''}`}
          strokeWidth={1 + p.nombre_competences_communes}
        />
      ))}
      <circle cx={C} cy={C} r={70} fill="url(#src-glow)" opacity="0.35" />
      <circle cx={C} cy={C} r={30} className="orbit-map__source" />
      <text x={C} y={C + 52} className="orbit-map__source-label">
        ce projet
      </text>
      {points.map((p) => (
        <Link key={p.slug} to={`/projets/${p.slug}`}>
          <g
            className={`orbit-map__node ${hovered === p.slug ? 'is-on' : ''} ${mine.has(p.slug) ? 'is-mine' : ''}`}
            onMouseEnter={() => setHovered(p.slug)}
            onMouseLeave={() => setHovered(null)}
          >
            <circle cx={p.x} cy={p.y} r={26} className="orbit-map__hit" />
            <circle cx={p.x} cy={p.y} r={8 + p.nombre_competences_communes * 3} className="orbit-map__planet" />
            <text x={p.x} y={p.y + 4} className="orbit-map__count">
              {p.nombre_competences_communes}
            </text>
            {mine.has(p.slug) && (
              <text x={p.x + 16 + p.nombre_competences_communes * 3} y={p.y - 10} className="orbit-map__star">
                ★
              </text>
            )}
          </g>
        </Link>
      ))}
    </svg>
  )
}

export default function Similaires({ data, limit, setLimit, mine, nomCompetence }) {
  const [hovered, setHovered] = useState(null)
  const items = data.projets_similaires
  const max = Math.max(1, ...items.map((p) => p.nombre_competences_communes))

  return (
    <div className="similaires">
      <div className="similaires__head">
        <div className="query-line">
          <span className="query-line__tag">R4</span>
          <code>
            GET /api/graph/projets/{data.projet_source}/similaires?limit={limit}
          </code>
          <b>
            → {items.length} affiché{items.length > 1 ? 's' : ''} sur {data.total}
          </b>
        </div>
        <div className="limit-picker" role="group" aria-label="Nombre de projets similaires">
          {[3, 5, 10].map((n) => (
            <button
              key={n}
              type="button"
              className={`fchip ${limit === n ? 'is-active' : ''}`}
              aria-pressed={limit === n}
              onClick={() => setLimit(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="muted">Aucun autre projet ne partage de compétence avec celui-ci.</p>
      ) : (
        <div className="similaires__body">
          <OrbitMap
            source={data.projet_source}
            items={items}
            max={max}
            hovered={hovered}
            setHovered={setHovered}
            mine={mine}
          />
          <ol className="voisins">
            {items.map((p) => (
              <li key={p.slug}>
                <Link
                  to={`/projets/${p.slug}`}
                  className={`voisin ${hovered === p.slug ? 'is-on' : ''}`}
                  onMouseEnter={() => setHovered(p.slug)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="voisin__score" aria-label={`${p.nombre_competences_communes} compétences communes`}>
                    {Array.from({ length: max }, (_, i) => (
                      <i key={i} className={i < p.nombre_competences_communes ? 'on' : ''} />
                    ))}
                  </span>
                  <span className="voisin__titre">
                    {mine.has(p.slug) && <b className="voisin__mine">★ Loïc</b>}
                    {p.titre}
                  </span>
                  <span className="voisin__communes">
                    {p.competences_communes.map((c) => nomCompetence(c)).join(' · ')}
                  </span>
                  <span className="voisin__go">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
