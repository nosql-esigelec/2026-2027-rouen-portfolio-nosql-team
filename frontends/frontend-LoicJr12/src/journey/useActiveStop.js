import { useEffect, useState } from 'react'
import { STOPS } from './stops'

// Renvoie l'index de l'escale (section) actuellement au centre de l'écran
export function useActiveStop() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = STOPS.findIndex((s) => s.id === entry.target.id)
            if (idx >= 0) setActive(idx)
          }
        })
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    STOPS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return active
}
