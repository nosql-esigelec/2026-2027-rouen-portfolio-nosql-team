// État partagé du "voyage" entre la page HTML et la scène 3D.
// Objet mutable (pas de state React) : lu à chaque frame par Three.js sans re-render.
export const journey = {
  scrollY: 0, // défilement brut (px)
  scrollSmooth: 0, // défilement lissé, utilisé par la scène
  velocity: 0, // vitesse lissée (px/s) → effet "hyper-espace"
  progress: 0, // 0 → 1 sur toute la page
  heroProgress: 0, // 0 → 1 sur le premier écran (robot qui rejoint son coin)
  pointer: { x: 0, y: 0 }, // souris normalisée [-1, 1]
  reducedMotion:
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}

let started = false

export function startJourneyTracking() {
  if (started) return
  started = true

  const onScroll = () => {
    journey.scrollY = window.scrollY
    const max = document.documentElement.scrollHeight - window.innerHeight
    journey.progress = max > 0 ? window.scrollY / max : 0
    journey.heroProgress = Math.min(1, window.scrollY / (window.innerHeight * 0.8))
  }
  const onPointer = (e) => {
    journey.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    journey.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  window.addEventListener('pointermove', onPointer, { passive: true })
  onScroll()
}

// Lissage appelé à chaque frame par la scène 3D
export function updateJourney(delta) {
  const prev = journey.scrollSmooth
  const k = 1 - Math.exp(-delta * 6)
  journey.scrollSmooth += (journey.scrollY - journey.scrollSmooth) * k
  const instant = delta > 0 ? (journey.scrollSmooth - prev) / delta : 0
  journey.velocity += (instant - journey.velocity) * (1 - Math.exp(-delta * 4))
}
