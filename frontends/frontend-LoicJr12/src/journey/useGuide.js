import { useCallback, useEffect, useRef, useState } from 'react'
import { STOPS } from './stops'

// État du robot guide : réplique affichée + animation de salut
export function useGuide(stop) {
  const [lineIdx, setLineIdx] = useState(0)
  const [waving, setWaving] = useState(true)
  const timer = useRef()

  const wave = useCallback((ms) => {
    setWaving(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setWaving(false), ms)
  }, [])

  // Nouvelle escale → première réplique + petit salut
  useEffect(() => {
    setLineIdx(0)
    wave(stop === 0 ? 2600 : 1400)
  }, [stop, wave])

  const next = useCallback(() => {
    setLineIdx((i) => i + 1)
    wave(1200)
  }, [wave])

  const lines = STOPS[stop].lines
  return { text: lines[lineIdx % lines.length], hasMore: lines.length > 1, waving, next }
}
