// Premier écran : identité (R1) + chiffres clés (R1, R2, R3)
function Letters({ text, delay = 0 }) {
  return [...text].map((ch, i) => (
    <span key={i} className="letter" style={{ animationDelay: `${delay + i * 0.05}s` }}>
      {ch}
    </span>
  ))
}

export default function Hero({ profil, stats }) {
  const cards = [
    { label: 'Projets', value: stats.projets, color: 'var(--lime)' },
    { label: 'Technos utilisées', value: stats.technos, color: 'var(--pink)' },
    { label: 'Expériences', value: stats.experiences, color: 'var(--cyan)' },
    { label: 'Formations', value: stats.formations, color: 'var(--gold)' },
  ]

  return (
    <section id="accueil" className="hero stop">
      <p className="eyebrow">
        <span className="eyebrow__dot" /> Portfolio personnel · Voyage en 3D
      </p>

      <h1 className="hero__name">
        <span className="hero__first">
          <Letters text={profil.prenom.toUpperCase()} />
        </span>
        <span className="hero__last">
          <Letters text={profil.nom.toUpperCase()} delay={0.25} />
        </span>
      </h1>

      <p className="hero__title">{profil.titre}</p>
      <p className="hero__bio">{profil.bio}</p>

      <div className="hero__ctas">
        <a href="#projets" className="btn btn--primary">
          Voir mes projets
        </a>
        <a href="#contact" className="btn btn--ghost">
          Me contacter
        </a>
      </div>

      <div className="hero__stats">
        {cards.map((c, i) => (
          <div key={c.label} className="stat" style={{ '--c': c.color, animationDelay: `${0.9 + i * 0.1}s` }}>
            <span className="stat__label">{c.label}</span>
            <span className="stat__value">{c.value ?? '—'}</span>
          </div>
        ))}
      </div>

      <a href="#parcours" className="scroll-cue">
        <span className="scroll-cue__mouse" />
        Défile pour voyager dans son univers
      </a>
    </section>
  )
}
