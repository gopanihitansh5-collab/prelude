# CHECKLIST

Live status of everything asked for and everything done.

Legend: `[x]` done · `[~]` in progress · `[ ]` not started · `[!]` blocked

Last verified: **2026-11-25 19:17 IST** — typecheck clean, 194 tests passing.

---

## A. Research (asked: "research a lot, deep research, save in research.md")

- [x] Event rules, timeline, prizes, judging rubric
- [x] All 4 tracks and their in-scope apps
- [x] Competitive analysis of 63 builds, by track
- [x] Track 04 gap analysis (6 builds vs ~30 in Track 01)
- [x] G2 hardware contract (576×288, 4-bit, no camera/speaker, 4-mic)
- [x] SDK 0.0.16 surface read from `dist/index.d.ts`
- [x] Event quirks — `CLICK_EVENT = 0` → `undefined`
- [x] Contextual menu rules (10 items, 32 UTF-8 bytes, rebuild clears)
- [x] Measured performance table (83/104/165 ms per call)
- [x] Networking: whitelist ≠ CORS bypass
- [x] `app.json` field rules incl. name ≤ 20 chars, no "Even"
- [x] QA rejection list + 5-minute locked-phone test
- [x] Tooling versions verified on npm
- [x] Simulator automation API endpoints
- [x] **Live endpoint probes** — Binance testnet, Hyperliquid, Polymarket, Notion, Slack, Discord
- [x] Google device-authorization flow as the WebView-OAuth answer
- [x] Reference repos catalogued
- [x] **23 measured hardware findings** from `maticsh/matic-even`
- [x] Written to `../research.md`

## B. Planning

- [x] Product chosen: **Prelude**, Track 04
- [x] 8 screens specified with gestures
- [x] Read & write round trip specified end to end
- [x] Architecture diagram + the "core imports nothing" rule
- [x] Display budget table
- [x] Rubric mapping
- [x] Competitive position table
- [x] Build order
- [x] Non-goals
- [x] `PLAN.md`
- [x] **`DECISIONS.md`** — 22 decisions, each with a revisit-if condition
- [x] **`ARCHITECTURE.md`** — module boundaries + 16 invariants
- [x] **`COMPARISON.md`** — what exists, what we took, what we changed

## C. Skills & tooling

- [x] `npx skills` installer verified
- [x] `alirezarezvani/claude-skills` installed → `.agents/skills/` (434 skills)
- [x] `ChristopherKahler/paul` catalogued; PLAN → APPLY → UNIFY adopted
- [x] `SKILLS.md` documents what was used and what shaped the code

## D. Scaffold

- [x] `package.json` (Next 16.4.6, React 19.3.1, SDK 0.0.16)
- [x] `tsconfig.json` (strict, noUncheckedIndexedAccess)
- [x] `next.config.mjs` — dual target via `pageExtensions`, separate build dirs
- [x] `app.json` manifest — validated by the gate
- [x] `public/icon.png` — 24×24, 2×2 blocks, 1-bit, verified by rendering
- [x] `vitest.config.mts`
- [x] `.gitignore`
- [x] 0 npm vulnerabilities

## E. Core (pure, tested)

- [x] `types.ts` — Meeting, Person, Brief, Action, AppState, 8 screens
- [x] `format.ts` — utf8Bytes, truncate, wrap, fitFields, relTime, progressBar
- [x] `brief.ts` — raw → Brief
- [x] `commitments.ts` — promise/request detection, deadlines, overdue
- [x] `memory.ts` — cross-source recall with sources + timestamps
- [x] `voice.ts` — the voice state machine with mandatory REVIEW
- [x] `action-lifecycle.ts` — 9-state machine, idempotency, ambiguity
- [x] `actions.ts` — ranking + the reducer
- [x] `layout.ts` — AppState → three strings, 8 screens
- [x] `fixtures.ts` — demo meetings with relative times

## F. Even layer

- [x] `bridge.ts` — `eventTypeOf` resolves CLICK inside the envelope
- [x] `gate.ts` — swipe 700 ms, tap 350 ms (H11, H12)
- [x] `containers.ts` — 3 containers, z-order, one capture, menu
- [x] `app.ts` — controller, write queue, checkpoints, menu handling

## G. UI

