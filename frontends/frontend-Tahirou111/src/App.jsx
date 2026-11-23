import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen,
  BriefcaseBusiness, Check, ChevronDown, Code2, Command, Compass, Cpu, Database,
  ExternalLink, Filter, Github, GraduationCap, Layers3, Linkedin, Mail, Menu,
  MousePointer2, Network, Play, Plus, Minus, Scan, Sparkles, Terminal,
  Workflow, X, Zap,
} from 'lucide-react'

const SLUG = (import.meta.env.VITE_CANDIDAT_SLUG || '').trim()
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const SECTIONS = [
  { id: 'accueil', label: 'Accueil', number: '00' },
  { id: 'parcours', label: 'Parcours', number: '01' },
  { id: 'competences', label: 'Compétences', number: '02' },
  { id: 'projets', label: 'Projets', number: '03' },
  { id: 'reseau', label: 'Réseau', number: '04' },
  { id: 'contact', label: 'Contact', number: '05' },
]
const ICONS = [Code2, Database, Network, Workflow, Cpu, Layers3]
const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
function dateShort(value, fallback = 'Aujourd’hui') {
  if (!value) return fallback
  const date = new Date(/^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value)
  return Number.isFinite(date.getTime()) ? monthFormatter.format(date) : 'Date non renseignée'
}
const titleCase = (text) => (text || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const safeExternal = (url) => typeof url === 'string' && /^https:\/\//i.test(url) && !/\.example\.(com|org|net)(?:\/|$)/i.test(url)
const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })

async function getJson(path, signal) {
  const response = await fetch(`${API_BASE}${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Erreur API ${response.status}`)
  return response.json()
}

const PROJECT_PAGE_SIZE = 6
const INTRO_DURATION_MS = 4000
const INTRO_SIGNAL_COUNT = 7

function useEndpoint(path) {
  const [result, setResult] = useState(null)
  useEffect(() => {
    setResult(null)
    if (!path) return
    const controller = new AbortController()
    getJson(path, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setResult({ path, data })
      })
      .catch(error => {
        if (!controller.signal.aborted) setResult({ path, error: error.message })
      })
    return () => controller.abort()
  }, [path])
  return result?.path === path ? result : { loading: Boolean(path) }
}

function usePortfolio(slug) {
  const [data, setData] = useState(null)
  const [mode, setMode] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(a => a + 1), [])

  useEffect(() => {
    setData(null)
    setError('')
    if (!slug) {
      setMode('error')
      setError('Indique ton candidat_slug dans le fichier .env (VITE_CANDIDAT_SLUG).')
      return
    }
    let mounted = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    setMode('loading')
    getJson(`/api/portfolio/${encodeURIComponent(slug)}?limit=100`, controller.signal)
      .catch(async error => {
        if (controller.signal.aborted) throw error
        const root = `/api/candidats/${encodeURIComponent(slug)}`
        const candidat = await getJson(root, controller.signal)
        const [projects, stats] = await Promise.allSettled([
          getJson(`${root}/projets?limit=100`, controller.signal),
          getJson(`${root}/stats`, controller.signal),
        ])
        const timeline = [
          ...(candidat.experiences ?? []).map(item => ({
            ...item, type: 'experience', titre: item.poste, organisation: item.entreprise,
          })),
          ...(candidat.formations ?? []).map(item => ({
            ...item, type: 'formation', titre: item.diplome, organisation: item.ecole,
          })),
        ].sort((a, b) => b.debut.localeCompare(a.debut))
        return {
          candidat, timeline,
          projets: projects.value ?? { projets: [] },
          stats: stats.value ?? {},
        }
      })
      .then(payload => {
        if (!mounted) return
        if (!payload?.candidat?.candidat_slug || !payload?.projets || !payload?.stats) {
          throw new Error('La réponse API ne respecte pas le contrat /api/portfolio/{slug}.')
        }
        setData(payload)
        setMode('live')
      })
      .catch(err => {
        if (!mounted) return
        setMode('error')
        const reason = err.name === 'AbortError'
          ? 'Délai dépassé : le backend FastAPI ne répond pas.'
          : err.message === 'Failed to fetch'
            ? 'Impossible de joindre le backend FastAPI. Vérifie que just dev est lancé.'
            : err.message
        setError(reason)
      })
      .finally(() => clearTimeout(timeout))
    return () => { mounted = false; controller.abort(); clearTimeout(timeout) }
  }, [slug, attempt])
  return { data, mode, error, retry }
}

function useReveal(dependency) {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-visible')); return }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target) } })
    }, { threshold: .08, rootMargin: '0px 0px -22px 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [dependency])
}

function NetworkField({ intro = false }) {
  const canvas = useRef(null)
  useEffect(() => {
    const el = canvas.current
    const ctx = el.getContext('2d')
    if (!ctx) return
    let width = 0, height = 0, raf = 0, points = []
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const resize = () => {
      const rect = el.getBoundingClientRect(); width = rect.width; height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(width, height, 1))
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(65, Math.max(28, Math.round(width * height / 19500)))
      points = Array.from({ length: count }, (_, i) => ({
        x: ((i * 83.13 + (i * i * 31.9)) % 997) / 997 * width,
        y: ((i * 163.71 + (i * i * 49.21)) % 991) / 991 * height,
        sx: (i % 3 - 1) * .15, sy: (i % 5 - 2) * .07,
        r: i % 9 === 0 ? 2 : 1,
      }))
    }
    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      points.forEach((p, i) => {
        if (!reduce) { p.x += p.sx; p.y += p.sy; if (p.x < 0 || p.x > width) p.sx *= -1; if (p.y < 0 || p.y > height) p.sy *= -1 }
        for (let j = i + 1; j < points.length; j++) {
          const q = points[j]; const dx = p.x - q.x, dy = p.y - q.y, dist = Math.hypot(dx, dy)
          if (dist < (intro ? 165 : 133)) {
            ctx.beginPath(); ctx.strokeStyle = intro ? `rgba(155, 107, 255, ${(.22 * (1 - dist / 165)).toFixed(3)})` : `rgba(78, 116, 211, ${(.14 * (1 - dist / 133)).toFixed(3)})`
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
          }
        }
        ctx.beginPath(); ctx.fillStyle = i % 5 === 0 ? 'rgba(208, 93, 255, .75)' : 'rgba(81, 210, 248, .6)'
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI); ctx.fill()
      })
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    const redraw = () => {
      cancelAnimationFrame(raf)
      resize()
      draw()
    }
    redraw()
    window.addEventListener('resize', redraw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', redraw)
    }
  }, [intro])
  return <canvas ref={canvas} className={`network-field ${intro ? 'network-field-intro' : ''}`} aria-hidden="true" />
}

