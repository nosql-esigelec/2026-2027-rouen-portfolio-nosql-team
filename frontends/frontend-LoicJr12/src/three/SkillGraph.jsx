import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { nodeLabel } from '../content/domaines'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force-3d'

// Apparence de chaque type de nœud du graphe Neo4j (R5) : couleur + forme
export const NODE_STYLE = {
  Candidat: { color: '#d4ff3a', label: 'Candidat' },
  Domaine: { color: '#a78bfa', label: 'Domaines' },
  Projet: { color: '#ff3d7f', label: 'Projets' },
  Competence: { color: '#2de2e6', label: 'Compétences' },
}

const LINK_DISTANCE = { MAITRISE: 9, A_REALISE: 7, UTILISE: 5, APPARTIENT_A: 4 }

// Placement 3D par simulation physique (calculé une seule fois)
function useLayout(graph) {
  return useMemo(() => {
    const nodes = graph.nodes.map((n) => ({ ...n }))
    const links = graph.links.map((l) => ({ ...l }))
    const center = nodes.find((n) => n.type === 'Candidat')
    if (center) Object.assign(center, { fx: 0, fy: 0, fz: 0 })

    const sim = forceSimulation(nodes, 3)
      .force('link', forceLink(links).id((d) => d.id).distance((l) => LINK_DISTANCE[l.type] ?? 5).strength(0.35))
      .force('charge', forceManyBody().strength(-70))
      .force('collide', forceCollide(1.6))
      .force('center', forceCenter(0, 0, 0))
      .stop()
    for (let i = 0; i < 400; i++) sim.tick()

    // Recadrage : toute la constellation tient dans une sphère de rayon FIT
    // (calé sur 85 % des nœuds : un astre isolé ne doit pas tout rétrécir)
    const FIT = 7.5
    const dists = nodes.map((n) => Math.hypot(n.x, n.y, n.z)).sort((a, b) => a - b)
    const radius = Math.max(1, dists[Math.floor(dists.length * 0.85)] ?? 1)
    const k = FIT / radius
    const pos = Object.fromEntries(nodes.map((n) => [n.id, new THREE.Vector3(n.x * k, n.y * k, n.z * k)]))
    const neighbors = Object.fromEntries(nodes.map((n) => [n.id, new Set([n.id])]))
    graph.links.forEach((l) => {
      neighbors[l.source]?.add(l.target)
      neighbors[l.target]?.add(l.source)
    })
    return { pos, neighbors }
  }, [graph])
}

function nodeSize(node, niveaux) {
  if (node.type === 'Candidat') return 0.95
  if (node.type === 'Domaine') return 0.5
  if (node.type === 'Projet') return 0.55
  const niveau = niveaux[node.id.split(':')[1]] ?? 2
  return 0.16 + niveau * 0.05
}

function Node({ node, position, size, dim, active, onHover, onSelect }) {
  const mesh = useRef()
  const style = NODE_STYLE[node.type] ?? NODE_STYLE.Competence
  const seed = useMemo(() => Math.random() * 10, [])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const target = active ? 1.35 : 1
    mesh.current.scale.lerp(new THREE.Vector3(target, target, target), 0.15)
    if (node.type === 'Projet') mesh.current.rotation.y += delta * 0.8
    if (node.type === 'Competence') mesh.current.position.y = Math.sin(t * 1.2 + seed) * 0.08
    const m = mesh.current.material
    m.opacity = THREE.MathUtils.lerp(m.opacity, dim ? 0.12 : 1, 0.15)
  })

  const handlers = {
    onPointerOver: (e) => {
      e.stopPropagation()
      onHover(node.id)
    },
    onPointerOut: () => onHover(null),
    onClick: (e) => {
      e.stopPropagation()
      onSelect(node.id)
    },
  }

  return (
    <group position={position}>
      <mesh ref={mesh} {...handlers}>
        {node.type === 'Projet' ? (
          <octahedronGeometry args={[size, 0]} />
        ) : (
          <sphereGeometry args={[size, 32, 32]} />
        )}
        <meshStandardMaterial
          color={style.color}
          emissive={style.color}
          emissiveIntensity={node.type === 'Candidat' ? 1.6 : 0.9}
          roughness={0.35}
          metalness={0.2}
          transparent
          toneMapped={false}
        />
      </mesh>
      {node.type === 'Domaine' && (
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[size * 1.7, 0.035, 8, 64]} />
          <meshBasicMaterial color={style.color} transparent opacity={dim ? 0.08 : 0.6} />
        </mesh>
      )}
      {node.type === 'Candidat' && (
        <mesh>
          <sphereGeometry args={[size * 1.6, 32, 32]} />
          <meshBasicMaterial color={style.color} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}
      {/* Zone de survol plus grande que l'étoile, pour viser facilement */}
      <mesh visible={false} {...handlers}>
        <sphereGeometry args={[Math.max(size * 1.8, 0.55), 12, 12]} />
      </mesh>
    </group>
  )
}

