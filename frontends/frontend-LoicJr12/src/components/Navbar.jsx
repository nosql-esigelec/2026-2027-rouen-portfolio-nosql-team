import { Link } from 'react-router-dom'
import { STOPS } from '../journey/stops'

// Liens "/#escale" : fonctionnent depuis l'accueil comme depuis la page d'un projet
export default function Navbar({ prenom, nom, active = -1 }) {
  const initials = `${prenom?.[0] ?? 'L'}${nom?.[0] ?? 'K'}`.toUpperCase()
  return (
    <header className="nav">
      <Link to="/#accueil" className="nav__brand">
        <span className="nav__logo">{initials}</span>
        <span className="nav__name">
          {prenom} <b>{nom}</b>
        </span>
      </Link>
      <nav className="nav__links">
        {STOPS.slice(1).map((s, i) => (
          <Link key={s.id} to={`/#${s.id}`} className={active === i + 1 ? 'is-active' : ''}>
            {s.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
