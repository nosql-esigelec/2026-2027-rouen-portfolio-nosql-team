import { useState } from 'react'
import { GithubIcon } from './Projets'
import { CONTACT } from '../content/contact'

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M3 6.5h18v11H3z M3.5 7l8.5 6.5L20.5 7" />
    </svg>
  )
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M6.6 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.1 6.1l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z"
      />
    </svg>
  )
}
function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.8-1.7-2.8-1.71 0-1.97 1.33-1.97 2.7V21h-4z"
      />
    </svg>
  )
}

const handle = (url) => url?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

// Une carte de canal : lien principal + bouton "copier"
function Canal({ icon, label, value, href, color, external, copy }) {
  const [copied, setCopied] = useState(false)
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(copy)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* presse-papiers indisponible : le lien reste utilisable */
    }
  }

  return (
    <li className="canal" style={{ '--p': color }}>
      <a className="canal__main" href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        <span className="canal__icon">{icon}</span>
        <span className="canal__text">
          <span className="canal__label">{label}</span>
          <span className="canal__value">{value}</span>
        </span>
        <span className="canal__go" aria-hidden="true">
          {external ? '↗' : '→'}
        </span>
      </a>
      {copy && (
        <button type="button" className="canal__copy" onClick={doCopy} aria-label={`Copier ${label}`}>
          {copied ? '✓ Copié' : 'Copier'}
        </button>
      )}
    </li>
  )
}

// Escale 04 — Contact : fin du voyage
export default function Contact({ candidat }) {
  const linkedin = CONTACT.linkedin ?? candidat?.liens?.linkedin
  const tel = CONTACT.telephone

  const canaux = [
    CONTACT.email && {
      key: 'email',
      icon: <MailIcon />,
      label: 'E-mail',
      value: CONTACT.email,
      href: `mailto:${CONTACT.email}?subject=${encodeURIComponent('Contact depuis ton portfolio')}`,
      copy: CONTACT.email,
      color: 'var(--lime)',
    },
    tel && {
      key: 'tel',
      icon: <PhoneIcon />,
      label: 'Téléphone',
      value: tel,
      href: `tel:${tel.replace(/[^\d+]/g, '')}`,
      copy: tel,
      color: 'var(--cyan)',
    },
    linkedin && {
      key: 'linkedin',
      icon: <LinkedinIcon />,
      label: 'LinkedIn',
      value: handle(linkedin),
      href: linkedin,
      external: true,
      color: '#60a5fa',
    },
    CONTACT.github && {
      key: 'github',
      icon: <GithubIcon />,
      label: 'GitHub',
      value: handle(CONTACT.github),
      href: CONTACT.github,
      external: true,
      color: 'var(--pink)',
    },
  ].filter(Boolean)

  const manquants = [!CONTACT.email && 'email', !tel && 'telephone'].filter(Boolean)

  return (
    <section id="contact" className="stop contact" style={{ '--c': 'var(--gold)' }}>
      <div className="contact__beacon" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>

      <p className="eyebrow">Escale 04 · Fin du voyage</p>
      <h2 className="stop__title">Contact</h2>
      <p className="stop__lead">
        Un stage, une alternance, un projet data ? Envoie un signal : {candidat?.prenom ?? 'Loïc'} répond vite.
      </p>

      {/* Rappel visible uniquement en développement (npm run dev), jamais en production */}
      {import.meta.env.DEV && manquants.length > 0 && (
        <p className="dev-hint">
          À compléter dans <code>src/content/contact.js</code> : {manquants.join(', ')}
        </p>
      )}

      <ul className="canaux">
        {canaux.map(({ key, ...c }) => (
          <Canal key={key} {...c} />
        ))}
      </ul>

      <footer className="site-foot">
        <span>
          © {new Date().getFullYear()} {candidat?.prenom ?? 'Loïc'} {candidat?.nom?.toUpperCase() ?? 'KAKOU'}
        </span>
        <span>Données servies en direct par l'API d'équipe · MongoDB + Neo4j</span>
        <a href="#accueil">↑ Retour au décollage</a>
      </footer>
    </section>
  )
}
