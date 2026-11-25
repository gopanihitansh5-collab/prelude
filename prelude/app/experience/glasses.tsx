'use client'

// The product reveal: Even Realities G2, built from primitives.
//
// Modelled from the real product, not from a generic smart-glasses idea:
//   • Round/oval lenses with a defined brow line — the G2 is not rectangular.
//   • A dark matte frame, thin temples that widen into a thicker end piece.
//   • The display is a green, pixel-dithered panel that floats to the wearer's
//     right, drawn as a bordered panel rather than a paragraph of text.
//   • The R1 ring sits beside the glasses as the optional controller.
//
// The lens texture is painted at low resolution and upscaled with smoothing
// off, which is what gives the real display its dotted, pixel-grid character.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GlassesProps {
  /** 0 → far and dark. 1 → close, lit, display active. */
  progress: number
  pointer: { x: number; y: number }
  bands: { header: string; body: string; status: string }
}

/**
 * Paint the display into a canvas texture.
 *
 * Two details make this read as the real G2 rather than a laptop screen:
 *   1. It is drawn at low resolution and upscaled with smoothing disabled, so
 *      every glyph has the dotted pixel edge the hardware produces.
 *   2. Content sits in a bordered panel, not free-flowing text — that is how the
 *      G2 firmware lays out a list.
 */
function useLensTexture(bands: { header: string; body: string; status: string }) {
  return useMemo(() => {
    const W = 288
    const H = 144
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)

    const green = '#7dffa8'
    const dim = '#3f8a5c'
    const mono = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

    // ── header: the countdown on the left, a battery glyph on the right ─────
    ctx.fillStyle = green
    ctx.font = `7px ${mono}`
    ctx.textBaseline = 'top'
    ctx.fillText(bands.header.replace(/^PRELUDE\s*·\s*/, '').slice(0, 22), 6, 5)

    ctx.strokeStyle = dim
    ctx.lineWidth = 1
    ctx.strokeRect(W - 22, 5, 12, 6)
    ctx.fillStyle = green
    ctx.fillRect(W - 20, 7, 6, 2)

    // ── the big clock, as the real display does ─────────────────────────────
    ctx.fillStyle = green
    ctx.font = `bold 26px ${mono}`
    ctx.fillText('09', 8, 20)
    ctx.fillText('41', 8, 46)

    // ── the panel: a bordered list, which is how the firmware lays out data ─
    const panelX = 78
    const panelY = 18
    const panelW = W - panelX - 8
    const panelH = H - panelY - 10

    ctx.strokeStyle = dim
    ctx.lineWidth = 1
    ctx.strokeRect(panelX, panelY, panelW, panelH)

    ctx.save()
    ctx.beginPath()
    ctx.rect(panelX + 1, panelY + 1, panelW - 2, panelH - 2)
    ctx.clip()

    ctx.fillStyle = green
    ctx.font = `6px ${mono}`
    const lines = bands.body.split('\n').filter(Boolean)
    lines.forEach((line, index) => {
      const y = panelY + 6 + index * 9
      if (y > panelY + panelH - 6) return
      ctx.fillText(line.slice(0, 30), panelX + 5, y)
    })

    ctx.fillStyle = dim
    ctx.font = `5px ${mono}`
    const statusLines = bands.status.split('\n').filter(Boolean)
    statusLines.forEach((line, index) => {
      const y = panelY + panelH - 14 + index * 7
      if (y > panelY + panelH - 4) return
      ctx.fillText(line.slice(0, 34), panelX + 5, y)
    })
    ctx.restore()

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    // The whole point: nearest-neighbour upscaling keeps the pixel grid.
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true
    return texture
  }, [bands.header, bands.body, bands.status])
}

