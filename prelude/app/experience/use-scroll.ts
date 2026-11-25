'use client'

// The scroll choreography.
//
// One coordinated system, not a pile of disconnected animations. Lenis provides
// the smooth scroll; a single rAF loop reads the scroll position and writes it
// to CSS custom properties.
//
// The important design decision: this hook does NOT call setState per frame.
// A React re-render at 60fps re-renders every chapter and every canvas child,
// which is what makes a scroll-driven page feel broken. Instead the progress
// values are written to CSS custom properties on <html>, and the 3D scenes read
// them through a ref-based subscription. React state is used only for the
// coarse "which chapter is active" flag, which changes a handful of times.
//
// Deliberately NOT used: scroll hijacking. Lenis is configured with
// `syncTouch: false` and the page keeps native keyboard, anchor and scrollbar
// behaviour. If the user prefers reduced motion, Lenis is never started.

import { useEffect, useRef, useState } from 'react'

export interface ScrollProgress {
  /** 0..1 across the whole page. */
  page: number
  /** 0..1 across the hero. */
  hero: number
  /** 0..1 across the product section. */
  product: number
}

const INITIAL: ScrollProgress = { page: 0, hero: 0, product: 0 }

/** A tiny store so 3D scenes can read progress without re-rendering React. */
export interface ProgressStore {
  get: () => ScrollProgress
  subscribe: (handler: (progress: ScrollProgress) => void) => () => void
}

interface MutableProgressStore extends ProgressStore {
  set: (next: ScrollProgress) => void
}

export function createProgressStore(): MutableProgressStore {
  let current = INITIAL
  const handlers = new Set<(progress: ScrollProgress) => void>()
  return {
    get: () => current,
    subscribe: (handler) => {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
    set: (next) => {
      current = next
      for (const handler of handlers) handler(next)
    },
  }
}

function progressOf(el: HTMLElement | null): number {
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const total = rect.height + window.innerHeight
  return Math.min(1, Math.max(0, (window.innerHeight - rect.top) / total))
}

export function useScrollChoreography(): {
  store: MutableProgressStore
  /** Coarse: which chapter is in view. Changes rarely, so state is fine. */
  activeChapter: string
} {
  const storeRef = useRef<MutableProgressStore | null>(null)
  if (!storeRef.current) storeRef.current = createProgressStore()
  const store = storeRef.current

  const [activeChapter, setActiveChapter] = useState('hero')
  const frame = useRef(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = document.documentElement

    let lenis: { raf: (time: number) => void; destroy: () => void } | null = null
    let cancelled = false
    let lastChapter = ''

    const measure = () => {
      frame.current = 0

      const max = Math.max(1, root.scrollHeight - window.innerHeight)
      const page = Math.min(1, Math.max(0, window.scrollY / max))

      const heroEl = document.querySelector<HTMLElement>('[data-scene="hero"]')
      const productEl = document.querySelector<HTMLElement>('[data-scene="product"]')

      const next: ScrollProgress = {
        page,
        hero: progressOf(heroEl),
        product: progressOf(productEl),
      }

      // Write to CSS, not to React. The 3D scenes read these through the store.
      root.style.setProperty('--scroll-page', String(page))
      root.style.setProperty('--scroll-hero', String(next.hero))
      root.style.setProperty('--scroll-product', String(next.product))
      store.set(next)

      // Coarse chapter tracking: only setState when it actually changes.
      const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
      let current = lastChapter
      for (const chapter of chapters) {
        const rect = chapter.getBoundingClientRect()
        if (rect.top <= window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5) {
          current = chapter.dataset.chapter ?? current
          break
        }
      }
      if (current !== lastChapter) {
        lastChapter = current
        setActiveChapter(current)
      }
    }

    const schedule = () => {
      if (frame.current === 0) frame.current = window.requestAnimationFrame(measure)
    }

    if (!reduced) {
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
  }, [store])

  return { store, activeChapter }
}
