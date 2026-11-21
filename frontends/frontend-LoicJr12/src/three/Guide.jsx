import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Robot } from './Robot'
import { journey } from '../journey/store'

const tmp = new THREE.Vector3()
const anchor = new THREE.Vector3()

// Place le robot (à côté du nom → coin de l'écran) et accroche la bulle HTML au-dessus de lui
export function Guide({ waving, onNext, bubbleRef }) {
  const rig = useRef()
  const placed = useRef(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
  }, [hover])

  useFrame((state) => {
    const { width, height } = state.viewport.getCurrentViewport(state.camera, [0, 0, 0])
    const mobile = width < height
    const h = journey.forceCorner ? 1 : journey.heroProgress
    const ease = h * h * (3 - 2 * h)

    const heroPos = mobile ? [width * 0.24, height * 0.3, 0] : [width * 0.28, 0.1, 0]
    const cornerPos = [width / 2 - (mobile ? 0.8 : 1.3), -height / 2 + (mobile ? 1.0 : 1.5), 0]
    const heroScale = mobile ? 0.7 : 1.3
    const cornerScale = mobile ? 0.45 : 0.62

    tmp.set(
      THREE.MathUtils.lerp(heroPos[0], cornerPos[0], ease),
      THREE.MathUtils.lerp(heroPos[1], cornerPos[1], ease),
      0,
    )
    const s = THREE.MathUtils.lerp(heroScale, cornerScale, ease) * (hover ? 1.08 : 1)
    // 1re image : Nova apparaît directement à sa place (pas de traversée depuis le centre)
    const k = placed.current ? 0.12 : 1
    placed.current = true
    rig.current.position.lerp(tmp, k)
    rig.current.scale.lerp(tmp.set(s, s, s), k)
    rig.current.rotation.x = THREE.MathUtils.lerp(
      rig.current.rotation.x,
      -Math.min(journey.velocity / 4000, 0.4),
      0.1,
    )

    // Projection 3D → écran pour positionner la bulle au-dessus-gauche du robot
    const el = bubbleRef.current
    if (el) {
      const sc = rig.current.scale.x
      anchor.copy(rig.current.position).add(tmp.set(-0.55 * sc, 1.3 * sc, 0)).project(state.camera)
      const x = ((anchor.x + 1) / 2) * state.size.width
      const y = ((1 - anchor.y) / 2) * state.size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    }
  })

  return (
    <group ref={rig}>
      <Robot
        waving={waving}
        onClick={(e) => {
          e.stopPropagation()
          onNext()
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      />
    </group>
  )
}
