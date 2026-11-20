import { STOPS } from '../journey/stops'

export default function Navbar({ prenom, nom, active }) {
  const initials = `${prenom?.[0] ?? 'L'}${nom?.[0] ?? 'K'}`.toUpperCase()
  return (
    <header className="nav">
      <a href="#accueil" className="nav__brand">
        <span className="nav__logo">{initials}</span>
        <span className="nav__name">
          {prenom} <b>{nom}</b>
        </span>
      </a>
      <nav className="nav__links">
        {STOPS.slice(1).map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className={active === i + 1 ? 'is-active' : ''}>
            {s.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