- [x] `/lens` — 576×288 mirror + live receipt panel
- [x] `/` — landing
- [x] `/dashboard` — connections, briefs, write-path explainer
- [x] `page.plugin.tsx` — the plugin entry
- [x] `layout.plugin.tsx` — the plugin root layout

## H. Server

- [x] `/api/health`, `/api/briefs`
- [x] `/api/act` — through the lifecycle + registry
- [x] `/api/actions/preview`, `/api/actions/[id]`
- [x] `/api/memory`, `/api/followups`, `/api/connections`
- [x] `/api/stt`, `/api/parse`
- [x] Adapters: demo, Notion, Slack behind one interface
- [x] CORS headers correct

## I. Tests & gate

- [x] **194 unit tests, 12 files, 1.7 s**
- [x] Container-rule tests (capture, z-order, bytes, canvas bounds, menu)
- [x] Gate tests (swipe burst, tap burst)
- [x] Lifecycle tests (illegal transitions, ambiguity, receipts)
- [x] Voice tests (REVIEW mandatory, cancellation)
- [x] Commitment tests (promise, request, deadline, overdue)
- [x] Memory tests (scoring, recency, empty)
- [x] `scripts/gate.mjs` — typecheck → test → manifest → plugin build → app build
- [x] **GATE PASS** (all 5 stages)

## J. Docs

- [x] `README.md` — problem, features, architecture, verified behaviour, value, setup
- [x] `PLAN.md` — product, architecture, build order, non-goals, deferred
- [x] `ARCHITECTURE.md` — 4 layers, invariants, test inventory
- [x] `DECISIONS.md` — 22 decisions + 7 open questions
- [x] `COMPARISON.md` — workspace survey, GitHub survey, what we changed
- [x] `DEMO.md` — 3-minute script + 60-second version + Q&A
- [x] `SKILLS.md` — what was installed and what shaped the code
- [x] `CHECKLIST.md` — this file
- [x] `../research.md`

## K. Ship

- [x] `npm run build` green
- [x] `npm test` green (171)
- [x] `npm run build:plugin` green → `dist/`
- [x] SDK confirmed bundled in the plugin chunks
- [x] UTF-8 correct in the built HTML
- [x] All 10 API endpoints return 200
- [x] Write path verified: `receipt_persisted` + delivered string
- [x] Idempotency verified: retry returns byte-identical response
- [x] Validation verified: agenda rejected as a write
- [ ] `evenhub pack` → `.ehpk` (needs `evenhub login`)
- [ ] Demo video recorded
- [ ] Submitted on DoraHacks

## L. Known gaps (honest)

- [x] Live Notion **read** wired — `getMeetings()` queries `NOTION_DATABASE_ID` and maps pages via `src/core/notion-map.ts`; falls back to fixtures with a `note` on any failure
- [ ] Google Calendar read not implemented (Notion only)
- [ ] No database; the action store is in-memory and lost on restart
- [ ] No auth; single-user demo
- [ ] `CHAR_ADVANCE_PX = 8.6` is an estimate, not measured font metrics
- [ ] Commitment detection is heuristic; false-positive rate unmeasured
- [ ] Beta-build lock test not run (needs hardware)
- [x] `wrapUntrusted()` applied to the transcript before `/api/parse` reaches an LLM

## M. Next actions, in order

1. `evenhub login` → `npm run pack` → verify the `.ehpk` installs as a private build
2. Record the demo per `DEMO.md`
3. Verify the live Notion read against a real database (mapper is unit-tested; the network path is not)
4. Submit on DoraHacks with the repo link, demo video, and the 5 API feature requests

---

## Docs

- [README](./README.md) — what it is, how to run it
- [PLAN](./PLAN.md) — product, architecture, build order, non-goals
- [ARCHITECTURE](./ARCHITECTURE.md) — module boundaries and invariants
- [DECISIONS](./DECISIONS.md) — every choice, with a revisit-if condition
- [COMPARISON](./COMPARISON.md) — what exists, what we took, what we changed
- [DEMO](./DEMO.md) — the 3-minute script
- [SKILLS](./SKILLS.md) — tooling and what shaped the code
- [CHECKLIST](./CHECKLIST.md) — live status and honest gaps
- [research.md](../research.md) — the deep research
