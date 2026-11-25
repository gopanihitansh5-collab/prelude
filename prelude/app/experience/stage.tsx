'use client'

// The WebGL stage.
//
// Rules this file enforces, from the performance brief:
//   • The canvas is lazy — it only mounts when the section is near the viewport.
//   • Rendering pauses when the section is off-screen (`frameloop`).
//   • Device pixel ratio is capped at 2.
//   • If WebGL is unavailable, or the user prefers reduced motion, the canvas
//     never mounts and the CSS fallback stays visible.
//   • The text is never inside the canvas. It is DOM, above it.

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ParticleUniverse } from './particle-universe'
import { Glasses } from './glasses'
import { IntelligenceNetwork } from './intelligence-network'
import { ActionFlow, type FlowStage } from './action-flow'
import { Ecosystem, type Provider } from './ecosystem'

export type SceneKind = 'universe' | 'glasses' | 'network' | 'flow' | 'ecosystem'

interface StageProps {
  scene: SceneKind
  /** 0..1, driven by scroll. */
  progress: number
  bands: { header: string; body: string; status: string }
  /** Only used by the flow scene. */
  flowStage?: FlowStage
  /** Only used by the ecosystem scene. */
  providers?: Provider[]
  /** Camera distance. Scenes have different natural framings. */
  cameraZ?: number
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}

export function Stage({
  scene,
  progress,
  bands,
  flowStage = 'proposed',
  providers = [],
  cameraZ = 7.2,
}: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setEnabled(!reduced && supportsWebGL())
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: '200px' },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!enabled) return
    const onMove = (event: PointerEvent) => {
      setPointer({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled])

  return (
    <div ref={hostRef} className="stage" aria-hidden="true">
      {enabled && visible ? (
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, cameraZ], fov: 42 }}
          // Pause the loop entirely when the section is off-screen.
          frameloop={visible ? 'always' : 'never'}
        >
          <color attach="background" args={['#030605']} />
          <fog attach="fog" args={['#030605', 6, 16]} />

          <ambientLight intensity={0.35} />
          <directionalLight position={[3, 4, 5]} intensity={1.1} color="#c8ffe0" />
          <pointLight position={[-4, -2, 3]} intensity={2.2} color="#7dffa8" distance={12} />
          <pointLight position={[4, 3, -3]} intensity={1.4} color="#4dd0ff" distance={14} />

          <Suspense fallback={null}>
            {scene === 'universe' && <ParticleUniverse progress={progress} pointer={pointer} />}
            {scene === 'glasses' && (
              <Glasses progress={progress} pointer={pointer} bands={bands} />
            )}
            {scene === 'network' && (
              <IntelligenceNetwork progress={progress} pointer={pointer} />
            )}
            {scene === 'flow' && (
              <ActionFlow progress={progress} stage={flowStage} pointer={pointer} />
            )}
            {scene === 'ecosystem' && <Ecosystem providers={providers} pointer={pointer} />}
          </Suspense>
        </Canvas>
      ) : null}
    </div>
  )
}
