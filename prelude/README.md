# Prelude

**The brief before your next meeting — on Even Realities G2.**

Track **04 · AI Assistants & Work** · Heads Up: Even Realities Hackathon (TVM Ventures × Daos Hub)

> One card, one decision, one tap — and a receipt that proves the tap did something real.

---

## Contents

- [The problem](#the-problem)
- [What Prelude is](#what-prelude-is)
- [How it solves the problem](#how-it-solves-the-problem)
- [Features](#features)
- [Architecture](#architecture)
- [Verified behaviour](#verified-behaviour)
- [Quick start](#quick-start)
- [Environment](#environment)
- [Safety](#safety)
- [Judging rubric](#judging-rubric)
- [Competitive position](#competitive-position)
- [The value we bring to the community](#the-value-we-bring-to-the-community)
- [Docs](#docs)

---

## The problem

You have a meeting in nine minutes. To be ready you need four facts and one action:

1. **Who** am I meeting?
2. What did they **last say** to me?
3. What **doc** did we last touch?
4. What is on the **agenda**?

…and then you need to *do* something: reply "running 5 late", add a prep note, or open the agenda.

Today that costs: unlock phone → open calendar → open the thread → open the doc → type a reply.
That is five context switches for a nine-minute warning.

On a pair of glasses the fix is not "put the phone screen on your face". It is **one card, one decision,
one tap** — and a receipt that proves the tap did something real.

## What Prelude is

A single Even Hub plugin with eight screens and one control surface.

| Screen | What it shows | Gestures |
|---|---|---|
| **brief** (root) | `PRELUDE · 9m` / who + title + **open commitment** + doc + agenda | tap → actions, swipe → next meeting, double-tap → exit |
| **actions** | ranked actions with a `>` cursor | swipe moves cursor, tap executes, double-tap → back |
| **agenda** | agenda items, paginated with a glyph progress bar | swipe pages, tap → back |
| **note** | prep-note composer: 3 preset chips | swipe selects, tap saves, double-tap → back |
| **memory** | cross-source recall with source + timestamp | tap → back |
| **followup** | every open commitment across meetings | tap → act, double-tap → back |
| **voice** | the voice state machine, transcript, parsed action | tap confirms, double-tap cancels |
| **receipt** | `SENT · 12:04` + **the exact string delivered** | tap → next meeting, double-tap → exit |

Everything fits in three text containers on a 576 × 288 monochrome canvas:

```
┌────────────────────────────────────────────────────────────┐
│ PRELUDE · 9m                                    header 32px │
├────────────────────────────────────────────────────────────┤
│ Ada Lovelace · CTO                                         │
│ Pricing v3 — final call                                    │
│                                                            │
│ OPEN: Enterprise pricing promised                          │
│                                                            │
│ doc Pricing v3 · 3h ago · 3 items · 35m                    │
├────────────────────────────────────────────────────────────┤
│ tap act · swipe next · double exit              status 44px │
└────────────────────────────────────────────────────────────┘
```

## How it solves the problem

### 1. It answers the four questions in one glance

`buildBrief()` turns raw calendar + thread + doc data into exactly the fields that fit the display.
Nothing is truncated mid-number: `fitFields()` **drops whole fields by priority** instead of cutting one
in half, because `COACH ..` is worse than no coach count at all.

### 2. It surfaces what you owe, not what was said

This is the differentiator. A summary tells you what was said; a commitment tells you what you owe.

```
"Pricing v3 · 3h ago"                 ← a summary
"OPEN: Enterprise pricing promised"   ← a commitment
```

`detectCommitments()` finds promises (`"I'll send…"`), requests (`"Can you send…"`), and deadlines
(`"by Wednesday"`, `"tomorrow"`), then marks them open or overdue. It is deterministic — an LLM may
*propose* a commitment, but the rules that decide whether one is open are code, so they can be tested
and cannot drift with a model change.

### 3. It acts, and it proves it acted

This is the part a screenshot cannot fake.

```
lens shows the card
   → one tap on "Reply: running 5 late"
      → POST /api/act { meetingId, action: 'reply', text }
         → server validates → walks the lifecycle → calls the provider
            → 200 { ok, status: 'receipt_persisted',
                    delivered: "running 5 late",
                    providerReference: "demo_idem_971776f9" }
   → lens shows SENT · 12:04 · "running 5 late"
```

The receipt carries **the exact string the server delivered**. The client never re-derives it, so the
confirmation on the lens cannot disagree with what actually left the building.

### 4. Voice never commits on its own

```
IDLE → LISTENING → TRANSCRIBING → REVIEW → CONFIRMED → EXECUTING → RECEIPT
```

`transcribing → confirmed` is **not a legal transition**. The user sees the parsed action and taps.
A misheard transcript can never send a message.

## Features

| Feature | Why it matters |
|---|---|
| **One card, one decision** | 576×288 forces a single decision per screen. That is the design constraint, not a limitation to apologise for |
| **Commitment awareness** | The brief leads with *what you owe* — `OPEN: Enterprise pricing promised` — not a summary of what was said |
| **Cross-source memory** | "Have we discussed the enterprise pricing?" → `YES · 3 matches / Last: Nov 27`, with source and timestamp |
| **Follow-up radar** | The same detector runs across every meeting, so the app is useful *between* meetings |
| **Ranked actions** | Reply leads when the meeting is imminent; "Join now" only appears in the last five minutes |
| **Real write path** | Notion / Slack / email behind a server. The WebView never sees a token |
| **Verbatim receipt** | The delivered string is returned by the server and rendered unchanged |
| **Action lifecycle** | 9 states, idempotency keys, and ambiguity as a state — a lost response never sends twice |
| **Voice with mandatory review** | `transcribing → confirmed` is an illegal transition. Voice never sends on its own |
| **Runs with zero secrets** | No token → fixtures, and the header says `demo`. The demo never depends on a credential |
| **576×288 browser mirror** | A judge needs no glasses and no simulator to see it work |
| **Pure, tested core** | `src/core/` imports no SDK, no DOM, no fetch — 271 unit tests across 19 files |
| **Firmware rules pinned by tests** | One event-capture container, unique z-order, ≤999 UTF-8 bytes per band, canvas bounds |
| **Measured-hardware input rules** | Swipe gate 700 ms, tap gate 350 ms, no dependence on long press — each cites a finding ID |
| **Debounced display writes** | One write in flight, one pending, newest wins — the BLE queue is ~83 ms per call |

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. EVEN HUB EXPERIENCE            src/even/                         │
│     Glasses UI · gestures · microphone · display controller          │
│     The only layer that imports @evenrealities/even_hub_sdk          │
│       bridge.ts      waitForEvenAppBridge + eventTypeOf              │
│       gate.ts        swipe 700 ms, tap 350 ms                        │
│       containers.ts  3 text containers, z-order, capture, menu       │
│       app.ts         controller: state ⇄ layout ⇄ containers         │
├──────────────────────────────────────────────────────────────────────┤
│  2. PRELUDE APPLICATION API        app/api/                          │
│     Next.js route handlers. No UI, no SDK.                           │
├──────────────────────────────────────────────────────────────────────┤
│  3. INTELLIGENCE ENGINE            src/core/                         │
│     Pure. No SDK, no DOM, no fetch. 271 tests.                       │
│       types.ts            Meeting, Brief, Action, AppState           │
│       format.ts           utf8Bytes, truncate, wrap, fitFields       │
│       brief.ts            raw calendar+thread+doc → Brief            │
│       commitments.ts      promise/request detection, deadlines       │
│       memory.ts           cross-source recall with sources           │
│       voice.ts            the voice state machine                    │
│       action-lifecycle.ts 9-state machine, idempotency, ambiguity    │
│       actions.ts          ranking + the reducer                      │
│       layout.ts           AppState → { header, body, status }        │
├──────────────────────────────────────────────────────────────────────┤
│  4. INTEGRATION ENGINE             src/lib/integrations/             │
│     Notion · Slack · Resend · Exa · demo, behind one interface       │
│     The only layer that holds a provider token.                      │
└──────────────────────────────────────────────────────────────────────┘
              │ fetch (one whitelisted origin)
              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js app (Vercel)                                                │
│    GET  /api/health          liveness + mode                         │
│    GET  /api/briefs          today's meetings                        │
│    POST /api/act             execute → receipt                       │
│    GET  /api/actions         action history (durable)                │
│    POST /api/actions/preview validate without executing              │
│    GET  /api/actions/[id]    status + receipt                        │
│    GET  /api/memory?q=       cross-source recall                     │
│    GET  /api/followups       open commitments                        │
│    GET  /api/connections     provider status, never a token          │
│    POST /api/stt             PCM → transcript                        │
│    POST /api/parse           transcript → structured action          │
│                                                                      │
│  /            landing                                                │
│  /lens        the 576×288 mirror + live receipt panel                │
│  /dashboard   connections, briefs, write-path explainer              │
└──────────────────────────────────────────────────────────────────────┘
```

**The rule that makes this trustworthy:** `src/core/` imports nothing. No SDK, no DOM, no network.
That is what makes the layout engine testable and what makes the display budget provable.

### One codebase, two build targets

| Command | Output | Purpose |
|---|---|---|
| `npm run dev` | Next dev server on :5173 | Dashboard, API routes, lens mirror |
| `npm run build` | `.next/` | Deployable to Vercel — the backend the plugin talks to |
| `npm run build:plugin` | `dist/` static export | What `evenhub pack` turns into the `.ehpk` |
| `npm run pack` | `prelude.ehpk` | The shippable plugin |
| `npm run gate` | — | typecheck → test → manifest → plugin build → app build |

The switch is `pageExtensions` in `next.config.mjs`: in plugin mode only `*.plugin.tsx` files are pages,
so every `route.ts` under `app/api` is ignored and a static export is possible from the same tree.

**The two targets must not share a build directory.** The plugin build writes `dist/`; the app build
writes `.next/`. Running the plugin build after the app build would leave `.next/` holding a static
export, and `next start` would then serve a site with no API routes. The gate runs the plugin build
first for exactly this reason.

## Verified behaviour

Every claim below was run against the built app on **2026-11-27**, locally and against the deployment
at <https://prelude-green.vercel.app>.

| Check | Result |
|---|---|
| `npm test` | **271/271 pass**, 19 files |
| `npx tsc --noEmit` | clean |
| `npm run gate` | **GATE PASS** — 5 stages |
| `npm audit` | **0 vulnerabilities** |
| `GET /api/health` | `200 {"ok":true,"mode":"demo","auth":"open","version":"0.1.0"}` (deployed) |
| `GET /api/actions` | `200`, `durable: true`, real Postgres rows (deployed) |
| `GET /actions` | fixed locally after the timestamp fix; the deployed build still returns `500` until the next deploy |
| `GET /lens` (local) | API calls are same-origin — no CORS fallback; checked with `scripts/route-probe.mjs` |
| `GET /favicon.ico` | `200`, served from `app/icon.png` |
| `GET /api/briefs` | `200`, 3 meetings |
| `GET /api/followups` | `200`, open commitments |
| `GET /api/memory?q=enterprise+pricing` | `200 "YES · 3 matches"` |
| `POST /api/act` (reply) | `200 {"ok":true,"status":"receipt_persisted","delivered":"running 5 late","providerReference":"demo_idem_971776f9"}` |
| `POST /api/act` (retry) | **same `actionId`, same `providerReference`, same `at`; one row in the table** (a repeat used to duplicate-key `500`) |
| `POST /api/act` (agenda) | `200 {"ok":false,"error":"agenda is a read, not a write"}` |
| Plugin bundle | SDK confirmed bundled, UTF-8 correct, `dist/index.html` present |

## Quick start

```bash
npm install

# Full app: dashboard + API + lens mirror
npm run dev            # http://localhost:5173

# The lens alone, at exactly 576×288
open http://localhost:5173/lens

# Tests
npm test               # 271 tests

# The gate: typecheck → test → manifest → plugin build → app build
npm run gate

# Plugin bundle + .ehpk
npm run build:plugin
npx evenhub pack app.json dist -o prelude.ehpk --sdk-ver 0.0.16
```

### Run it in the simulator

```bash
npm run dev
npx evenhub-simulator http://localhost:5173/lens
```

### Run it on real glasses

```bash
npm run dev
npx evenhub qr --url http://<YOUR-LAN-IP>:5173/lens
```

Scan the QR from the Even Realities App with developer mode enabled.

## Environment

Every variable is optional. With none set, the app runs in demo mode and says so.

| Variable | Effect when set |
|---|---|
| `NOTION_TOKEN` + `NOTION_PAGE_ID` | Prep notes are written to a real Notion page |
| `NOTION_TOKEN` + `NOTION_DATABASE_ID` | Meetings are read live from a Notion database; any failure falls back to fixtures |
| `SLACK_TOKEN` + `SLACK_CHANNEL` | Replies are posted to a real Slack channel |
| `RESEND_API_KEY` + `RESEND_FROM` + `RESEND_TO` | Replies are delivered by email through Resend |
| `EXA_API_KEY` | A meeting with no thread and no doc gets one citable web line |
| `STT_API_KEY` | Voice is transcribed by a real provider instead of the canned transcript |
| `LLM_API_KEY` (legacy alias: `OPENROUTER_API_KEY`) | Transcripts are classified by an LLM instead of keyword rules |
| `DATABASE_URL` | The action store is Neon Postgres instead of in-memory; history survives a restart |
| `PRELUDE_ACT_KEY` | `/api/act` and `/api/actions` require the `x-prelude-key` header; unset keeps the demo open |

**No secret ever reaches the WebView.** An `.ehpk` is extractable, so every token lives on the server
and the plugin is whitelisted to exactly one origin.

## Safety

- **No funds, no custody, no financial advice.** Nothing in this app touches money.
- **No third-party analytics.** No tracking script, no telemetry.
- **One whitelisted origin.** `app.json` declares exactly one network host.
- **Two permissions, both used.** `network` for the backend, `g2-microphone` for dictation.
- **The user's own workspace only.** Prelude reads the meetings the user already has access to.
- **No execution without confirmation.** `validateAction()` rejects any action the user did not confirm.
- **No blind retry.** An ambiguous provider failure goes to `reconciling`, never back to `executing`.

## Judging rubric

| Criterion | Weight | Our answer |
|---|---|---|
| Usefulness on G2 | 30% | The organizers' own named moment — *"a short brief before your next meeting"* — daily and recurring, hands-free |
| Read and write | 25% | One tap → real side effect → receipt carrying the delivered string and the provider's reference |
| Technical execution | 20% | Pure tested core, real backend, firmware rules pinned by tests, deterministic gate |
| UX for display and voice | 15% | Three bands, one cursor, four gestures, voice never auto-commits |
| Business & safety | 10% | Token-only auth, no funds, no analytics, one whitelisted origin |

## Competitive position

| Build | Their gap | Our edge |
|---|---|---|
| Glance Brief | Saves a Gmail **draft, never sends** | We send, and show the delivered string |
| Kept | Capture-only, no brief | We brief *before*, capture after |
| Aside | Task list, not a meeting | We are meeting-shaped |
| FixGuide AI | Phone repair | Different domain entirely |

Track 04 has ~6 builds. Track 01 has ~30 near-identical Telegram triage apps. We chose the empty track
and the moment the organizers named.

## The value we bring to the community

### 1. A worked example of the read & write criterion

Most G2 demos stop at "here is a card". Prelude shows the full round trip — gesture → server → real
side effect → verbatim receipt — and documents why the receipt must come from the server. That pattern
is reusable by every app in every track.

### 2. The event-handling trap, documented and pinned

`CLICK_EVENT` is `0`, and protobuf omits zero-value fields on the wire, so a single tap arrives with
**no `eventType` at all**. Writing `event.sysEvent?.eventType ?? CLICK_EVENT` reads CLICK on every
event that carries no `sysEvent` — every scroll, lifecycle event and audio frame fires your tap handler.

`src/even/bridge.ts` resolves the default **inside** the envelope check, and the reason is written in
the file. This is the single easiest thing to get wrong on this platform.

### 3. Three measured-hardware bugs, found before shipping

We read `maticsh/matic-even` — 23 findings measured on a real G2 — and three of them were bugs in our
own code:

| Finding | The bug it caught | The fix |
|---|---|---|
| **H12** | One long swipe arrives as several scroll events → would flip 3 meetings per swipe | `createGate(700)` on swipes |
| **H11** | Quick repeated taps become a double-tap, which **exits the app** on the root page | `createGate(350)` on taps |
| **H19** | Users can bind long-press to Even AI, so voice was unreachable | A contextual menu "Speak" item |

Each has a test and cites its finding ID in the code comment. This is the kind of thing you only learn
by reading someone else's field notes.

### 4. A display-budget discipline others can copy

- `fitFields()` drops whole fields instead of truncating one
- every band is clamped to 999 UTF-8 bytes, measured in bytes not characters
- one event-capture container, unique z-order — **asserted by tests**, not by hope
- debounced writes: one in flight, one pending, newest wins

### 5. A pure core that is actually testable

271 unit tests run in a few seconds with no SDK, no browser and no network. The state machine is one pure
reducer, so every gesture is a test case rather than a manual click-through.

### 6. Honest demo mode

No token → fixtures, and the UI says `demo`. The demo never depends on a secret, and this README says
which parts are live and which are not. That is the difference between a demo and a claim.

## Docs

- [PLAN.md](./PLAN.md) — product, architecture, build order, non-goals
- [ARCHITECTURE.md](./ARCHITECTURE.md) — module boundaries and the invariants each protects
- [DECISIONS.md](./DECISIONS.md) — every non-obvious choice, with a **revisit-if** condition
- [COMPARISON.md](./COMPARISON.md) — what already exists, what we took, what we changed
- [DEMO.md](./DEMO.md) — the 3-minute demo script
- [SKILLS.md](./SKILLS.md) — the tooling and skills used to build this
- [CHECKLIST.md](./CHECKLIST.md) — live status of every task, including honest gaps
- [../research.md](../research.md) — the deep research behind every decision

## Licence

MIT.
