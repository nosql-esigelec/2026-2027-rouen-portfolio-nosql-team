import { useEffect, useRef } from 'react'
import { STOPS } from '../journey/stops'
import { journey } from '../journey/store'

// Indicateur de voyage : escales à droite + compteur de distance en bas à gauche
export default function JourneyHUD({ active }) {
  const distance = useRef()
  const bar = useRef()

  useEffect(() => {
    let raf
    const tick = () => {
      const al = (journey.scrollSmooth * 0.0123 + performance.now() / 4000).toFixed(2)
      if (distance.current) distance.current.textContent = al
      if (bar.current) bar.current.style.transform = `scaleY(${journey.progress})`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <aside className="hud-stops">
        <div className="hud-stops__track">
          <div ref={bar} className="hud-stops__fill" />
        </div>
        {STOPS.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`hud-stops__dot ${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}
            style={{ '--c': s.color }}
          >
            <span>{s.label}</span>
          </a>
        ))}
      </aside>
      <div className={`hud-distance ${active > 0 ? 'is-visible' : ''}`}>
        <span>Distance parcourue</span>
        <b ref={distance}>0.00</b> <i>années-lumière</i>
      </div>
    </>
  )
}
