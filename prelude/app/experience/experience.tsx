'use client'

// The immersive landing experience.
//
// Seven chapters, one continuous scroll. The 3D scenes are lazy and pause when
// off-screen; the text is always DOM so it stays selectable, searchable and
// accessible.
//
// Chapter map:
//   01 ARRIVAL      — particle universe, the point of light expands
//   02 REVEAL       — the glasses, the display activates
//   03 INTELLIGENCE — the network (reuses the universe at full progress)
//   04 EXPERIENCE   — the real lens, rendered from the real render()
//   05 ACTION       — the round trip, four steps
//   06 ECOSYSTEM    — what is actually wired
//   07 CLOSING      — one card, one tap

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Stage } from './stage'
import { useScrollChoreography } from './use-scroll'
import type { Provider } from './ecosystem'
import './experience.css'

interface ExperienceProps {
  bands: { header: string; body: string; status: string }
  mode: 'demo' | 'live'
  enriched: number
  llmLive: boolean
  testCount: number
  providers: Provider[]
}

export function Experience({
  bands,
  mode,
  enriched,
  llmLive,
  testCount,
  providers,
}: ExperienceProps) {
  const { store, activeChapter } = useScrollChoreography()
  const navRef = useRef<HTMLElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)

  // `activeChapter` drives the nav highlight. It changes a handful of times
  // across the page, so it is safe as React state.
  const chapterHref: Record<string, string> = {
    intelligence: '#intelligence',
    roundtrip: '#roundtrip',
    ecosystem: '#ecosystem',
  }
  const activeHref = chapterHref[activeChapter]

  // The 3D scenes read progress from the store, so the page itself does not
  // re-render on scroll. A local state mirror is kept only for the two scenes
  // that need a numeric prop; it updates at most a few times per second.
  const [progress, setProgress] = useState({ hero: 0, product: 0 })

  useEffect(() => {
    let last = { hero: -1, product: -1 }
    return store.subscribe((next) => {
      // Quantise to 1/60 so React re-renders at most ~60 times across the whole
      // page rather than on every frame.
      const hero = Math.round(next.hero * 60) / 60
      const product = Math.round(next.product * 60) / 60
      if (hero !== last.hero || product !== last.product) {
        last = { hero, product }
        setProgress({ hero, product })
      }
    })
  }, [store])

  // Nav hairline + reveal-on-enter + lens tilt. All optional enhancement.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const onScroll = () => {
      if (navRef.current) navRef.current.dataset.scrolled = String(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const revealables = Array.from(document.querySelectorAll<HTMLElement>('.xp-reveal'))
    let observer: IntersectionObserver | null = null

    if (reduced) {
      for (const el of revealables) el.dataset.shown = 'true'
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              ;(entry.target as HTMLElement).dataset.shown = 'true'
              observer?.unobserve(entry.target)
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
      )
      for (const el of revealables) observer.observe(el)
    }

    const onPointer = (event: PointerEvent) => {
      const lens = lensRef.current
      if (!lens || reduced) return
      const x = (event.clientX / window.innerWidth) * 2 - 1
      const y = (event.clientY / window.innerHeight) * 2 - 1
      lens.style.setProperty('--tilt-y', String(x * 5))
      lens.style.setProperty('--tilt-x', String(-y * 4))
    }
    if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
      observer?.disconnect()
    }
  }, [])

  return (
    <div className="xp">
      <nav className="xp-nav" ref={navRef}>
        <Link href="/" className="mark">
          Prelude <span>for Even Realities G2</span>
        </Link>
        <div className="links">
          <a href="#intelligence" data-active={activeHref === '#intelligence'}>
            Intelligence
          </a>
          <a href="#roundtrip" data-active={activeHref === '#roundtrip'}>
            Round trip
          </a>
          <a href="#ecosystem" data-active={activeHref === '#ecosystem'}>
            Ecosystem
          </a>
          <Link href="/lens">Lens</Link>
          <Link href="/dashboard" className="pill-cta">
            Dashboard
          </Link>
        </div>
      </nav>

      {/* A thin progress rail: the only always-visible scroll affordance. */}
      <div className="xp-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(var(--scroll-page, 0))` }} />
      </div>

      {/* ── 01 · ARRIVAL ─────────────────────────────────────────────────── */}
      <section className="chapter hero-xp" data-scene="hero" data-chapter="hero" data-interactive="false">
        <div className="stage">
          <Stage scene="universe" progress={progress.hero} bands={bands} />
        </div>
        <div className="xp-fallback-glow" />

        <div className="chapter-inner">
          <span className="badge">
            <span className="led" />
            {mode === 'live' ? 'Live workspace' : 'Demo workspace'}
            {enriched > 0 ? ` · ${enriched} enriched` : ''}
          </span>

          <h1 className="xp-display">
            <span className="row">
              <span>Your glasses</span>
            </span>
            <span className="row">
              <span className="dim">can read.</span>
            </span>
            <span className="row">
              <span className="glow">Prelude writes.</span>
            </span>
          </h1>

          <p className="xp-lede">
            Even&apos;s own Conversate already summarises your meetings. Prelude does the thing it
            cannot: <strong>it acts</strong>. One tap sends a real reply to Notion, email or Slack —
            and the lens shows <strong>the exact string the provider confirmed</strong>. Not a
            summary. A receipt.
          </p>

          <div className="xp-actions">
            <Link href="/lens" className="xp-btn xp-btn-primary">
              See the write path
            </Link>
            <a href="#roundtrip" className="xp-btn xp-btn-ghost">
              How the receipt works
            </a>
          </div>

          <div className="scroll-hint">
            <span>Scroll</span>
            <span className="rail" />
          </div>
        </div>
      </section>

      {/* ── 01b · THE HERO OBJECT ────────────────────────────────────────── */}
      <section className="chapter" data-scene="product" data-chapter="product">
        <div className="stage">
          <Stage scene="glasses" progress={progress.product} bands={bands} cameraZ={6.6} />
        </div>
        <div className="xp-fallback-glow" />

        <div className="chapter-inner" style={{ textAlign: 'center' }}>
          <p className="xp-label">02 · The product</p>
          <h2 className="xp-title" style={{ margin: '0 auto 20px' }}>
            Meet <span className="glow">Prelude.</span>
          </h2>
          <p className="xp-body" style={{ margin: '0 auto' }}>
            Intelligence that moves with you. The display activates, and the brief rises out of the
            lens — three bands, seven lines, no scrolling. 576 × 288, 16 levels of green, and no
            camera or speaker to lean on.
          </p>
        </div>
      </section>

      {/* ── 03 · INTELLIGENCE ────────────────────────────────────────────── */}
      <section className="chapter" id="intelligence" data-chapter="intelligence">
        <div className="stage">
          <Stage scene="network" progress={1} bands={bands} cameraZ={8.4} layout="band" />
        </div>
        <div className="xp-fallback-glow" />

        <div className="chapter-inner">
          <p className="xp-label xp-reveal">03 · Why not just use Conversate?</p>
          <h2 className="xp-title xp-reveal">
            It reads. <span className="dim">Prelude writes.</span>
          </h2>
          <p className="xp-body xp-reveal">
            Even&apos;s first-party app is good at capture: prep notes, AI cues, summaries. It stops
            at the edge of the Even app. Prelude starts there — it writes back to the tools your
            work actually lives in, and proves it did.
          </p>

          <div className="xp-compare">
            <div className="xp-compare-head">
              <span />
              <span>Conversate</span>
              <span>Prelude</span>
            </div>
            {[
              ['Prep notes before a meeting', true, true],
              ['AI cues and summaries', true, true],
              ['Writes to Notion, email, Slack', false, true],
              ['Provider-confirmed receipt', false, true],
              ['Commitment tracking with deadlines', false, true],
              ['Your tools, not a silo', false, true],
            ].map(([label, conversate, prelude]) => (
              <div className="xp-compare-row" key={String(label)}>
                <span className="xp-compare-label">{label}</span>
                <span data-on={conversate ? 'true' : 'false'}>{conversate ? '✓' : '—'}</span>
                <span data-on={prelude ? 'true' : 'false'}>{prelude ? '✓' : '—'}</span>
              </div>
            ))}
          </div>

          <p className="xp-body xp-reveal" style={{ marginTop: 20, fontSize: 13, opacity: 0.7 }}>
            Hover a node above to see what each one holds.
          </p>
        </div>
      </section>

      {/* ── 04 · EXPERIENCE ──────────────────────────────────────────────── */}
      <section className="chapter" data-interactive="false">
        <div className="chapter-inner" style={{ textAlign: 'center' }}>
          <p className="xp-label xp-reveal">04 · The experience</p>
          <h2 className="xp-title xp-reveal" style={{ margin: '0 auto 20px' }}>
            One glance. <span className="dim">Everything in context.</span>
          </h2>
          <p className="xp-body xp-reveal" style={{ margin: '0 auto 48px' }}>
            This is not a mockup. It renders through the same <code>render(state)</code> the glasses
            use, so what you see is the real output — clamped to 999 UTF-8 bytes per band.
          </p>

          <div className="lens-float" ref={lensRef}>
            <div className="band h">{bands.header}</div>
            <div className="band b">{bands.body}</div>
            <div className="band s">{bands.status}</div>
          </div>

          <div className="xp-actions" style={{ marginTop: 40 }}>
            <Link href="/lens" className="xp-btn xp-btn-primary">
              Drive it yourself
            </Link>
            <Link href="/followups" className="xp-btn xp-btn-ghost">
              See the follow-up radar
            </Link>
          </div>
        </div>
      </section>

      {/* ── 04b · THE THREE SURFACES ─────────────────────────────────────── */}
      <section className="chapter" data-interactive="false">
        <div className="chapter-inner">
          <p className="xp-label xp-reveal">What the lens actually does</p>
          <h2 className="xp-title xp-reveal">
            Three surfaces. <span className="dim">One decision each.</span>
          </h2>

          <div className="xp-grid">
            <div className="xp-cell xp-reveal">
              <span className="tag">Brief</span>
              <h3>Know before you walk in</h3>
              <p>
                Who, the last message, the doc you touched, the agenda, and the one commitment that
                is still open. Seven lines, no scrolling.
              </p>
              <pre className="xp-mini">{`PRELUDE · 9m
Ada Lovelace · CTO
Pricing v3 — final call
OPEN: revised pricing
3 items · 35m`}</pre>
            </div>

            <div className="xp-cell xp-reveal">
              <span className="tag">Voice</span>
              <h3>Ask, then confirm</h3>
              <p>
                The state machine makes <code>transcribing → confirmed</code> illegal. You always
                see the parsed action and tap. A misheard transcript can never send a message.
              </p>
              <pre className="xp-mini">{`IDLE → LISTENING
  → TRANSCRIBING
  → REVIEW  ← you tap here
  → CONFIRMED → RECEIPT`}</pre>
            </div>

            <div className="xp-cell xp-reveal">
              <span className="tag">Follow-up</span>
              <h3>Remember every promise</h3>
              <p>
                Detection is deterministic: promise patterns plus a deadline phrase. An LLM may
                propose a commitment, but the rules that decide whether it is open are code.
              </p>
              <pre className="xp-mini">{`2 OPEN COMMITMENTS
revised enterprise pricing
  due in 3d · open
use-of-funds breakdown
  due in 3d · open`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── 05 · ACTION ──────────────────────────────────────────────────── */}
      <section className="chapter" id="roundtrip" data-chapter="roundtrip">
        <div className="stage">
          <Stage scene="flow" progress={1} bands={bands} flowStage="verified" cameraZ={6.4} layout="band" />
        </div>
        <div className="xp-fallback-glow" />

        <div className="chapter-inner">
          <p className="xp-label xp-reveal">05 · The 25% criterion</p>
          <h2 className="xp-title xp-reveal">
            A tap that <span className="glow">actually</span> does something.
          </h2>
          <p className="xp-body xp-reveal">
            Most glasses apps stop at showing you a summary. Prelude completes the loop: the tap
            performs a real side effect on a real provider, and the confirmation carries the exact
            bytes that were sent — so the receipt cannot disagree with the action.
          </p>

          <div className="flow">
            <div className="flow-step xp-reveal">
              <div className="flow-num">01</div>
              <div>
                <h3 className="flow-title">The lens shows one card</h3>
                <p className="flow-text">
                  Who you are meeting, the last message, the doc, the agenda. Three bands, seven
                  lines, no scrolling. Every band is clamped to 999 UTF-8 bytes by a test.
                </p>
              </div>
              <pre className="flow-code">{`PRELUDE · 9m
Ada Lovelace · CTO
Pricing v3 — final call
Ada: One question on the
enterprise tier before we
lock it.
doc Pricing v3 · 3h ago
3 items · 35m`}</pre>
            </div>

            <div className="flow-step xp-reveal">
              <div className="flow-num">02</div>
              <div>
                <h3 className="flow-title">One tap, one action</h3>
                <p className="flow-text">
                  Actions are ranked deterministically. The cursor moves with a swipe; a tap
                  executes. A 700 ms swipe gate and a 350 ms tap gate stop one gesture from becoming
                  three.
                </p>
              </div>
              <pre className="flow-code">{`> Reply: running 5 late
  Note: ask about Q4
  Open agenda
  Join call`}</pre>
            </div>

            <div className="flow-step xp-reveal">
              <div className="flow-num">03</div>
              <div>
                <h3 className="flow-title">The server walks a 9-state lifecycle</h3>
                <p className="flow-text">
                  Validate, authorize, execute, confirm. The idempotency key is a hash of the
                  meeting, kind and text, so a retry returns the existing receipt instead of sending
                  twice. A 5xx after the request left is <em>ambiguous</em>, never blindly retried.
                </p>
              </div>
              <pre className="flow-code">{`POST /api/act
{ meetingId, action: 'reply',
  text: 'running 5 late' }

created → validated → awaiting
  → authorized → executing
  → confirmed`}</pre>
            </div>

            <div className="flow-step xp-reveal">
              <div className="flow-num">04</div>
              <div>
                <h3 className="flow-title">The receipt is the proof</h3>
                <p className="flow-text">
                  The response carries the delivered string and the provider&apos;s own reference.
                  The client renders it verbatim — it never re-derives it. That is the property a
                  screenshot cannot fake.
                </p>
              </div>
              <pre className="flow-code">{`200 {
  ok: true,
  status: 'receipt_persisted',
  delivered: 'running 5 late',
  providerReference:
    'demo_idem_971776f9'
}

SENT · 12:04 · running 5 late`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── 06 · ECOSYSTEM ───────────────────────────────────────────────── */}
      <section className="chapter" id="ecosystem" data-chapter="ecosystem">
        <div className="stage">
          <Stage scene="ecosystem" progress={1} bands={bands} providers={providers} cameraZ={7.6} layout="band" />
        </div>
        <div className="xp-fallback-glow" />

        <div className="chapter-inner">
          <p className="xp-label xp-reveal">06 · What is actually wired</p>
          <h2 className="xp-title xp-reveal">
            Real providers. <span className="dim">Honest fallbacks.</span>
          </h2>
          <p className="xp-body xp-reveal">
            Every integration sits behind one interface, and every one of them degrades to a
            deterministic path when its key is absent. There is no state where the app pretends to
            be live. Hover a provider to see its real state.
          </p>

          <div className="xp-grid">
            <div className="xp-cell xp-reveal">
              <span className="tag">Read</span>
              <h3>Notion</h3>
              <p>
                Queries a database and maps pages to meetings through a pure, tested mapper that
                tolerates property-name variation. Falls back to fixtures with an explicit note.
              </p>
            </div>

            <div className="xp-cell xp-reveal">
              <span className="tag">Read</span>
              <h3>Web enrichment</h3>
              <p>
                When a meeting has no thread and no doc — a first call with a stranger — Exa
                supplies one citable line about the person. Local facts always win; the search only
                runs on a thin card.
              </p>
            </div>

            <div className="xp-cell xp-reveal">
              <span className="tag">Write</span>
              <h3>Email</h3>
              <p>
                Resend delivers the reply to an external attendee and honours an{' '}
                <code>Idempotency-Key</code> header, returning a real message id for the receipt.
              </p>
            </div>

            <div className="xp-cell xp-reveal">
              <span className="tag">Write</span>
              <h3>Notion notes</h3>
              <p>
                Appends a prep note as a paragraph block. Notion has no idempotency key, so a retry
                is modelled as <em>ambiguous</em> rather than silently duplicated.
              </p>
            </div>

            <div className="xp-cell xp-reveal">
              <span className="tag">Reason</span>
              <h3>Voice, with a mandatory review</h3>
              <p>
                The state machine makes <code>transcribing → confirmed</code> illegal. You always
                see the parsed action and tap. A misheard transcript can never send a message.
              </p>
            </div>

            <div className="xp-cell xp-reveal">
              <span className="tag">Reason</span>
              <h3>Context-aware classification</h3>
              <p>
                The model receives the meeting, the thread, the agenda and open commitments — and
                may only <em>propose</em> one of four actions. Deterministic rules decide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── numbers ──────────────────────────────────────────────────────── */}
      <section className="chapter">
        <div className="chapter-inner">
          <p className="xp-label xp-reveal">Verified, not claimed</p>
          <h2 className="xp-title xp-reveal">
            The numbers <span className="dim">are the argument.</span>
          </h2>

          <div className="xp-numbers">
            <div className="xp-number xp-reveal">
              <div className="v">{testCount}</div>
              <div className="l">
                unit tests, including one that reads the source to prove the core imports nothing
                outward
              </div>
            </div>
            <div className="xp-number xp-reveal">
              <div className="v">576×288</div>
              <div className="l">
                the real canvas. The mirror on this site renders through the same function the
                glasses do
              </div>
            </div>
            <div className="xp-number xp-reveal">
              <div className="v">999</div>
              <div className="l">UTF-8 bytes per container, clamped and tested on every screen</div>
            </div>
            <div className="xp-number xp-reveal">
              <div className="v">9</div>
              <div className="l">
                states in the action lifecycle, with illegal transitions rejected by test
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 07 · CLOSING ─────────────────────────────────────────────────── */}
      <section className="xp-closing">
        <h2 className="xp-display">
          <span className="row">
            <span>One card.</span>
          </span>
          <span className="row">
            <span className="glow">One tap.</span>
          </span>
        </h2>
        <div className="xp-actions">
          <Link href="/lens" className="xp-btn xp-btn-primary">
            Experience Prelude
          </Link>
          <Link href="/dashboard" className="xp-btn xp-btn-ghost">
            Explore the technology
          </Link>
        </div>
      </section>

      <footer className="xp-footer">
        <span>
          Prelude · Track 04, AI Assistants &amp; Work · {llmLive ? 'LLM live' : 'keyword rules'}
        </span>
        <span>
          <a href="/api/health">API</a> · <a href="/api/briefs">Briefs</a> ·{' '}
          <a href="https://github.com/gopanihitansh5-collab/prelude">Source</a>
        </span>
      </footer>
    </div>
  )
}
