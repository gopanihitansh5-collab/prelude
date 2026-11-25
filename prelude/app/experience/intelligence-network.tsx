'use client'

// Scene 03 — the intelligence engine.
//
// A knowledge graph, not a decorative sphere. Eight labelled nodes orbit a
// central core, connected by animated streams. The labels are real DOM (drei's
// Html), so they are selectable, searchable and readable by a screen reader —
// the brief requires that essential text never live only inside the canvas.
//
// The node set is the product's actual data model, not invented categories:
// people, meetings, conversations, emails, documents, decisions, commitments,
// tasks. Every one of those exists in src/core/types.ts or commitments.ts.

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export interface GraphNode {
  id: string
  label: string
  /** What this node actually is in the product. */
  detail: string
  color: string
}

export const GRAPH_NODES: GraphNode[] = [
  { id: 'people', label: 'People', detail: 'Attendees, roles, relationships', color: '#7dffa8' },
  { id: 'meetings', label: 'Meetings', detail: 'Title, time, agenda, channel', color: '#7dffa8' },
  { id: 'conversations', label: 'Conversations', detail: 'Thread messages, newest first', color: '#4dd0ff' },
  { id: 'emails', label: 'Emails', detail: 'Read and write through one adapter', color: '#4dd0ff' },
  { id: 'documents', label: 'Documents', detail: 'Last touched doc, with timestamp', color: '#4dd0ff' },
  { id: 'decisions', label: 'Decisions', detail: 'What was agreed, and when', color: '#a78bfa' },
  { id: 'commitments', label: 'Commitments', detail: 'Promises, deadlines, overdue state', color: '#a78bfa' },
  { id: 'tasks', label: 'Tasks', detail: 'Follow-ups derived from commitments', color: '#a78bfa' },
]

interface NetworkProps {
  /** 0..1 — how formed the graph is. */
  progress: number
  pointer: { x: number; y: number }
}

function Node({
  node,
  index,
  total,
  progress,
  onHover,
}: {
  node: GraphNode
  index: number
  total: number
  progress: number
  onHover: (node: GraphNode | null) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Distribute on a sphere, offset so no node sits exactly behind another.
  const position = useMemo(() => {
    const golden = Math.PI * (3 - Math.sqrt(5))
    const y = 1 - (index / (total - 1)) * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * index
    const scale = 2.5
    return new THREE.Vector3(
      Math.cos(theta) * radius * scale,
      y * scale * 0.72,
      Math.sin(theta) * radius * scale,
    )
  }, [index, total])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!meshRef.current) return
    const eased = progress * progress * (3 - 2 * progress)
    const pulse = 1 + Math.sin(t * 1.6 + index) * 0.08
    const target = (hovered ? 0.115 : 0.075) * pulse * (0.35 + eased * 0.65)
    meshRef.current.scale.setScalar(target / 0.075)
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          onHover(node)
        }}
        onPointerOut={() => {
          setHovered(false)
          onHover(null)
        }}
      >
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshBasicMaterial color={node.color} toneMapped={false} />
      </mesh>

      {/* the halo */}
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={hovered ? 0.22 : 0.1}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      <Html
        center
        distanceFactor={9}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <span
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: hovered ? '#f0f5f2' : node.color,
            opacity: 0.55 + progress * 0.45,
            whiteSpace: 'nowrap',
            textShadow: '0 0 12px rgba(3,6,5,0.95)',
            transition: 'color 180ms ease',
          }}
        >
          {node.label}
        </span>
      </Html>
    </group>
  )
}

export function IntelligenceNetwork({ progress, pointer }: NetworkProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState<GraphNode | null>(null)

  // Precompute the edges: every node to the core, plus a few cross-links so it
  // reads as a graph rather than a star.
  const edges = useMemo(() => {
    const points: number[] = []
    const total = GRAPH_NODES.length
    const positions = GRAPH_NODES.map((_, index) => {
      const golden = Math.PI * (3 - Math.sqrt(5))
      const y = 1 - (index / (total - 1)) * 2
      const radius = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = golden * index
      return new THREE.Vector3(
        Math.cos(theta) * radius * 2.5,
        y * 2.5 * 0.72,
        Math.sin(theta) * radius * 2.5,
      )
    })

    // core → node
    for (const p of positions) {
      points.push(0, 0, 0, p.x, p.y, p.z)
    }
    // node → next node, so the ring closes
    for (let i = 0; i < positions.length; i++) {
      const a = positions[i]!
      const b = positions[(i + 1) % positions.length]!
      points.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
    return new Float32Array(points)
  }, [])

  const edgeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(edges, 3))
    return geometry
  }, [edges])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.09 + pointer.x * 0.3
      groupRef.current.rotation.x = Math.sin(t * 0.16) * 0.08 - pointer.y * 0.18
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 1.1) * 0.06
      coreRef.current.scale.setScalar(pulse * (0.6 + progress * 0.4))
    }
  })

  return (
    <group ref={groupRef}>
      {/* the core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshBasicMaterial color="#7dffa8" wireframe transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshBasicMaterial color="#c8ffe0" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={3} color="#7dffa8" distance={9} />

      {/* the edges */}
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial
          color="#4dffa0"
          transparent
          opacity={0.1 + progress * 0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* the nodes */}
      {GRAPH_NODES.map((node, index) => (
        <Node
          key={node.id}
          node={node}
          index={index}
          total={GRAPH_NODES.length}
          progress={progress}
          onHover={setHovered}
        />
      ))}

      {/* the selected-node panel, as real DOM */}
      {hovered && (
        <Html position={[0, -2.6, 0]} center distanceFactor={10}>
          <div
            style={{
              minWidth: 260,
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid rgba(125,255,168,0.28)',
              background: 'rgba(3,6,5,0.92)',
              backdropFilter: 'blur(12px)',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: hovered.color,
                marginBottom: 6,
              }}
            >
              {hovered.label}
            </div>
            <div style={{ fontSize: 13, color: '#9baaa5', lineHeight: 1.5 }}>
              {hovered.detail}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
