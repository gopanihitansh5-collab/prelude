'use client'

// The scroll choreography.
//
// One coordinated system, not a pile of disconnected animations. Lenis provides
// the smooth scroll; a single rAF loop reads the scroll position and writes it
// to CSS custom properties and to React state for the 3D scenes.
//
// Deliberately NOT used: scroll hijacking. Lenis is configured with
// `syncTouch: false` and the page keeps native keyboard, anchor and
// scrollbar behaviour. If the user prefers reduced motion, Lenis is never
// started and the page scrolls natively.

import { useEffect, useRef, useState } from 'react'

export interface ScrollState {
  /** 0..1 across the whole page. */
  page: number
  /** 0..1 across the hero. */
  hero: number
  /** 0..1 across the product section. */
  product: number
}

const INITIAL: ScrollState = { page: 0, hero: 0, product: 0 }

export function useScrollChoreography() {
  const [state, setState] = useState<ScrollState>(INITIAL)
  const frame = useRef(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let lenis: { raf: (time: number) => void; destroy: () => void } | null = null
    let cancelled = false

    const measure = () => {
      frame.current = 0
      const doc = document.documentElement
      const max = Math.max(1, doc.scrollHeight - window.innerHeight)
      const page = Math.min(1, Math.max(0, window.scrollY / max))

      const heroEl = document.querySelector<HTMLElement>('[data-scene="hero"]')
      const productEl = document.querySelector<HTMLElement>('[data-scene="product"]')

      const progressOf = (el: HTMLElement | null) => {
        if (!el) return 0
        const rect = el.getBoundingClientRect()
        const total = rect.height + window.innerHeight
        return Math.min(1, Math.max(0, (window.innerHeight - rect.top) / total))
      }

      setState({ page, hero: progressOf(heroEl), product: progressOf(productEl) })
    }

    const schedule = () => {
      if (frame.current === 0) frame.current = window.requestAnimationFrame(measure)
    }

    if (!reduced) {
      // Lenis is imported dynamically so it never lands in the initial bundle.
      import('lenis')
        .then(({ default: Lenis }) => {
          if (cancelled) return
          const instance = new Lenis({
            duration: 1.05,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            syncTouch: false,
          })
          lenis = instance as unknown as { raf: (time: number) => void; destroy: () => void }

          const raf = (time: number) => {
            instance.raf(time)
            schedule()
            if (!cancelled) window.requestAnimationFrame(raf)
          }
          window.requestAnimationFrame(raf)
        })
        .catch(() => {
          /* no smooth scroll: native scrolling still works */
        })
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    measure()

    return () => {
      cancelled = true
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame.current) window.cancelAnimationFrame(frame.current)
      lenis?.destroy()
    }
  }, [])

  return state
}
