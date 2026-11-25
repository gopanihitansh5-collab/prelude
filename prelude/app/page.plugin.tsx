'use client'

import { useEffect, useRef, useState } from 'react'
import { Controller } from '@/even/app'
import { demoMeetings } from '@/core/fixtures'
import { render } from '@/core/layout'
import type { AppState } from '@/core/types'
import type { Input } from '@/core/actions'
import { useVoice } from '@/ui/useVoice'

/**
 * The plugin entry point — this is what runs inside the Even Realities App
 * WebView and what `evenhub pack` bundles into the .ehpk.
 *
 * It does three things:
 *   1. Attach the SDK bridge and drive the three text containers.
 *   2. Keep a 576x288 mirror of the same three strings, so the app is
 *      inspectable in a browser and in the simulator without glasses.
 *   3. Wire voice: mic → /api/stt → /api/parse → review → tap to confirm.
 *
 * There is no second rendering path: both paint `render(state)`.
 *
 * The API base matters here in a way it does not on /lens. A packaged .ehpk is
 * a static export with no /api routes of its own, so `fetch('/api/act')` would
 * resolve against the WebView's file origin and fail. NEXT_PUBLIC_API_BASE must
 * be an absolute https origin, and that origin must also be in app.json's
 * network whitelist.
 */
export default function PluginPage() {
  const [state, setState] = useState<AppState | null>(null)
  const controllerRef = useRef<Controller | null>(null)

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '')

  const voice = useVoice({
    apiBase,
    onState: (voiceState) => {
      controllerRef.current?.dispatch({ type: 'voice', to: voiceState })
    },
    onProposal: (proposal, transcript) => {
      controllerRef.current?.dispatch({ type: 'voice', to: 'review', proposal, transcript })
    },
    onError: (error) => {
      controllerRef.current?.dispatch({ type: 'voice', to: 'error', error })
    },
  })

  useEffect(() => {
    const controller = new Controller(demoMeetings(), Date.now(), {
      apiBase,
      onState: setState,
      onListen: () => void voice.start(),
      onRecall: () => controller.dispatch({ type: 'memory', query: '' }),
    })
    controllerRef.current = controller
    setState(controller.getState())

    // Fetch real briefs when a backend is configured; fall back silently to
    // fixtures so a demo with no network still works.
    if (apiBase) void controller.refresh()

    // waitForEvenAppBridge() never resolves in a plain browser, so race it.
    // In the browser the mirror still works; on hardware the bridge wins.
    Promise.race([
      controller.attach(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('no bridge')), 3000)),
    ]).catch((err: unknown) => {
      console.info('[prelude] no Even bridge — running as a 576x288 mirror.', err)
    })

    const KEY_MAP: Record<string, Input> = {
      ArrowUp: { type: 'up' },
      ArrowDown: { type: 'down' },
      Enter: { type: 'click' },
      ' ': { type: 'click' },
      Tab: { type: 'long_press' },
      Escape: { type: 'double_click' },
    }

    const onKey = (event: KeyboardEvent) => {
      const input = KEY_MAP[event.key]
      if (!input) return
      event.preventDefault()
      controller.dispatch(input)
      if (input.type === 'long_press') {
        setTimeout(() => controller.dispatch({ type: 'long_press_release' }), 400)
      }
    }
    window.addEventListener('keydown', onKey)

    const tick = setInterval(() => controller.dispatch({ type: 'tick', now: Date.now() }), 30_000)

    return () => {
      window.removeEventListener('keydown', onKey)
      clearInterval(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bands = state ? render(state) : { header: 'PRELUDE', body: 'loading…', status: '' }

  return (
    <div className="lens" aria-live="polite">
      <div className="lens-band lens-header">{bands.header}</div>
      <div className="lens-band lens-body">{bands.body}</div>
      <div className="lens-band lens-status">{bands.status}</div>
    </div>
  )
}