function Links({ graph, pos, focus, neighbors }) {
  const geom = useMemo(() => {
    const p = new Float32Array(graph.links.length * 6)
    graph.links.forEach((l, i) => {
      const a = pos[l.source]
      const b = pos[l.target]
      if (a && b) p.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(graph.links.length * 6), 3))
    return g
  }, [graph, pos])

  // Couleur des liens : couleur du nœud source, atténuée hors focus
  useEffect(() => {
    const col = geom.getAttribute('color')
    const c = new THREE.Color()
    graph.links.forEach((l, i) => {
      const src = graph.nodes.find((n) => n.id === l.source)
      c.set(NODE_STYLE[src?.type]?.color ?? '#ffffff')
      const on = !focus || l.source === focus || l.target === focus
      // Au repos, les fils candidat → compétence restent discrets pour laisser voir la structure
      const base = l.type === 'MAITRISE' ? 0.1 : 0.35
      const k = focus ? (on ? 0.9 : 0.04) : base
      col.setXYZ(i * 2, c.r * k, c.g * k, c.b * k)
      col.setXYZ(i * 2 + 1, c.r * k, c.g * k, c.b * k)
    })
    col.needsUpdate = true
  }, [geom, graph, focus, neighbors])

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  )
}

// Étiquettes HTML placées au-dessus des nœuds (projection 3D → écran à chaque frame)
function LabelProjector({ graph, pos, labelsRef, focus, neighbors }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    const els = labelsRef.current
    graph.nodes.forEach((n) => {
      const el = els[n.id]
      const p = pos[n.id]
      if (!el || !p) return
      v.copy(p).project(camera)
      const visible = v.z < 1
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -160%)`
      const inFocus = !focus || neighbors[focus]?.has(n.id)
      el.style.opacity = !visible ? 0 : inFocus ? (focus || n.type !== 'Competence' ? 1 : 0.6) : 0.08
    })
  })
  return null
}

export default function SkillGraph({ graph, niveaux, selected, onSelect }) {
  const wrap = useRef()
  const labelsRef = useRef({})
  const [hovered, setHovered] = useState(null)
  const [visible, setVisible] = useState(false)
  const { pos, neighbors } = useLayout(graph)
  const focus = hovered ?? selected

  // Ne calcule le rendu 3D que lorsque le graphe est à l'écran
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' })
    io.observe(wrap.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
  }, [hovered])

  return (
    <div ref={wrap} className="graph">
      <Canvas
        camera={{ position: [0, 3, 21], fov: 50 }}
        dpr={[1, 2]}
        frameloop={visible ? 'always' : 'never'}
        onPointerMissed={() => onSelect(null)}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 0, 0]} intensity={30} color="#d4ff3a" distance={20} />
        <Links graph={graph} pos={pos} focus={focus} neighbors={neighbors} />
        {graph.nodes.map((n) => (
          <Node
            key={n.id}
            node={n}
            position={pos[n.id]}
            size={nodeSize(n, niveaux)}
            dim={!!focus && !neighbors[focus]?.has(n.id)}
            active={focus === n.id}
            onHover={setHovered}
            onSelect={onSelect}
          />
        ))}
        <LabelProjector graph={graph} pos={pos} labelsRef={labelsRef} focus={focus} neighbors={neighbors} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={!focus}
          autoRotateSpeed={0.6}
          rotateSpeed={0.6}
        />
      </Canvas>

      <div className="graph__labels" aria-hidden="true">
        {graph.nodes.map((n) => (
          <span
            key={n.id}
            ref={(el) => (labelsRef.current[n.id] = el)}
            className={`graph__label graph__label--${n.type}`}
          >
            {nodeLabel(n)}
          </span>
        ))}
      </div>
    </div>
  )
}
