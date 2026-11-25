'use client'

// Scene 06 — the connected ecosystem.
//
// The brief's rule: "Only represent integrations as available when they are
// genuinely implemented. Label planned integrations as coming soon."
//
// So this scene reads its state from the same registry the server uses. A
// provider with a key is `live`; one implemented but unconfigured is `ready`;
// one not built is `planned`. The visual difference is real, not decorative.

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export type ProviderState = 'live' | 'ready' | 'planned'

export interface Provider {
  id: string
  label: string
  /** What Prelude actually uses it for. */
  use: string
  state: ProviderState
  /** read, write, or both */
  access: 'read' | 'write' | 'both'
}

const STATE_COLOR: Record<ProviderState, string> = {
  live: '#7dffa8',
  ready: '#4dd0ff',
  planned: '#46534c',
}

interface EcosystemProps {
  providers: Provider[]
  pointer: { x: number; y: number }
}

function ProviderNode({
  provider,
  index,
  total,
  onHover,
}: {
  provider: Provider
  index: number
  total: number
  onHover: (p: Provider | null) => void
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)
  const color = STATE_COLOR[provider.state]

  const position = useMemo(() => {
    const angle = (index / total) * Math.PI * 2
    const radius = 2.35
    return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.62, 0)
  }, [index, total])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * 1.4 + index * 0.8) * 0.07
    meshRef.current.scale.setScalar((hovered ? 1.35 : 1) * pulse)
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          onHover(provider)
        }}
        onPointerOut={() => {
          setHovered(false)
          onHover(null)
        }}
      >
        <circleGeometry args={[0.19, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={provider.state === 'planned' ? 0.28 : 0.9}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* a ring marks a live provider; a dashed absence marks a planned one */}
      <mesh>
        <ringGeometry args={[0.24, 0.265, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={provider.state === 'live' ? 0.85 : provider.state === 'ready' ? 0.45 : 0.16}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <Html center distanceFactor={10} position={[0, -0.42, 0]}>
        <span
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: hovered ? '#f0f5f2' : color,
            opacity: provider.state === 'planned' ? 0.5 : 0.9,
            whiteSpace: 'nowrap',
            transition: 'color 180ms ease',
          }}
        >
          {provider.label}
        </span>
      </Html>
    </group>
  )
}

export function Ecosystem({ providers, pointer }: EcosystemProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState<Provider | null>(null)

  const spokes = useMemo(() => {
    const points: number[] = []
    providers.forEach((_, index) => {
      const angle = (index / providers.length) * Math.PI * 2
      points.push(0, 0, 0, Math.cos(angle) * 2.35, Math.sin(angle) * 2.35 * 0.62, 0)
    })
    return new Float32Array(points)
  }, [providers])

  const spokeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(spokes, 3))
    return geometry
  }, [spokes])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.1) * 0.04
      groupRef.current.rotation.y = pointer.x * 0.2
      groupRef.current.rotation.x = -pointer.y * 0.12
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.4
      coreRef.current.rotation.x = t * 0.22
    }
  })

  return (
    <group ref={groupRef}>
      {/* the core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshBasicMaterial color="#7dffa8" wireframe transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshBasicMaterial color="#c8ffe0" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={2.6} color="#7dffa8" distance={8} />

      <lineSegments geometry={spokeGeometry}>
        <lineBasicMaterial color="#2a3a32" transparent opacity={0.7} />
      </lineSegments>

      {providers.map((provider, index) => (
        <ProviderNode
          key={provider.id}
          provider={provider}
          index={index}
          total={providers.length}
          onHover={setHovered}
        />
      ))}

      {hovered && (
        <Html position={[0, -2.35, 0]} center distanceFactor={10}>
          <div
            style={{
              minWidth: 280,
              padding: '14px 16px',
              borderRadius: 12,
              border: `1px solid ${STATE_COLOR[hovered.state]}44`,
              background: 'rgba(3,6,5,0.94)',
              backdropFilter: 'blur(12px)',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: STATE_COLOR[hovered.state],
                }}
              >
                {hovered.label}
              </span>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: 999,
                  border: `1px solid ${STATE_COLOR[hovered.state]}55`,
                  color: STATE_COLOR[hovered.state],
                }}
              >
                {hovered.state}
              </span>
              <span style={{ fontSize: 9, color: '#596762', letterSpacing: '0.08em' }}>
                {hovered.access}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#9baaa5', lineHeight: 1.5 }}>{hovered.use}</div>
          </div>
        </Html>
      )}
    </group>
  )
}