function PortfolioIntro() {
  return <div className="intro-gate">
    <NetworkField intro />
    <div className="intro-noise" />
    <div className="intro-top"><span className="brand-mark">// NX</span><span>EXPÉRIENCE INTERACTIVE <span className="bright-dot">●</span></span></div>
    <div className="intro-core" style={{ '--intro-duration': INTRO_DURATION_MS + 'ms' }}>
      <div className="intro-orb" aria-hidden="true"><div className="orb-ring orb-ring-one" /><div className="orb-ring orb-ring-two" /><div className="orb-center"><Scan size={28} strokeWidth={1.4} /></div></div>
      <h1 className="intro-heading">Chargement de mon profil<br /><em>en cours</em></h1>
      <p className="intro-subline" role="status">Quelque chose de grand se prépare…</p>
      <div className="intro-signals" aria-hidden="true" style={{ '--signal-count': INTRO_SIGNAL_COUNT }}>
        {Array.from({ length: INTRO_SIGNAL_COUNT }, (_, index) => (
          <span key={index} className="intro-signal" />
        ))}
      </div>
      <div className="intro-loader" aria-hidden="true"><span /></div>
    </div>
    <span className="intro-index">01 / UNE EXPLORATION PERSONNELLE</span>
    <span className="intro-corner">© 2026 · PORTFOLIO</span>
  </div>
}

function SectionHeading({ index, kicker, title, description, right }) {
  return <div className="section-heading" data-reveal>
    <div className="section-title-block"><span className="eyebrow"><span className="eyebrow-line" /> {index} / {kicker}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {right && <div className="section-heading-extra">{right}</div>}
  </div>
}

function Hero({ candidat, stats, projects, onHelp, mode }) {
  const fullName = `${candidat.prenom} ${candidat.nom}`
  const initials = `${candidat.prenom?.[0] || ''}${candidat.nom?.[0] || ''}`
  const intro = candidat.presentation?.accroche || candidat.bio || 'Du code, de la data et des projets à explorer.'
  return <section className="hero section-shell" id="accueil" aria-label="Présentation">
    <div className="hero-glow hero-glow-purple"/><div className="hero-glow hero-glow-blue" />
    <div className="hero-copy" data-reveal>
      <div className="hero-kicker"><span className="online-pulse" /> PORTFOLIO / <span>ESPACE PERSONNEL</span></div>
      <h1 className="hero-name"><span>Bonjour, je suis</span><strong>{candidat.prenom}<br/><em>{candidat.nom}.</em></strong></h1>
      <div className="hero-role"><span className="typing-marker">&gt;</span> {candidat.titre}<span className="cursor-blink">_</span></div>
      <p className="hero-description">{intro}</p>
      <div className="hero-actions">
        <button className="primary-button" onClick={() => goTo('projets')}>Explorer mes projets <ArrowUpRight size={18}/></button>
        <button className="ghost-button" onClick={() => goTo('parcours')}>Découvrir mon parcours <ArrowDown size={17}/></button>
      </div>
      <div className="hero-meta"><span><span className="tiny-spark">✦</span> Explorer au scroll</span><button onClick={onHelp} className="keyboard-hint"><kbd>?</kbd> Raccourcis clavier</button></div>
    </div>
    <div className="hero-dashboard" data-reveal>
      <div className="dashboard-scan">ID // {candidat.candidat_slug.toUpperCase()}</div>
      <div className="holo-avatar" aria-hidden="true"><div className="holo-circles ring-a"/><div className="holo-circles ring-b"/><div className="holo-crosshair hcx-1"/><div className="holo-crosshair hcx-2"/>
        {safeExternal(candidat.presentation?.photo_url)
          ? <img className="avatar-photo" src={candidat.presentation.photo_url} alt="" />
          : <div className="avatar-initials">{initials}</div>}
        <span className="avatar-planet planet-one" /><span className="avatar-planet planet-two" />
      </div>
      <div className="dashboard-label"><div><span className="live-line"><span className="online-pulse"/> PROFIL ACTIF</span><strong>{fullName}</strong><small>{candidat.titre}</small></div><div className="id-icon"><Cpu size={19} /></div></div>
      <div className="dashboard-metrics">
        <div><strong>{stats.total_projets ?? projects.length}</strong><span>PROJETS</span></div>
        <div><strong>{candidat.competences.length}</strong><span>COMPÉTENCES</span></div>
        <div><strong>{candidat.experiences.length + candidat.formations.length}</strong><span>ÉTAPES</span></div>
      </div>
      <span className="dashboard-sideword">CONNECTED // {mode === 'live' ? 'API' : 'HORS LIGNE'}</span>
    </div>
    <button className="hero-scroll-cue" onClick={() => goTo('parcours')}><span>SCROLL TO DISCOVER</span><span className="scroll-indicator"><ChevronDown size={16}/></span></button>
  </section>
}