/** One round lens: a torus rim, a brow line, and a glass disc. */
function Lens({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 0.52, 0, 0]}>
      <mesh scale={[1, 0.92, 1]}>
        <torusGeometry args={[0.42, 0.035, 12, 48]} />
        <meshStandardMaterial color="#14181a" metalness={0.85} roughness={0.32} />
      </mesh>

      {/* the brow line: a slightly thicker arc across the top */}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.62, 0.045, 0.05]} />
        <meshStandardMaterial color="#14181a" metalness={0.85} roughness={0.3} />
      </mesh>

      <mesh scale={[1, 0.92, 1]}>
        <circleGeometry args={[0.4, 48]} />
        <meshPhysicalMaterial
          color="#0d1a14"
          metalness={0.05}
          roughness={0.04}
          transmission={0.6}
          thickness={0.3}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export function Glasses({ progress, pointer, bands }: GlassesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const displayRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Group>(null)
  const lensTexture = useLensTexture(bands)

  useEffect(() => () => lensTexture?.dispose(), [lensTexture])

  const eased = progress * progress * (3 - 2 * progress)

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (groupRef.current) {
      // Scroll turns the glasses from a three-quarter view to face-on.
      groupRef.current.rotation.y =
        (1 - eased) * -0.62 + pointer.x * 0.16 + Math.sin(t * 0.3) * 0.015
      groupRef.current.rotation.x = (1 - eased) * 0.16 - pointer.y * 0.09
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.025
      groupRef.current.position.z = (1 - eased) * -1.1
    }

    if (displayRef.current) {
      // The display fades up and drifts out to the wearer's right, exactly as
      // the real panel sits beside the frame rather than on the lens.
      const reveal = Math.max(0, eased - 0.3) / 0.7
      displayRef.current.position.x = 0.95 + reveal * 0.42
      displayRef.current.position.y = 0.06 + reveal * 0.1
      displayRef.current.position.z = 0.1 + reveal * 0.2
      displayRef.current.rotation.y = -0.28 + reveal * 0.16
      const mesh = displayRef.current.children[0] as THREE.Mesh | undefined
      if (mesh) {
        const material = mesh.material as THREE.MeshBasicMaterial
        material.opacity = reveal * 0.95
      }
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.35
      ringRef.current.position.y = -0.42 + Math.sin(t * 0.7) * 0.02
    }
  })

  return (
    <group ref={groupRef} scale={1.15}>
      <Lens side={-1} />
      <Lens side={1} />

      {/* ── bridge ─────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.045]} />
        <meshStandardMaterial color="#14181a" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* ── temples: thin, then a thicker end piece ────────────────────── */}
      {[-1, 1].map((side) => (
        <group key={`temple-${side}`}>
          <mesh position={[side * 0.98, 0.06, -0.3]} rotation={[0, side * 0.14, 0]}>
            <boxGeometry args={[0.035, 0.035, 0.62]} />
            <meshStandardMaterial color="#14181a" metalness={0.85} roughness={0.34} />
          </mesh>
          <mesh position={[side * 1.06, 0.02, -0.62]} rotation={[0, side * 0.14, 0]}>
            <boxGeometry args={[0.055, 0.075, 0.2]} />
            <meshStandardMaterial color="#0e1113" metalness={0.7} roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* ── the display panel, floating to the wearer's right ──────────── */}
      <group ref={displayRef} position={[0.95, 0.06, 0.1]}>
        <mesh>
          <planeGeometry args={[1.15, 0.58]} />
          <meshBasicMaterial
            map={lensTexture}
            transparent
            opacity={0}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, -0.004]}>
          <planeGeometry args={[1.22, 0.64]} />
          <meshBasicMaterial color="#7dffa8" transparent opacity={0.05} toneMapped={false} />
        </mesh>
      </group>

      {/* ── the R1 ring, the optional controller ───────────────────────── */}
      <group ref={ringRef} position={[0.72, -0.42, 0.3]} rotation={[Math.PI / 2.4, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.1, 0.028, 10, 32]} />
          <meshStandardMaterial color="#2a2f33" metalness={0.95} roughness={0.18} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.1, 0.008, 8, 32]} />
          <meshBasicMaterial color="#7dffa8" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
