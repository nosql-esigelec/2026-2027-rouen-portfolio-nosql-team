import { forwardRef, useEffect, useState } from 'react'
import { GUIDE_NAME } from '../journey/stops'

// Texte qui s'écrit lettre par lettre (basé sur le temps écoulé : reste fluide même si le PC rame)
function useTypewriter(text, speed = 22) {
  const [out, setOut] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setOut('')
    setDone(false)
    const start = performance.now()
    const id = setInterval(() => {
      const n = Math.min(text.length, Math.floor((performance.now() - start) / speed))
      setOut(text.slice(0, n))
      if (n >= text.length) {
        clearInterval(id)
        setDone(true)
      }
    }, 30)
    return () => clearInterval(id)
  }, [text, speed])
  return { typed: out, done }
}

// Après lecture, la bulle se replie en pastille pour ne pas masquer le contenu
const READ_TIME = 7000

// Bulle de dialogue du robot. Sa position est mise à jour par la scène 3D (Guide.jsx).
const GuideBubble = forwardRef(function GuideBubble({ text, hasMore, onNext }, ref) {
  const { typed, done } = useTypewriter(text)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => setCollapsed(false), [text])
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setCollapsed(true), READ_TIME)
    return () => clearTimeout(id)
  }, [done, text])

  if (collapsed) {
    return (
      <div ref={ref} className="bubble-anchor">
        <button type="button" className="bubble bubble--mini" onClick={() => setCollapsed(false)} aria-label={`Rouvrir le message de ${GUIDE_NAME}`}>
          <span className="bubble__dots">
            <i />
            <i />
            <i />
          </span>
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="bubble-anchor">
      <button type="button" className="bubble" onClick={onNext} aria-live="polite">
        <span className="bubble__name">{GUIDE_NAME} · guide</span>
        <p>
          {typed}
          <span className="bubble__caret" />
        </p>
        {hasMore && <span className="bubble__hint">clique pour la suite ↻</span>}
      </button>
    </div>
  )
})

export default GuideBubble