function Timeline({ timeline, slug }) {
  const { data } = useEndpoint(`/api/candidats/${encodeURIComponent(slug)}/experiences/recente`)
  const latest = data?.experience
  const [filter, setFilter] = useState('tout')
  useReveal(filter)
  const items = timeline.filter(item => filter === 'tout' || item.type === filter)
  return <section className="content-section section-shell" id="parcours">
    <SectionHeading index="01" kicker="L'HISTOIRE" title={<>Un parcours en <em>construction.</em></>} description="Des premières découvertes aux défis les plus récents. Chaque étape façonne la suite." right={<div className="filter-pills" role="group" aria-label="Filtrer le parcours">{[['tout', 'Tout'], ['experience', 'Expériences'], ['formation', 'Formations']].map(([key,label])=><button key={key} onClick={()=>setFilter(key)} className={filter===key?'active':''}>{label}</button>)}</div>} />
    <div className="timeline-layout"><div className="timeline-aside" data-reveal><span className="aside-index">01:EXPERIENCE.LOG</span><h3>Apprendre.<br/>Construire.<br/><em>Évoluer.</em></h3><p>Un chemin qui mêle formation technique, expériences et envie d'aller plus loin.</p>{latest && <article className="latest-experience">
        <span><BriefcaseBusiness size={16}/> Dernière expérience</span>
        <strong>{latest.poste}</strong>
        <p>{latest.entreprise} · {dateShort(latest.debut)} à {dateShort(latest.fin)}</p>
      </article>}<div className="timeline-aside-decoration"><Terminal size={26}/><span>HISTORY IS STILL<br/>BEING WRITTEN<span className="cursor-blink">_</span></span></div></div>
      <div className="timeline-list" aria-label="Chronologie du parcours">{items.length === 0 ? <p>Aucune étape renseignée pour le moment.</p> : items.map((item,i)=><article className="timeline-item" key={`${item.type}-${item.debut}-${i}`} data-reveal><div className="timeline-pin"/><div className="timeline-card"><span className="timeline-type">{item.type==='formation'?<GraduationCap size={15}/>:<BriefcaseBusiness size={15}/>} {item.type==='formation'?'FORMATION':'EXPÉRIENCE'}<span className="timeline-count">0{i+1}</span></span><h3>{item.titre}</h3><p className="timeline-org">{item.organisation}</p><p className="timeline-date">{dateShort(item.debut)} — {dateShort(item.fin)}</p>{item.description && <p className="timeline-description">{item.description}</p>}</div></article>)}</div>
    </div>
  </section>
}

