import { useCallback, useEffect, useRef, useState } from 'react'
// État du robot guide : réplique affichée + animation de salut.
// `key` identifie l'endroit (escale ou page) : quand il change, Nova reprend à la 1re réplique.
export function useGuide(key, rawLines, ctx = {}) {
  const [lineIdx, setLineIdx] = useState(0)
  const [waving, setWaving] = useState(true)
  const timer = useRef()

  const wave = useCallback((ms) => {
    setWaving(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setWaving(false), ms)
  }, [])

  // Nouvel endroit → première réplique + petit salut
  useEffect(() => {
    setLineIdx(0)
    wave(key === 0 ? 2600 : 1400)
  }, [key, wave])

  const next = useCallback(() => {
    setLineIdx((i) => i + 1)
    wave(1200)
  }, [wave])

  // Une réplique peut être un texte fixe ou une fonction des données (ignorée si elle renvoie null)
  const lines = rawLines.map((l) => (typeof l === 'function' ? l(ctx) : l)).filter(Boolean)
  return { text: lines[lineIdx % lines.length], hasMore: lines.length > 1, waving, next }
}
