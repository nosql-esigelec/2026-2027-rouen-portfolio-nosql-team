import { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { journey } from '../journey/store'

const LIME = '#d4ff3a'
const CYAN = '#2de2e6'
const PINK = '#ff3d7f'

// Silhouette d'aile (3 "plumes" arrondies), extrudée en 3D
function useWingGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.bezierCurveTo(0.35, 0.55, 1.1, 1.0, 1.95, 0.95)
    s.bezierCurveTo(1.7, 0.7, 1.85, 0.5, 1.65, 0.38)
    s.bezierCurveTo(1.75, 0.2, 1.6, 0.0, 1.38, -0.02)
    s.bezierCurveTo(1.42, -0.2, 1.2, -0.38, 0.95, -0.32)
    s.bezierCurveTo(0.6, -0.28, 0.25, -0.18, 0, 0)
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 24,
    })
    g.center()
    g.translate(0.95, 0, 0) // charnière à l'épaule
    return g
  }, [])
}

function Wing({ side, geometry }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Battement plus rapide quand on défile vite
    const boost = Math.min(Math.abs(journey.velocity) / 3000, 1)
    const flap = Math.sin(t * (6 + boost * 10)) * (0.35 + boost * 0.25)
    ref.current.rotation.y = side * (0.55 + flap)
    ref.current.rotation.z = side * (0.25 + flap * 0.3)
  })
  return (
    <group ref={ref} position={[side * 0.3, 0.15, -0.3]} scale={[side, 1, 1]}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={LIME}
          emissive={LIME}
          emissiveIntensity={0.7}
          metalness={0.1}
          roughness={0.2}
          clearcoat={1}
          iridescence={1}
          iridescenceIOR={1.6}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

const white = { color: '#f4f6fb', metalness: 0.15, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 }

export const Robot = forwardRef(function Robot({ waving, onClick, onPointerOver, onPointerOut }, outerRef) {
  const wing = useWingGeometry()
  const body = useRef()
  const head = useRef()
  const eyes = useRef()
  const core = useRef()
  const antenna = useRef()
  const flame = useRef()
  const armR = useRef()
  const armL = useRef()
  const blink = useRef({ next: 2, t: 0 })

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const p = journey.pointer

    // Flottement
    body.current.position.y = Math.sin(t * 1.6) * 0.12
    body.current.rotation.z = Math.sin(t * 0.9) * 0.05

    // La tête suit la souris
    head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, p.x * 0.6, 0.08)
    head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, -p.y * 0.35, 0.08)
    eyes.current.position.x = THREE.MathUtils.lerp(eyes.current.position.x, p.x * 0.05, 0.1)
    eyes.current.position.y = THREE.MathUtils.lerp(eyes.current.position.y, p.y * 0.03, 0.1)

    // Clignement aléatoire
    const b = blink.current
    b.t += delta
    let open = 1
    if (b.t > b.next) {
      const k = (b.t - b.next) / 0.18
      open = k < 1 ? Math.abs(1 - 2 * k) : 1
      if (k >= 1) {
        b.t = 0
        b.next = 2 + Math.random() * 3
      }
    }
    eyes.current.scale.y = Math.max(open, 0.08)

    // Cœur et antenne qui pulsent
    const pulse = 0.6 + Math.sin(t * 3) * 0.4
    core.current.emissiveIntensity = 1.5 + pulse * 2
    antenna.current.emissiveIntensity = 1 + (Math.sin(t * 5) > 0.6 ? 3 : 0)

    // Flamme du réacteur
    const f = 0.85 + Math.random() * 0.3 + Math.min(Math.abs(journey.velocity) / 2000, 1.2)
    flame.current.scale.set(1, f, 1)

    // Bras : salut de la main ou balancement
    armR.current.rotation.z = waving ? -2.3 + Math.sin(t * 12) * 0.45 : -0.25 + Math.sin(t * 2) * 0.1
    armL.current.rotation.z = 0.25 - Math.sin(t * 2) * 0.1
  })

  return (
    <group ref={outerRef} onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <group ref={body}>
        {/* Ailes */}
        <Wing side={1} geometry={wing} />
        <Wing side={-1} geometry={wing} />

        {/* Tête */}
        <group ref={head} position={[0, 0.62, 0]}>
          <RoundedBox args={[1.15, 0.88, 0.9]} radius={0.28} smoothness={6}>
            <meshPhysicalMaterial {...white} />
          </RoundedBox>
          {/* Visière */}
          <RoundedBox args={[0.92, 0.56, 0.1]} radius={0.05} smoothness={4} position={[0, -0.02, 0.42]}>
            <meshPhysicalMaterial color="#05070f" metalness={0.6} roughness={0.08} clearcoat={1} />
          </RoundedBox>
          {/* Yeux */}
          <group ref={eyes} position={[0, 0, 0]}>
            {[-0.19, 0.19].map((x) => (
              <RoundedBox key={x} args={[0.15, 0.24, 0.03]} radius={0.06} position={[x, 0.03, 0.48]}>
                <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={3} toneMapped={false} />
              </RoundedBox>
            ))}
          </group>
          {/* Sourire */}
          <mesh position={[0, -0.15, 0.48]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.08, 0.018, 8, 24, Math.PI]} />
            <meshStandardMaterial color={LIME} emissive={LIME} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Joues */}
          {[-0.36, 0.36].map((x) => (
            <mesh key={x} position={[x, -0.12, 0.475]}>
              <circleGeometry args={[0.05, 20]} />
              <meshBasicMaterial color={PINK} transparent opacity={0.6} />
            </mesh>
          ))}
          {/* Oreilles-écouteurs */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh>
                <cylinderGeometry args={[0.17, 0.17, 0.12, 32]} />
                <meshPhysicalMaterial {...white} />
              </mesh>
              <mesh position={[0, s * 0.065, 0]}>
                <torusGeometry args={[0.11, 0.025, 12, 32]} />
                <meshStandardMaterial color={LIME} emissive={LIME} emissiveIntensity={1.5} toneMapped={false} />
              </mesh>
            </group>
          ))}
          {/* Antenne */}
          <mesh position={[0, 0.56, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.26, 12]} />
            <meshStandardMaterial color="#c9ccd6" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.075, 24, 24]} />
            <meshStandardMaterial ref={antenna} color={PINK} emissive={PINK} emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>

        {/* Corps */}
        <mesh position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.38, 0.32, 12, 32]} />
          <meshPhysicalMaterial {...white} />
        </mesh>
        {/* Cœur lumineux */}
        <mesh position={[0, -0.18, 0.37]}>
          <circleGeometry args={[0.09, 32]} />
          <meshStandardMaterial ref={core} color={LIME} emissive={LIME} emissiveIntensity={3} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.18, 0.365]}>
          <torusGeometry args={[0.14, 0.015, 8, 40]} />
          <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={1.5} toneMapped={false} />
        </mesh>

        {/* Bras */}
        <group ref={armR} position={[0.4, -0.08, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.075, 0.25, 8, 16]} />
            <meshPhysicalMaterial {...white} />
          </mesh>
        </group>
        <group ref={armL} position={[-0.4, -0.08, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.075, 0.25, 8, 16]} />
            <meshPhysicalMaterial {...white} />
          </mesh>
        </group>

        {/* Réacteur + flamme */}
        <mesh position={[0, -0.72, 0]}>
          <cylinderGeometry args={[0.16, 0.22, 0.14, 32]} />
          <meshStandardMaterial color="#2a2f3d" metalness={0.9} roughness={0.25} />
        </mesh>
        <group ref={flame} position={[0, -0.8, 0]}>
          <mesh position={[0, -0.22, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.13, 0.45, 24, 1, true]} />
            <meshBasicMaterial color={PINK} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.14, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.07, 0.28, 24, 1, true]} />
            <meshBasicMaterial color="#fff3b0" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
        <pointLight position={[0, -1, 0.2]} color={PINK} intensity={2} distance={3} />
      </group>
    </group>
  )
})
