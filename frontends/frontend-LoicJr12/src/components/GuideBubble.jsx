import { forwardRef, useEffect, useState } from 'react'
import { GUIDE_NAME } from '../journey/stops'

// Texte qui s'écrit lettre par lettre
function useTypewriter(text, speed = 22) {
  const [out, setOut] = useState('')
  useEffect(() => {
    setOut('')
    let i = 0
    const id = setInterval(() => {
      i++
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return out
}

// Bulle de dialogue du robot. Sa position est mise à jour par la scène 3D (Guide.jsx).
const GuideBubble = forwardRef(function GuideBubble({ text, hasMore, onNext }, ref) {
  const typed = useTypewriter(text)
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
