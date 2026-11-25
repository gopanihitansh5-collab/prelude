'use client'

// The particle universe.
//
// The opening sequence from the creative brief: the page starts as a dark,
// empty universe. A tiny green point of light appears, expands, and thousands
// of connections emerge — a human knowledge network.
//
// Implementation notes:
//   • One BufferGeometry with a single Points object. Thousands of particles
//     cost one draw call, not thousands.
//   • The connection lines are a second, precomputed LineSegments buffer. They
//     are not recomputed per frame.
//   • Everything is driven by a single `progress` prop, so the whole sequence is
//     one number the scroll can drive.
//   • The render loop pauses when the canvas is off-screen (see the wrapper).

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 2600
const LINK_DISTANCE = 0.42
const MAX_LINKS = 3200

interface UniverseProps {
  /** 0 → a single point of light. 1 → the full network. */
  progress: number
  /** Cursor position, -1..1, for parallax. */
  pointer: { x: number; y: number }
}

function buildParticles() {
  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    // A flattened sphere: wider than tall, so it reads as a network in space
    // rather than a ball.
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const radius = 1.6 + Math.pow(Math.random(), 0.6) * 3.4

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) * 1.35
    positions[i * 3 + 1] = radius * Math.cos(phi) * 0.72
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

    seeds[i] = Math.random()
  }

  return { positions, seeds }
}

function buildLinks(positions: Float32Array) {
  const links: number[] = []
  const limit = LINK_DISTANCE * LINK_DISTANCE

  // O(n²) once, at mount. 2600² is 6.7M comparisons — a few milliseconds, and
  // it never runs again.
  for (let i = 0; i < COUNT && links.length < MAX_LINKS * 6; i++) {
    for (let j = i + 1; j < COUNT; j++) {
      const dx = positions[i * 3]! - positions[j * 3]!
      const dy = positions[i * 3 + 1]! - positions[j * 3 + 1]!
      const dz = positions[i * 3 + 2]! - positions[j * 3 + 2]!
      if (dx * dx + dy * dy + dz * dz < limit) {
        links.push(
          positions[i * 3]!,
          positions[i * 3 + 1]!,
          positions[i * 3 + 2]!,
          positions[j * 3]!,
          positions[j * 3 + 1]!,
          positions[j * 3 + 2]!,
        )
        if (links.length >= MAX_LINKS * 6) break
      }
    }
  }

  return new Float32Array(links)
}

export function ParticleUniverse({ progress, pointer }: UniverseProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const groupRef = useRef<THREE.Group>(null)
  const { size } = useThree()

  const { positions, seeds } = useMemo(buildParticles, [])
  const linkPositions = useMemo(() => buildLinks(positions), [positions])

  const pointGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return geometry
  }, [positions, seeds])

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3))
    return geometry
  }, [linkPositions])

  // A soft round sprite, generated once. A square point reads as a pixel; a
  // radial falloff reads as light.
  const sprite = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      gradient.addColorStop(0, 'rgba(180,255,205,1)')
      gradient.addColorStop(0.35, 'rgba(125,255,168,0.55)')
      gradient.addColorStop(1, 'rgba(125,255,168,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 64, 64)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const eased = progress * progress * (3 - 2 * progress)

    if (groupRef.current) {
      // Slow drift, plus a gentle parallax toward the cursor.
      groupRef.current.rotation.y = t * 0.045 + pointer.x * 0.22
      groupRef.current.rotation.x = Math.sin(t * 0.12) * 0.06 - pointer.y * 0.14
      groupRef.current.position.z = (1 - eased) * 2.2
    }

    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.PointsMaterial
      // The point of light expands into the network.
      material.size = 0.012 + eased * 0.026
      material.opacity = 0.25 + eased * 0.75
    }

    if (linesRef.current) {
      const material = linesRef.current.material as THREE.LineBasicMaterial
      // Connections only appear once the network has begun to form.
      material.opacity = Math.max(0, eased - 0.25) * 0.34
    }

    // Keep the camera framed on narrow screens. `size` is a stable object from
    // useThree, so this reads a value rather than allocating.
    const aspect = size.width / Math.max(1, size.height)
    state.camera.position.z = aspect < 1 ? 9.5 : 7.2
    state.camera.lookAt(0, 0, 0)
  })

  // Release GPU resources on unmount. Disposing the geometry does not dispose
  // the material's texture, so the sprite is released explicitly.
  useEffect(() => {
    return () => {
      pointGeometry.dispose()
      lineGeometry.dispose()
      sprite.dispose()
    }
  }, [pointGeometry, lineGeometry, sprite])

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={pointGeometry}>
        <pointsMaterial
          map={sprite}
          size={0.02}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#7dffa8"
          opacity={0.9}
        />
      </points>

      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color="#4dffa0"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  )
}