function levelText(level) { return level ? `Niveau ${level}/5` : 'Niveau non renseigné' }
function projectHref(candidateSlug, projectSlug, from) {
  const params = new URLSearchParams({ slug: candidateSlug, projet: projectSlug })
  if (from) params.set('depuis', from)
  return `?${params}`
}
function SkillLab({ candidat, projects, slug, selected, setSelected }) {
  const skills = candidat.competences || []

  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [loading, setLoading] = useState(false)
  const active = detail?.competence || skills.find(s => s.skill_slug===selected)

  useEffect(() => {
    if (!selected) return
    let alive = true; const ctrl = new AbortController(); setLoading(true); setDetail(null); setDetailError('')
    getJson(`/api/portfolio/${encodeURIComponent(slug)}/competences/${encodeURIComponent(selected)}`, ctrl.signal)
      .then(payload=> { if(alive) setDetail(payload) }).catch(err=>{ if(alive) setDetailError(`Fiche indisponible : ${err.message}`) })
      .finally(()=> { if(alive) setLoading(false) })
    return () => { alive=false; ctrl.abort() }
  }, [selected, slug])
  const linkedProjects = detail?.projets || projects.filter(p => p.competence_slugs?.includes(selected))
  const linkedExperiences = detail?.experiences || (candidat.experiences ?? []).filter(e => e.competences?.includes(selected))
  const domain = active?.domaine_slug || 'exploration'
  return <section className="content-section section-shell" id="competences">
    <SectionHeading index="02" kicker="LE LABORATOIRE" title={<>Mon univers <em>technique.</em></>} description="Chaque compétence est une porte d'entrée. Sélectionne-en une pour voir ce qu'elle révèle." right={<span className="section-count"><Sparkles size={15}/> {skills.length} COMPÉTENCES À EXPLORER</span>}/>
    <div className="skill-lab" data-reveal><div className="skills-board"><div className="board-topline"><span>SKILL_EXPLORER</span><span className="board-pulse"><span className="online-pulse"/> INTERACTIF</span></div><div className="skill-orbit-art" aria-hidden="true"><span className="orbit-inner"/><span className="orbit-out"/><span className="orbit-center">✳</span></div><div className="skills-list" aria-label="Choisir une compétence">{skills.map((skill,i)=><button key={skill.skill_slug} data-slug={skill.skill_slug} className={`skill-chip ${selected===skill.skill_slug?'selected':''}`} onClick={()=>setSelected(skill.skill_slug)} aria-pressed={selected===skill.skill_slug}><span className="skill-chip-number">{String(i+1).padStart(2,'0')}</span>{skill.nom}<span className="skill-chip-dot"/></button>)}</div><p className="board-footnote"><MousePointer2 size={14}/> CLIQUER OU UTILISER TAB + ENTRÉE</p></div>
      <div className="skill-detail" aria-live="polite"><div className="detail-top"><span>FICHE / COMPÉTENCE</span><span className="detail-square"><Code2 size={18}/></span></div>{active ? <><div className="detail-icon"><Zap size={28}/></div><div className="detail-overline">{titleCase(domain)}</div><h3>{active.nom}<span className="dot-title">.</span></h3><p>{active.description || `Une compétence mobilisée dans mon parcours et mes réalisations. Découvrez les projets et les expériences associés.`}</p><div className="level-bar-header"><span>MAÎTRISE DÉCLARÉE</span><span>{levelText(active.niveau)}</span></div><div className="level-track"><span style={{width:`${Math.min(100,(active.niveau||0)*20)}%`}}/></div><div className="related-head">PROJETS ASSOCIÉS <span>{linkedProjects.length}</span></div>{linkedProjects.length ? <div className="related-list">{linkedProjects.slice(0,4).map(p=><a key={p.projet_slug} href={projectHref(slug, p.projet_slug)}><span>{p.titre}</span><ArrowUpRight size={16}/></a>)}</div> : <p className="related-empty">Pas encore de projet associé.</p>}{linkedExperiences.length>0 && <div className="related-experience"><BriefcaseBusiness size={14}/>{linkedExperiences.length} expérience{linkedExperiences.length>1?'s':''} associée{linkedExperiences.length>1?'s':''}</div>}</>:<p>Les compétences apparaîtront ici dès qu'elles seront enregistrées dans ton CV.</p>}{detailError && <p className="api-error-inline" role="alert">{detailError} (projets du profil affichés)</p>}<span className="detail-bottom-line">{loading ? 'SYNCHRONISATION DES DONNÉES…' : 'DATA SOURCE // API FASTAPI'}</span></div>
    </div>
  </section>
}

function ProjectArt({ index, title }) {
  const Icon = ICONS[index % ICONS.length]
  return <div className={`project-art project-art-${index % 5}`} aria-hidden="true"><div className="project-art-grid"/><span className="project-art-gridline artline-one"/><span className="project-art-gridline artline-two"/><div className="project-art-emblem"><Icon size={55} strokeWidth={1.05}/></div><div className="art-corner art-corner-tl"/><div className="art-corner art-corner-br"/><span className="project-art-label">SYS:{title.replace(/\W+/g,'_').toUpperCase().slice(0,18)}</span></div>
}
function Projects({ projects, candidat, slug, stats }) {
  const [domain, setDomain] = useState('')
  const [skill, setSkill] = useState('')
  const [page, setPage] = useState(1)
  const candidatePath = `/api/candidats/${encodeURIComponent(slug)}`
  const { data: liveStats } = useEndpoint(`${candidatePath}/stats`)
  const statistics = liveStats?.statistiques ?? stats.statistiques ?? []
  const skills = new Map((candidat.competences ?? []).map(item => [item.skill_slug, item.nom]))
  statistics.forEach(item => skills.set(item.competence_slug, item.nom))
  const domains = [...new Set(projects.flatMap(project => project.domaine_slugs ?? []))]
  const query = new URLSearchParams({ page, limit: PROJECT_PAGE_SIZE })
  if (domain) query.set('domaine_slug', domain)
  if (skill) query.set('competence', skill)
  const { data, loading, error } = useEndpoint(`${candidatePath}/projets?${query}`)
  const local = projects.filter(project =>
    (!domain || project.domaine_slugs?.includes(domain)) &&
    (!skill || project.competence_slugs?.includes(skill))
  )
  const total = data?.pagination.total ?? local.length
  const pages = data?.pagination.total_pages ?? Math.ceil(local.length / PROJECT_PAGE_SIZE)
  const visible = data?.projets ?? local.slice((page - 1) * PROJECT_PAGE_SIZE, page * PROJECT_PAGE_SIZE)
  const maxCount = Math.max(1, ...statistics.map(item => item.nombre_projets))

  function selectSkill(value) {
    setSkill(value)
    setPage(1)
  }

  return <section className="content-section section-shell" id="projets">
    <SectionHeading index="03" kicker="LE PORTFOLIO" title={<>Des idées devenues <em>réelles.</em></>}
      description="Explore les réalisations par domaine ou suis une technologie à travers plusieurs projets."
      right={<span className="section-count"><Layers3 size={16}/>{total} PROJETS</span>}/>
    {statistics.length > 0 && <div className="project-telemetry">
      <h3>Compétences en action</h3>
      <div className="telemetry-grid">
        {statistics.slice(0, 8).map(item => <button key={item.competence_slug}
          aria-pressed={skill === item.competence_slug}
          onClick={() => selectSkill(skill === item.competence_slug ? '' : item.competence_slug)}>
          <span>{item.nom}</span><small>{item.nombre_projets} projet{item.nombre_projets === 1 ? '' : 's'}</small>
          <span className="telemetry-track" aria-hidden="true"><span style={{ width: `${item.nombre_projets / maxCount * 100}%` }}/></span>
        </button>)}
      </div>
    </div>}
    <div className="project-controls">
      <label>Domaine<select value={domain} onChange={event => { setDomain(event.target.value); setPage(1) }}>
        <option value="">Tous les domaines</option>
        {domains.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}
      </select></label>
      <label>Compétence<select value={skill} onChange={event => selectSkill(event.target.value)}>
        <option value="">Toutes les compétences</option>
        {[...skills].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
    <p className="project-status" role="status">{loading ? 'Recherche des projets…' : error ? 'Catalogue indisponible. Affichage des projets déjà chargés.' : `${total} projet${total === 1 ? '' : 's'}`}</p>
    <div className="projects-grid" aria-busy={loading}>{visible.map((project, index) =>
      <a key={project.projet_slug} className="project-card" href={projectHref(slug, project.projet_slug, 'projets')}>
        <ProjectArt index={index} title={project.titre}/>
        <div className="project-card-content">
          <h3>{project.titre}</h3><p>{project.description}</p>
          <div className="project-stack">{(project.technologies ?? []).slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div>
        </div>
      </a>
    )}{!loading && visible.length === 0 && <div className="empty-filter">Aucun projet pour ces filtres.</div>}</div>
    {(pages > 1 || page > 1) && <nav className="project-pagination" aria-label="Pages des projets">
      <button disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Précédent</button>
      <span>Page {page}{pages >= page ? ` / ${pages}` : ''}</span>
      <button disabled={loading || page >= pages} onClick={() => setPage(page + 1)}>Suivant</button>
    </nav>}
  </section>
}
function layoutGraph(nodes) {
  const types = ['Candidat','Competence','Projet','Domaine']
  const grouped = Object.fromEntries(types.map(t=>[t,nodes.filter(n=>n.type===t)]))
  return nodes.map(n => {
    const arr = grouped[n.type] || [], i = arr.indexOf(n), count = arr.length
    let x=500,y=270
    if (n.type==='Competence') { x=178+(i%3)*33; y=70+(i+.5)*(395/Math.max(1,count)) }
    if (n.type==='Projet') { x=800-(i%2)*38; y=65+(i+.5)*(400/Math.max(1,count)) }
    if (n.type==='Domaine') { x=390+(i%4)*65; y=i%2===0?65:475 }
    return {...n,x,y}
  })
}
function GraphExplorer({ candidat, projects, slug, onProjectOpen, onSkillSelect }) {
  const [graph, setGraph] = useState(null)
  const [graphError, setGraphError] = useState('')
  const [graphLoading, setGraphLoading] = useState(true)
  const [graphAttempt, setGraphAttempt] = useState(0)
  const [selected, setSelected] = useState(`candidat:${slug}`)
  const [zoom, setZoom] = useState(1)
  const surface = useRef(null)
  useEffect(()=>{
    let mounted = true
    const ctrl = new AbortController()
    setGraph(null)
    setGraphError('')
    setGraphLoading(true)
    getJson(`/api/graph/competences/${encodeURIComponent(slug)}`, ctrl.signal)
      .then(value => { if (mounted) setGraph(value) })
      .catch(err => { if (mounted) setGraphError(`Graphe Neo4j indisponible : ${err.message}`) })
      .finally(() => { if (mounted) setGraphLoading(false) })
    return () => { mounted=false; ctrl.abort() }
  },[slug, graphAttempt])
  const all = graph || { nodes: [], links: [] }
  const nodes = useMemo(()=>layoutGraph((all.nodes||[]).slice(0,26)),[all])
  const nodeMap = useMemo(()=>Object.fromEntries(nodes.map(n=>[n.id,n])),[nodes])
  const selectedNode = nodeMap[selected] || nodes[0]
  const links = (all.links||[]).filter(l => nodeMap[typeof l.source === 'string' ? l.source : l.source.id] && nodeMap[typeof l.target==='string'?l.target:l.target.id])
  const selectAction = useCallback(node=>{
    if(!node)return
    if(node.type==='Projet') onProjectOpen({ projet_slug: node.id.replace(/^projet:/,''), titre: node.label })
    if(node.type==='Competence') onSkillSelect(node.id.replace(/^competence:/,''))
  },[projects,onProjectOpen,onSkillSelect])
  const handleKeys = e=>{
    if(nodes.length && ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)) {e.preventDefault();e.stopPropagation();const idx=Math.max(0,nodes.findIndex(n=>n.id===selectedNode?.id));const direction=['ArrowRight','ArrowDown'].includes(e.key)?1:-1;setSelected(nodes[(idx+direction+nodes.length)%nodes.length].id)}
    if(e.key==='Enter'||e.key===' ') {e.preventDefault();e.stopPropagation();selectAction(selectedNode)}
    if(e.key==='+'||e.key==='=') {e.preventDefault();setZoom(z=>Math.min(1.45,z+.15))}
    if(e.key==='-') {e.preventDefault();setZoom(z=>Math.max(.75,z-.15))}
  }
  return <section className="content-section section-shell" id="reseau"><SectionHeading index="04" kicker="L'EXPLORATION" title={<>Tout est <em>connecté.</em></>} description="Un graphe vivant reliant compétences, projets et parcours. Sélectionne un nœud pour découvrir ses connexions." right={<span className="section-count"><Network size={16}/> {graphError?'NEO4J / INDISPONIBLE':graphLoading?'NEO4J / CHARGEMENT':'NEO4J / API'}</span>}/>
    {graphError && <div className="api-alert" role="alert">{graphError} <button onClick={()=>setGraphAttempt(n=>n+1)}>Réessayer</button></div>}
    {!graphError && !graphLoading && !graph?.nodes?.length && <p className="api-alert">Aucun nœud Neo4j n’est enregistré pour ce candidat.</p>}
    <div className="graph-layout" data-reveal><div className="graph-space"><div className="graph-toolbar"><span><span className="online-pulse"/> EXPLORATEUR DE RELATIONS</span><div className="graph-zoom"><button aria-label="Dézoomer" onClick={()=>setZoom(z=>Math.max(.75,z-.15))}><Minus size={15}/></button><strong>{Math.round(zoom*100)}%</strong><button aria-label="Zoomer" onClick={()=>setZoom(z=>Math.min(1.45,z+.15))}><Plus size={15}/></button></div></div>
      <div className="graph-svg-wrap" role="application" aria-label="Graphe interactif. Utiliser flèche gauche ou droite pour changer de nœud, Entrée pour explorer, plus et moins pour zoomer." tabIndex={0} ref={surface} onKeyDown={handleKeys}><svg viewBox="0 0 1000 540" className="graph-svg" aria-hidden="true"><defs><pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 34" stroke="#8d89d2" strokeOpacity=".12" fill="none" strokeWidth="1"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="5"/></filter></defs><rect width="1000" height="540" fill="url(#grid)"/><g transform={`translate(${500*(1-zoom)} ${270*(1-zoom)}) scale(${zoom})`}>{links.map((l,i)=>{const a=nodeMap[typeof l.source==='string'?l.source:l.source.id],b=nodeMap[typeof l.target==='string'?l.target:l.target.id];const highlighted=[a.id,b.id].includes(selectedNode?.id);return <line key={`${a.id}${b.id}${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={highlighted?'#b79aff':'#4b4f85'} strokeOpacity={highlighted?.7:.3} strokeWidth={highlighted?1.8:1.1} />})}{nodes.map(n=>{const active=n.id===selectedNode?.id;const color=n.type==='Candidat'?'#eee8ff':n.type==='Projet'?'#dc88ff':n.type==='Domaine'?'#ffb37e':'#69ecf6';const radius=n.type==='Candidat'?29:active?17:12;return <g key={n.id} className="graph-node" onClick={()=>setSelected(n.id)}><circle cx={n.x} cy={n.y} r={radius+10} fill={color} opacity={active?.13:.035}/><circle cx={n.x} cy={n.y} r={radius} fill="#13162f" stroke={color} strokeWidth={active?3:1.8}/><circle cx={n.x} cy={n.y} r={n.type==='Candidat'?8:3} fill={color}/><text x={n.x} y={n.y+radius+20} fill={active?'#ffffff':'#b5bbd1'} fontSize={n.type==='Candidat'?16:13} fontWeight={active?700:500} textAnchor="middle">{n.label.length>19?`${n.label.slice(0,17)}…`:n.label}</text></g>})}</g></svg></div><div className="graph-bottom"><span>GLISSER LES YEUX, SUIVRE LES LIENS</span><span><kbd>←</kbd><kbd>→</kbd> <kbd>↵</kbd> NAVIGUER</span></div></div>
      <div className="graph-inspector"><span className="graph-inspector-heading"><Scan size={16}/> NOEUD SÉLECTIONNÉ</span><span className="inspector-type">{selectedNode?.type||'Réseau'}</span><h3>{selectedNode?.label || 'Exploration'}</h3><p>{selectedNode?.type==='Candidat'?'Au centre du réseau : le profil relie les réalisations aux savoir-faire.':selectedNode?.type==='Projet'?'Une réalisation connectée aux compétences utilisées. Ouvre sa fiche pour en découvrir l’architecture et les résultats.':selectedNode?.type==='Competence'?'Cette compétence relie les expériences et les projets. Explore sa fiche pour voir les exemples concrets.':'Un domaine qui regroupe plusieurs savoir-faire.'}</p><div className="inspector-separator"/><div className="inspector-count"><span>CONNEXIONS</span><strong>{links.filter(l=>(typeof l.source==='string'?l.source:l.source.id)===selectedNode?.id||(typeof l.target==='string'?l.target:l.target.id)===selectedNode?.id).length}</strong></div><div className="inspector-count"><span>NŒUDS DU RÉSEAU</span><strong>{nodes.length}</strong></div>{['Projet','Competence'].includes(selectedNode?.type)&&<button className="inspector-button" onClick={()=>selectAction(selectedNode)}>Explorer cette entrée <ArrowUpRight size={16}/></button>}<p className="inspector-footnote">SOURCE : {graphError?'NEO4J INDISPONIBLE':'NEO4J / API'}</p></div>
    </div>
  </section>
}

function Contact({ candidat }) {
  const links = candidat.liens||{}
  const mail = candidat.contact?.email
  return <section className="contact-section section-shell" id="contact"><div className="contact-halo"/><div className="contact-content" data-reveal><div className="eyebrow"><span className="eyebrow-line"/> 05 / FIN DE L'EXPLORATION ?</div><h2>Et si on construisait<br/><em>la suite ensemble ?</em></h2><p>Tu as découvert mon parcours, mes compétences et mes projets. La prochaine idée pourrait naître d'une conversation.</p><div className="contact-actions">{safeExternal(links.github)&&<a href={links.github} target="_blank" rel="noreferrer" className="primary-button"><Github size={18}/> Mon GitHub <ArrowUpRight size={17}/></a>}{safeExternal(links.linkedin)&&<a href={links.linkedin} target="_blank" rel="noreferrer" className="ghost-button"><Linkedin size={18}/> LinkedIn <ArrowUpRight size={17}/></a>}{mail&&<a href={`mailto:${mail}`} className="ghost-button"><Mail size={17}/> M'écrire <ArrowUpRight size={17}/></a>}</div></div><div className="contact-decoration" aria-hidden="true"><div className="contact-ring ring-one"/><div className="contact-ring ring-two"/><div className="contact-center">✳</div></div><footer className="page-footer"><span>// {candidat.prenom.toUpperCase()} {candidat.nom.toUpperCase()}</span><span>DES DONNÉES, DES IDÉES, DES CONNEXIONS.</span><button onClick={()=>goTo('accueil')}>RETOUR EN HAUT <ArrowUpRight size={14}/></button></footer></section>
}

function Modal({ project, onClose, page = false, candidateSlug, from = 'competences' }) {
  const projectPath = `/api/projets/${encodeURIComponent(project.projet_slug)}`
  const { data: detail, loading, error } = useEndpoint(projectPath)
  const { data: candidateProjects } = useEndpoint(candidateSlug
    ? `/api/candidats/${encodeURIComponent(candidateSlug)}/projets?limit=100`
    : null)
  const [similar,setSimilar]=useState([])
  const closeRef = useRef(null)
  useEffect(()=>{
    if(!project)return
    const ctrl=new AbortController();setSimilar([])
    getJson(`/api/graph/projets/${encodeURIComponent(project.projet_slug)}/similaires?limit=100`,ctrl.signal).then(payload=>setSimilar(payload.projets_similaires||[])).catch(()=>{})
    if (page) return () => ctrl.abort()
    const lastFocus = document.activeElement
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus())
    return () => {
      ctrl.abort()
      cancelAnimationFrame(focusFrame)
      if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true })
    }
  },[project, page])

  const value = detail ? (detail.projet || detail.projet_detail || (detail.titre ? detail : project)) : project
  const ownProjectSlugs = new Set(candidateProjects?.projets.map(item => item.projet_slug))
  const similarProjects = (similar.length ? similar : detail?.projets_similaires ?? [])
    .filter(item => item.slug !== project.projet_slug && ownProjectSlugs.has(item.slug))
  const resultats=value.resultats?.length?value.resultats:value.réalisation||[]
  const tech=value.technologies||[]
  const github = safeExternal(value.liens?.github) ? value.liens.github : null
  const githubProfile = github && /^https:\/\/(?:www\.)?github\.com\/[^/?#]+\/?(?:[?#]|$)/i.test(github)
  const demo = safeExternal(value.liens?.demo) ? value.liens.demo : null
  const content = <div className="modal-content"><div className="modal-title-row"><div><span className="modal-label">EXPLORATION / PROJET</span>{page ? <h1>{value.titre}</h1> : <h2>{value.titre}</h2>}<p>{value.description}</p></div><div className="modal-title-icon"><Code2 size={29}/></div></div><div className="modal-links">
          {github ? <a href={github} target="_blank" rel="noopener noreferrer">
            <Github size={18}/>{githubProfile ? 'Voir le profil GitHub' : 'Voir le code'}<ExternalLink size={15}/>
          </a> : <p role="status">{loading ? 'Recherche du dépôt…' : error ? 'Impossible de récupérer le lien du dépôt.' : 'Aucun lien vers le code source renseigné.'}</p>}
          {demo && <a href={demo} target="_blank" rel="noopener noreferrer"><Play size={18}/> Voir la démo <ExternalLink size={15}/></a>}
        </div><div className="modal-metadata"><span><b>CONTEXTE</b>{value.contexte||'Projet étudiant'}</span><span><b>PÉRIODE</b>{dateShort(value.date_debut, 'Date non renseignée')} — {dateShort(value.date_fin)}</span></div>{value.architecture&&<div className="modal-block"><h3>Architecture</h3><p>{value.architecture}</p></div>}{value.problematique&&<div className="modal-block"><h3>Problématique</h3><p>{value.problematique}</p></div>}{value.role&&<div className="modal-block"><h3>Mon rôle</h3><p>{value.role}</p></div>}<div className="modal-block"><h3>Technologies utilisées</h3><div className="project-stack">{tech.map(t=><span key={t}>{t}</span>)}</div></div>{resultats.length>0&&<div className="modal-block"><h3>Réalisations & résultats</h3><ul>{resultats.map((r,i)=><li key={i}><Check size={15}/>{r}</li>)}</ul></div>}{similarProjects.length>0&&<div className="modal-block"><h3>Projets connectés</h3><div className="related-list">{similarProjects.slice(0,4).map(p=><a key={p.slug} href={projectHref(candidateSlug, p.slug, page ? from : undefined)}><span>{p.titre}{p.nombre_competences_communes > 0 && <small className="connection-count">{p.nombre_competences_communes} en commun</small>}</span><ArrowUpRight size={16}/></a>)}</div></div>}</div>
  if (page) {
    const back = `?${new URLSearchParams({ slug: candidateSlug })}#${from}`
    return <main className="project-page section-shell">
      <a className="ghost-button" href={back}><ArrowLeft size={16}/> {from === 'projets' ? 'Retour aux projets' : 'Retour aux compétences'}</a>
      {loading && <p role="status">Chargement du projet…</p>}
      {error && <p role="alert">Ce projet est momentanément indisponible.</p>}
      {detail && content}
    </main>
  }
  return createPortal(<div className="modal-backdrop project-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div role="dialog" aria-modal="true" aria-label={`Détail du projet ${project.titre}`} className="project-modal"><div className="modal-bar"><span>PROJECT_FILE // {project.projet_slug.toUpperCase()}</span><button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Fermer le détail du projet"><X size={22}/></button></div>{content}</div></div>, document.body)
}

function KeyboardHelp({ onClose }) {
  const shortcuts = [['Entrée', 'Entrer dans le portfolio / ouvrir un élément'],['↓ / ↑','Aller à la section suivante / précédente'],['1 à 6','Accéder directement à une section'],['Tab','Sélectionner un élément cliquable'],['← / →','Explorer les nœuds du graphe (graphe ciblé)'],['+ / −','Zoomer / dézoomer dans le graphe'],['Échap','Fermer une fiche ou cette aide'],['?','Afficher les raccourcis']]
  return <div className="modal-backdrop help-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="keyboard-modal" role="dialog" aria-modal="true" aria-label="Raccourcis clavier"><div className="modal-bar"><span>KEYBOARD // NAVIGATION</span><button className="modal-close" onClick={onClose} autoFocus aria-label="Fermer l'aide"><X size={22}/></button></div><div className="keyboard-body"><div className="keyboard-icon"><Command size={27}/></div><h2>Explore aussi <em>au clavier.</em></h2><p>Le portfolio a été pensé pour se parcourir avec la souris, le défilement et le clavier.</p><div className="shortcut-list">{shortcuts.map(([key,label])=><div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}</div></div></div></div>
}

function SiteHeader({ candidat, active, mode, onHelp }) {
  const [open,setOpen]=useState(false)
  return <header className="topbar"><button className="site-logo" onClick={()=>goTo('accueil')} aria-label="Retour à l'accueil"><span className="logo-symbol">N<span>✳</span></span><span className="logo-separator"/><span className="logo-label">{candidat.prenom?.toUpperCase()}<br/><small>PORTFOLIO.EXE</small></span></button><nav className={open?'topnav is-open':'topnav'} aria-label="Navigation principale">{SECTIONS.map((s,i)=><button key={s.id} className={active===s.id?'active':''} onClick={()=>{goTo(s.id);setOpen(false)}}><span>{s.number}</span>{s.label}</button>)}</nav><div className="header-right"><span className="status-badge"><span className="online-pulse"/>{mode==='live'?'API CONNECTÉE':'API INDISPONIBLE'}</span><button className="header-help" onClick={onHelp} title="Raccourcis clavier"><Command size={16}/><span>?</span></button><button className="menu-toggle" onClick={()=>setOpen(v=>!v)} aria-label="Ouvrir ou fermer le menu">{open?<X size={21}/>:<Menu size={21}/>}</button></div></header>
}

function LoadingEmpty({ mode, message, retry, slug }) {
  const health = useEndpoint(mode === 'error' && slug ? '/api/health' : null)
  const diagnostic = health.data?.status === 'ok' ? ' FastAPI répond. Vérifie le profil et les données chargées.' : ''
  const loading = mode === 'loading'
  return <main className="loading-screen" role="status">
    <div className="loading-icon"><Network size={42}/></div>
    <h1>{loading ? 'Connexion au portfolio…' : 'Impossible de charger le CV'}</h1>
    <p>{loading ? `Récupération des données de ${slug || 'l’étudiant'} depuis FastAPI…` : message + diagnostic}</p>
    {!loading && <>
      <p>Vérifie <code>VITE_CANDIDAT_SLUG</code> dans <code>.env</code>, puis <code>http://localhost:8000/docs</code> et les bases MongoDB/Neo4j.</p>
      <button className="primary-button" onClick={retry}>Réessayer la connexion <ArrowRight size={17}/></button>
    </>}
  </main>
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const projectSlug = params.get('projet')?.trim()
  if (projectSlug) return <Modal page from={params.get('depuis') === 'projets' ? 'projets' : 'competences'} candidateSlug={params.get('slug')?.trim() || SLUG}
    project={{ projet_slug: projectSlug }} />
  return <Portfolio />
}

function Portfolio() {
  const slug = new URLSearchParams(window.location.search).get('slug')?.trim() || SLUG
  const {data,mode,error,retry}=usePortfolio(slug)
  const candidat=data?.candidat
  const projects=data?.projets?.projets||[]
  const stats=data?.stats||{}
  const [introFinished, setIntroFinished] = useState(() => ['#competences', '#projets'].includes(window.location.hash))
  const showIntro = Boolean(slug) && !introFinished && mode !== 'error'
  useEffect(() => {
    const timer = window.setTimeout(() => setIntroFinished(true), INTRO_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [])
  const [help,setHelp]=useState(false)
  const [project,setProject]=useState(null)
  const [active,setActive]=useState('accueil')
  const [selectedSkill, setSelectedSkill] = useState('')
  const openProject = useCallback((p)=>setProject(p),[])
  useReveal(!!data)
  useEffect(() => {
    if (!data || !['#competences', '#projets'].includes(window.location.hash)) return
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' })
  }, [data])
  useEffect(()=>{document.title=candidat?`${candidat.prenom} ${candidat.nom} | Portfolio interactif`:'Portfolio // Exploration'},[candidat])
  useEffect(()=>{
    if(showIntro||!data) return
    const ids=SECTIONS.map(s=>s.id)
    const io=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)setActive(entry.target.id)})},{rootMargin:'-35% 0px -50% 0px'})
    ids.forEach(id=>{const el=document.getElementById(id);if(el)io.observe(el)})
    return()=>io.disconnect()
  },[showIntro,data])
  useEffect(()=>{
    const handle=e=>{
      const tag=e.target.tagName?.toLowerCase()
      const interactive=['input','textarea','select','button','a'].includes(tag) || e.target.isContentEditable
      if (showIntro || !data) return
      if(e.key==='Escape'){setProject(null);setHelp(false);return}
      if(project||help) return
      if(e.key==='?'&&!interactive){e.preventDefault();setHelp(true);return}
      if(interactive||e.altKey||e.ctrlKey||e.metaKey||e.target.closest?.('[role="application"]'))return
      if(/^[1-6]$/.test(e.key)) {e.preventDefault();goTo(SECTIONS[Number(e.key)-1].id)}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();const index=Math.max(0,SECTIONS.findIndex(s=>s.id===active));const next=Math.max(0,Math.min(SECTIONS.length-1,index+(e.key==='ArrowDown'?1:-1)));goTo(SECTIONS[next].id)
      }
    }
    window.addEventListener('keydown',handle)
    return()=>window.removeEventListener('keydown',handle)
  },[showIntro,data,project,help,active])
  if (showIntro) return <PortfolioIntro />
  if(!data) return <LoadingEmpty mode={mode} slug={slug} message={error} retry={retry} />
  const onSkillFromGraph = skill => {
    setSelectedSkill(skill)
    goTo('competences')
  }
  return <div className="site-root"><div className="site-bg"><NetworkField/></div><div className="site-content"><SiteHeader candidat={candidat} active={active} mode={mode} onHelp={()=>setHelp(true)}/><main><Hero candidat={candidat} stats={stats} projects={projects} mode={mode} onHelp={()=>setHelp(true)}/><Timeline timeline={data.timeline||[]} slug={slug}/><SkillLab candidat={candidat} projects={projects} slug={slug} selected={selectedSkill || candidat.competences?.[0]?.skill_slug || ''} setSelected={setSelectedSkill}/><Projects projects={projects} candidat={candidat} slug={slug} stats={stats}/><GraphExplorer candidat={candidat} projects={projects} slug={slug} onProjectOpen={openProject} onSkillSelect={onSkillFromGraph}/><Contact candidat={candidat}/></main></div>{project&&<Modal key={project.projet_slug} project={project} candidateSlug={slug} onClose={()=>setProject(null)}/ >}{help&&<KeyboardHelp onClose={()=>setHelp(false)}/>}</div>
}
