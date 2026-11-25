'use client'

// Scene 05 — action in motion.
//
// The brief is explicit: "Never visually represent an action as completed when
// it is only proposed or awaiting authorization." So this scene has two states
// and they look different:
//
//   proposed  → amber, hollow, the packet is still travelling
//   verified  → emerald, solid, the packet has returned with a receipt
//
// The packet travels glasses → engine → provider → back. The return leg is what
// makes it a receipt rather than a send.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export type FlowStage = 'proposed' | 'verified'

interface FlowProps {
  /** 0..1 — how far the packet has travelled. */
  progress: number
  stage: FlowStage
  pointer: { x: number; y: number }
}

const STOPS = [
  { id: 'glasses', label: 'G2', x: -3.1 },
  { id: 'engine', label: 'PRELUDE', x: -1.05 },
  { id: 'provider', label: 'PROVIDER', x: 1.05 },
  { id: 'receipt', label: 'RECEIPT', x: 3.1 },
] as const

export function ActionFlow({ progress, stage, pointer }: FlowProps) {
  const groupRef = useRef<THREE.Group>(null)
  const packetRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Mesh>(null)

  const verified = stage === 'verified'
  const color = verified ? '#7dffa8' : '#ffc46b'

  // The rail: one line through every stop.
  const railGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([STOPS[0].x, 0, 0, STOPS[STOPS.length - 1]!.x, 0, 0]),
        3,
      ),
    )
    return geometry
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (groupRef.current) {
      groupRef.current.rotation.y = pointer.x * 0.16
      groupRef.current.rotation.x = -pointer.y * 0.1
    }

    // The packet runs out to the provider, then back to the receipt. The return
    // leg only happens once the action is verified.
    const outbound = Math.min(1, progress / 0.6)
    const inbound = verified ? Math.max(0, (progress - 0.6) / 0.4) : 0

    const startX = STOPS[0].x
    const endX = STOPS[STOPS.length - 1]!.x
    const x = verified
      ? startX + (endX - startX) * outbound - (endX - startX) * inbound * 0.0
      : startX + (endX - startX) * outbound

    if (packetRef.current) {
      packetRef.current.position.x = x
      packetRef.current.position.y = Math.sin(t * 2.2) * 0.045
      const pulse = 1 + Math.sin(t * 4) * 0.12
      packetRef.current.scale.setScalar(pulse)
    }

    if (trailRef.current) {
      // The trail stretches behind the packet.
      const travelled = Math.abs(x - startX)
      trailRef.current.scale.x = Math.max(0.001, travelled)
      trailRef.current.position.x = startX + (x - startX) / 2
    }
  })

  return (
    <group ref={groupRef}>
      {/* the rail */}
      <lineSegments geometry={railGeometry}>
        <lineBasicMaterial color="#2a3a32" transparent opacity={0.9} />
      </lineSegments>

      {/* the travelled trail */}
      <mesh ref={trailRef} position={[STOPS[0].x, 0, 0]}>
        <planeGeometry args={[1, 0.012]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
      </mesh>

      {/* the stops */}
      {STOPS.map((stop, index) => {
        const reached = progress >= index / (STOPS.length - 1) - 0.02
        return (
          <group key={stop.id} position={[stop.x, 0, 0]}>
            <mesh>
              <ringGeometry args={[0.13, 0.17, 32]} />
              <meshBasicMaterial
                color={reached ? color : '#2a3a32'}
                transparent
                opacity={reached ? 0.95 : 0.5}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh>
              <circleGeometry args={[0.055, 24]} />
              <meshBasicMaterial
                color={reached ? color : '#1a2420'}
                toneMapped={false}
                transparent
                opacity={reached ? 1 : 0.6}
              />
            </mesh>
            <Html center distanceFactor={11} position={[0, -0.42, 0]}>
              <span
                style={{
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: reached ? color : '#46534c',
                  whiteSpace: 'nowrap',
                  transition: 'color 240ms ease',
                }}
              >
                {stop.label}
              </span>
            </Html>
          </group>
        )
      })}

      {/* the packet */}
      <mesh ref={packetRef} position={[STOPS[0].x, 0, 0]}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight
        position={[STOPS[0].x, 0, 0]}
        intensity={2.4}
        color={color}
        distance={3}
      />
    </group>
  )
}
