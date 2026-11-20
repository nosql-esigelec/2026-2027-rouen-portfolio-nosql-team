import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { journey } from '../journey/store'

// Texture de lueur douce générée en code (aucune image à télécharger)
function useGlowTexture() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

// Nuages de nébuleuse colorés, très lointains, qui "respirent" lentement
const CLOUDS = [
  { pos: [-28, 10, -95], scale: 70, color: '#7c3aed', opacity: 0.22 },
  { pos: [30, -14, -110], scale: 80, color: '#ff3d7f', opacity: 0.14 },
  { pos: [8, 18, -130], scale: 90, color: '#2de2e6', opacity: 0.1 },
  { pos: [-10, -22, -85], scale: 55, color: '#d4ff3a', opacity: 0.07 },
  { pos: [40, 20, -120], scale: 60, color: '#3b82f6', opacity: 0.12 },
]

export function Nebula() {
  const tex = useGlowTexture()
  const group = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    group.current.children.forEach((sprite, i) => {
      sprite.material.opacity = CLOUDS[i].opacity * (0.8 + 0.2 * Math.sin(t * 0.3 + i * 2))
      sprite.material.rotation = t * 0.01 * (i % 2 ? 1 : -1)
    })
    // Parallaxe très lente avec le défilement → profondeur
    group.current.position.y = journey.scrollSmooth * 0.002
  })

  return (
    <group ref={group}>
      {CLOUDS.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale, c.scale, 1]}>
          <spriteMaterial
            map={tex}
            color={c.color}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  )
}

const planetVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const planetFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uRim;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    // Bandes atmosphériques ondulées
    float bands = sin(vUv.y * 28.0 + sin(vUv.x * 12.0 + uTime * 0.15) * 1.2);
    vec3 base = mix(uColorA, uColorB, bands * 0.5 + 0.5);
    // Éclairage depuis le haut-droite + bord lumineux (fresnel)
    float light = clamp(dot(vNormal, normalize(vec3(0.6, 0.5, 0.6))), 0.0, 1.0);
    float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.0);
    vec3 col = base * (0.15 + light * 0.9) + uRim * rim * 1.6;
    gl_FragColor = vec4(col, 1.0);
  }
`

function Planet({ position, radius, colorA, colorB, rim, ring, travelFactor = 0.03 }) {
  const ref = useRef()
  const uniforms = useMemo(
    () => ({
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uRim: { value: new THREE.Color(rim) },
      uTime: { value: 0 },
    }),
    [colorA, colorB, rim],
  )

  useFrame(({ clock }, delta) => {
    uniforms.uTime.value = clock.elapsedTime
    ref.current.rotation.y += delta * 0.05
    // On se rapproche de la planète en défilant, puis on la dépasse
    ref.current.position.z = position[2] + journey.scrollSmooth * travelFactor
  })

  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial uniforms={uniforms} vertexShader={planetVertex} fragmentShader={planetFragment} />
      </mesh>
      {ring && (
        <mesh rotation={[Math.PI / 2.3, 0.2, 0]}>
          <ringGeometry args={[radius * 1.35, radius * 2.1, 128]} />
          <meshBasicMaterial
            color={ring}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}

export function Planets() {
  return (
    <>
      <Planet position={[16, -11, -40]} radius={5} colorA="#0b1a3a" colorB="#1f3d7a" rim="#2de2e6" ring="#d4ff3a" />
      <Planet position={[15, 6, -120]} radius={6} colorA="#2a0a2e" colorB="#7a1f4d" rim="#ff3d7f" />
      <Planet position={[-16, 8, -200]} radius={3} colorA="#1d1300" colorB="#6b4b00" rim="#ffc93c" ring="#ffc93c" />
    </>
  )
}
