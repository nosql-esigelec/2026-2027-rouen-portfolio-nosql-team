import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { journey } from '../journey/store'

// Profondeur du "tunnel" d'étoiles : elles bouclent à l'infini → voyage sans fin
const DEPTH = 140
const PALETTE = ['#ffffff', '#ffffff', '#ffffff', '#cfe8ff', '#d4ff3a', '#2de2e6', '#ff3d7f', '#b69cff']

// Vitesse de croisière + défilement → distance parcourue (partagée avec les traînées)
export function travelDistance(time) {
  const drift = journey.reducedMotion ? 0.15 : 0.9
  return time * drift + journey.scrollSmooth * 0.03
}

const starsVertex = /* glsl */ `
  uniform float uTravel;
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Boucle infinie en profondeur : l'étoile revient au fond quand elle nous dépasse
    p.z = mod(p.z + uTravel, ${DEPTH.toFixed(1)}) - ${DEPTH.toFixed(1)} + 6.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed * 3.0) + aSeed * 50.0);
    float fadeNear = smoothstep(6.0, 2.0, p.z);
    float fadeFar = smoothstep(-${DEPTH.toFixed(1)} + 6.0, -${DEPTH.toFixed(1)} + 40.0, p.z);

    gl_PointSize = aSize * uPixelRatio * (70.0 / -mv.z);
    vAlpha = twinkle * fadeNear * fadeFar;
    vColor = aColor;
  }
`

const starsFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 3.0);
    gl_FragColor = vec4(vColor * (0.6 + glow), (core * 0.5 + glow) * vAlpha);
  }
`

export function Stars({ count = 5000 }) {
  const material = useRef()
  const gl = useThree((s) => s.gl)

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)
    const color = new Float32Array(count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60
      pos[i * 3 + 2] = -Math.random() * DEPTH
      size[i] = Math.random() < 0.03 ? 2.5 + Math.random() * 2.5 : 0.6 + Math.random() * 1.2
      seed[i] = Math.random()
      c.set(PALETTE[Math.floor(Math.random() * PALETTE.length)])
      color.set([c.r, c.g, c.b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(color, 3))
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({ uTravel: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: gl.getPixelRatio() } }),
    [gl],
  )

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uTravel.value = travelDistance(clock.elapsedTime)
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={starsVertex}
        fragmentShader={starsFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Traînées "hyper-espace" : invisibles au repos, elles s'étirent quand on défile vite
const warpVertex = /* glsl */ `
  uniform float uTravel;
  uniform float uStretch;
  attribute float aEnd;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.z = mod(p.z + uTravel, ${DEPTH.toFixed(1)}) - ${DEPTH.toFixed(1)} + 6.0;
    p.z -= aEnd * uStretch;
    vAlpha = (1.0 - aEnd) * smoothstep(-${DEPTH.toFixed(1)} + 6.0, -60.0, p.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const warpFragment = /* glsl */ `
  uniform float uIntensity;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uIntensity);
  }
`

export function WarpStreaks({ count = 500 }) {
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 6)
    const end = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      // On évite le centre pour ne pas traverser le texte
      const a = Math.random() * Math.PI * 2
      const r = 4 + Math.random() * 30
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r * 0.65
      const z = -Math.random() * DEPTH
      pos.set([x, y, z, x, y, z], i * 6)
      end.set([0, 1], i * 2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTravel: { value: 0 },
      uStretch: { value: 0 },
      uIntensity: { value: 0 },
      uColor: { value: new THREE.Color('#bfefff') },
    }),
    [],
  )

  useFrame(({ clock }) => {
    const speed = journey.reducedMotion ? 0 : Math.min(Math.abs(journey.velocity) / 2500, 1)
    uniforms.uTravel.value = travelDistance(clock.elapsedTime)
    uniforms.uStretch.value = 0.2 + speed * 14
    uniforms.uIntensity.value = speed * 0.9
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={warpVertex}
        fragmentShader={warpFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}
