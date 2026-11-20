import { Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { Stars, WarpStreaks } from './Starfield'
import { Nebula, Planets } from './Cosmos'
import { Guide } from './Guide'
import { journey, updateJourney } from '../journey/store'

// Caméra : parallaxe à la souris + petit "roulis" pendant le voyage
function CameraRig() {
  useFrame(({ camera }, delta) => {
    updateJourney(delta)
    const p = journey.pointer
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, p.x * 0.5, 0.04)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, p.y * 0.3, 0.04)
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, journey.velocity / 40000, 0.05)
    camera.lookAt(0, 0, -10)
  })
  return null
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

export default function Universe({ guide, bubbleRef }) {
  return (
    <div className="universe" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50, near: 0.1, far: 400 }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        // Les événements viennent de toute la page : le robot reste cliquable sous le contenu HTML
        eventSource={document.getElementById('root')}
        eventPrefix="client"
      >
        <color attach="background" args={['#03040a']} />
        <fog attach="fog" args={['#03040a', 60, 220]} />
        <CameraRig />

        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <pointLight position={[-4, 2, 3]} color="#2de2e6" intensity={18} distance={14} />
        <pointLight position={[4, -1, 2]} color="#ff3d7f" intensity={12} distance={12} />

        <Stars count={isMobile ? 2500 : 6000} />
        <WarpStreaks count={isMobile ? 250 : 600} />
        <Nebula />
        <Planets />

        <Suspense fallback={null}>
          {/* Reflets du robot : studio virtuel généré localement, aucun fichier HDR à charger */}
          <Environment resolution={128}>
            <Lightformer intensity={3} position={[0, 4, 4]} scale={[8, 2, 1]} />
            <Lightformer intensity={2} color="#2de2e6" position={[-5, 0, 2]} scale={[2, 6, 1]} />
            <Lightformer intensity={2} color="#ff3d7f" position={[5, 0, 2]} scale={[2, 6, 1]} />
          </Environment>
          <Guide waving={guide.waving} onNext={guide.next} bubbleRef={bubbleRef} />
        </Suspense>
      </Canvas>
    </div>
  )
}
