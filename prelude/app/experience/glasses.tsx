'use client'

// The product reveal: Even Realities G2, built from primitives.
//
// There is no licensed GLB for the G2, and shipping a generic VR headset would
// be a lie about the product. So the model is built from primitives to the real
// proportions: two rounded rectangular lenses, a thin bridge, slim temples, and
// a holographic card emerging from the right lens.
//
// The card is the point. It is not decoration — it is the actual Prelude brief,
// rendered as a texture from the same three bands the glasses paint.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GlassesProps {
  /** 0 → far and dark. 1 → close, lit, display active. */
  progress: number
  pointer: { x: number; y: number }
  bands: { header: string; body: string; status: string }
}

/** Paint the three bands into a canvas texture, exactly as the lens shows them. */
function useLensTexture(bands: { header: string; body: string; status: string }) {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1152
    canvas.height = 576
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const mono = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'
    const scale = 2

    // header — 32px band
    ctx.fillStyle = '#7dffa8'
    ctx.font = `${15 * scale}px ${mono}`
    ctx.textBaseline = 'middle'
    ctx.fillText(bands.header, 14 * scale, 16 * scale)

    // body — 200px band, 25px line height
    ctx.font = `${15 * scale}px ${mono}`
    const lines = bands.body.split('\n')
    lines.forEach((line, index) => {
      ctx.fillText(line, 14 * scale, (36 + 12 + index * 25) * scale)
    })

    // status — 44px band
    ctx.fillStyle = '#4d7a5e'
    ctx.font = `${13 * scale}px ${mono}`
    const statusLines = bands.status.split('\n')
    statusLines.forEach((line, index) => {
      ctx.fillText(line, 14 * scale, (244 + 10 + index * 20) * scale)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [bands.header, bands.body, bands.status])
}

export function Glasses({ progress, pointer, bands }: GlassesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const cardRef = useRef<THREE.Group>(null)
  const lensTexture = useLensTexture(bands)

  // A CanvasTexture holds GPU memory. Release it when the scene unmounts or the
  // bands change, or a route change leaks one texture per visit.
  useEffect(() => () => lensTexture?.dispose(), [lensTexture])

  const eased = progress * progress * (3 - 2 * progress)

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (groupRef.current) {
      // Scroll turns the glasses from a three-quarter view to face-on.
      groupRef.current.rotation.y = (1 - eased) * -0.55 + pointer.x * 0.18 + Math.sin(t * 0.3) * 0.02
      groupRef.current.rotation.x = (1 - eased) * 0.18 - pointer.y * 0.1
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.03
      groupRef.current.position.z = (1 - eased) * -1.2
    }

    if (cardRef.current) {
      // The holographic card rises out of the lens as the display activates.
      const reveal = Math.max(0, eased - 0.35) / 0.65
      cardRef.current.position.y = -0.55 + reveal * 0.62
      cardRef.current.position.z = 0.02 + reveal * 0.28
      cardRef.current.rotation.x = -0.35 + reveal * 0.28
      const material = cardRef.current.children[0] as THREE.Mesh | undefined
      if (material) {
        const meshMaterial = material.material as THREE.MeshBasicMaterial
        meshMaterial.opacity = reveal * 0.96
      }
    }
  })

  return (
    <group ref={groupRef} scale={1.05}>
      {/* ── lenses ─────────────────────────────────────────────────────── */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.62, 0, 0]}>
          {/* the frame */}
          <mesh>
            <boxGeometry args={[1.02, 0.62, 0.045]} />
            <meshStandardMaterial
              color="#0a0d0b"
              metalness={0.92}
              roughness={0.22}
              envMapIntensity={1.4}
            />
          </mesh>

          {/* the glass, slightly inset */}
          <mesh position={[0, 0, 0.026]}>
            <boxGeometry args={[0.94, 0.54, 0.008]} />
            <meshPhysicalMaterial
              color="#0b1a12"
              metalness={0.1}
              roughness={0.06}
              transmission={0.55}
              thickness={0.4}
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* the emissive display, only on the right lens */}
          {side === 1 && lensTexture && (
            <mesh position={[0, 0, 0.032]}>
              <planeGeometry args={[0.9, 0.45]} />
              <meshBasicMaterial
                map={lensTexture}
                transparent
                opacity={0.9}
                toneMapped={false}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* ── bridge ─────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.24, 0.055, 0.04]} />
        <meshStandardMaterial color="#0a0d0b" metalness={0.92} roughness={0.24} />
      </mesh>

      {/* ── temples ────────────────────────────────────────────────────── */}
      {[-1, 1].map((side) => (
        <mesh key={`temple-${side}`} position={[side * 1.16, 0.02, -0.34]} rotation={[0, side * 0.16, 0]}>
          <boxGeometry args={[0.055, 0.05, 0.72]} />
          <meshStandardMaterial color="#0a0d0b" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}

      {/* ── the holographic brief card ─────────────────────────────────── */}
      <group ref={cardRef} position={[0.62, -0.55, 0.02]}>
        <mesh>
          <planeGeometry args={[1.5, 0.75]} />
          <meshBasicMaterial
            map={lensTexture}
            transparent
            opacity={0}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* a faint frame so the card reads as a panel, not a floating image */}
        <mesh position={[0, 0, -0.002]}>
          <planeGeometry args={[1.56, 0.81]} />
          <meshBasicMaterial color="#7dffa8" transparent opacity={0.06} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
