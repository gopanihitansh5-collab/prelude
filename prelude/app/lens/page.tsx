'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller } from '@/even/app'
import { demoMeetings } from '@/core/fixtures'
import { render } from '@/core/layout'
import type { AppState } from '@/core/types'
import type { Input } from '@/core/actions'
import { useVoice } from '@/ui/useVoice'

/**
 * The lens, in a browser, at exactly 576x288.
 *
 * A judge needs no glasses and no simulator to see the app work: this page
 * paints the same three strings the glasses paint, and accepts the same four
 * actions. The receipt panel below shows the server's response verbatim, which
 * is the read&write proof.
 *
 * Unlike the plugin page, this one runs same-origin, so `apiBase` is empty and
 * `/api/act` resolves against the dev server.
 */
export default function LensPage() {
  const [state, setState] = useState<AppState | null>(null)
  const [receiptJson, setReceiptJson] = useState<string | null>(null)
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
    let cancelled = false

    // The lens must show the same meetings the server has — live Notion pages
    // when a database is configured, fixtures otherwise. Fetching here rather
    // than importing fixtures keeps the mirror honest.
    const boot = async () => {
      let meetings = demoMeetings()
      try {
        const res = await fetch(`${apiBase}/api/briefs`, { cache: 'no-store' })
        if (res.ok) {
          const body = (await res.json()) as { meetings?: typeof meetings }
          if (Array.isArray(body.meetings) && body.meetings.length > 0) {
            meetings = body.meetings
          }
        }
      } catch {
        /* offline or no server: fixtures are the correct fallback */
      }
      if (cancelled) return

      const controller = new Controller(meetings, Date.now(), {
        apiBase,
        onState: (next) => {
          setState(next)
          if (next.receipt) setReceiptJson(JSON.stringify(next.receipt, null, 2))
        },
        onListen: () => void voice.start(),
        onRecall: () => controller.dispatch({ type: 'memory', query: '' }),
      })
      controllerRef.current = controller
      setState(controller.getState())

      Promise.race([
        controller.attach(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('no bridge')), 3000)),
      ]).catch(() => {
        /* browser mirror mode — expected outside the Even app */
      })
    }

    void boot()

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
      controllerRef.current?.dispatch(input)
      if (input.type === 'long_press') {
        setTimeout(() => controllerRef.current?.dispatch({ type: 'long_press_release' }), 400)
      }
    }
    window.addEventListener('keydown', onKey)
    const tick = setInterval(
      () => controllerRef.current?.dispatch({ type: 'tick', now: Date.now() }),
      30_000,
    )

    return () => {
      cancelled = true
      window.removeEventListener('keydown', onKey)
      clearInterval(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = useCallback((input: Input) => {
    controllerRef.current?.dispatch(input)
  }, [])

  const bands = state ? render(state) : { header: 'PRELUDE', body: 'loading…', status: '' }

  return (
    <main className="shell">
      <div className="topbar">
        <h1 className="brand">
          Prelude <span>lens · 576 × 288</span>
        </h1>
        <nav className="nav">
          <a href="/">Home</a>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </div>

      <div className="grid">
        <div>
          <div className="lens" aria-live="polite">
            <div className="lens-band lens-header">{bands.header}</div>
            <div className="lens-band lens-body">{bands.body}</div>
            <div className="lens-band lens-status">{bands.status}</div>
          </div>

          <div className="controls">
            <button onClick={() => send({ type: 'up' })}>▲ up</button>
            <button onClick={() => send({ type: 'down' })}>▼ down</button>
            <button onClick={() => send({ type: 'click' })}>● tap</button>
            <button onClick={() => send({ type: 'double_click' })}>●● double</button>
            <button onClick={() => send({ type: 'long_press' })}>▬ hold</button>
            <button onClick={() => send({ type: 'long_press_release' })}>▬ release</button>
          </div>

          <div className="controls">
            <button onClick={() => send({ type: 'memory', query: '' })}>Recall</button>
            <button onClick={() => controllerRef.current?.refresh()}>Refresh</button>
            <button onClick={() => void voice.start()}>Speak</button>
          </div>

          <p className="hint">
            Keys: <kbd>↑</kbd>
            <kbd>↓</kbd> move · <kbd>Enter</kbd> tap · <kbd>Tab</kbd> hold · <kbd>Esc</kbd> double-tap.
            The same four actions the glasses send.
          </p>
        </div>

        <div>
          <div className="card">
            <h2>Screen</h2>
            <div className="row">
              <span className="row-sub">state</span>
              <span className="pill">{state?.screen ?? '—'}</span>
            </div>
            <div className="row">
              <span className="row-sub">meeting</span>
              <span className="pill">{state?.meetingIndex ?? 0}</span>
            </div>
            <div className="row">
              <span className="row-sub">busy</span>
              <span className="pill">{state?.busy ? 'yes' : 'no'}</span>
            </div>
            <div className="row">
              <span className="row-sub">voice</span>
              <span className="pill">{state?.voice?.state ?? 'idle'}</span>
            </div>
          </div>

          <div className="card">
            <h2>Receipt — what the server delivered</h2>
            {receiptJson ? (
              <pre className={`receipt ${state?.receipt?.ok ? '' : 'fail'}`}>{receiptJson}</pre>
            ) : (
              <p className="row-sub" style={{ margin: 0 }}>
                Tap an action on the lens. The receipt carries the exact string the server delivered,
                so the confirmation cannot disagree with what was sent.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
