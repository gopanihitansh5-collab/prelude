# CHECKLIST

Live status of everything asked for and everything done.

Legend: `[x]` done · `[~]` in progress · `[ ]` not started · `[!]` blocked

Last verified: **2026-11-27 12:26 IST** — `tsc --noEmit` clean, 263 tests / 18 files green, **GATE PASS**
on all 5 stages, layout sweep green at 390 px and 320 px on all 8 routes, `prelude.ehpk` rebuilt (243 KB).
Deploys verified at <https://prelude-green.vercel.app>; today's fixes are **local only** — the live build
still serves the old code until the owner redeploys.

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
- [x] **`DECISIONS.md`** — 23 decisions (1 superseded), each with a revisit-if condition
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
- [x] `panel.ts` — AppState → the panel layout, the visual layer for the same 8 screens
- [x] `context.ts` — the brief context layer and its provenance
- [x] `notion-map.ts` — Notion page → Meeting mapping, blocks → prep notes
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
- [x] **Landing responsive** (`app/experience/`) — drei `<Html>` scene labels bled past the viewport on
  phones. `intelligence-network.tsx` and `ecosystem.tsx` read the `useThree()` viewport width and scale
  their group to fit the canvas (`fit`), plus label font scaling and a responsive hover-panel `minWidth`;
  `action-flow.tsx` scales its rail to fit; `.stage` in `experience.css` got `overflow: hidden` as a
  safety net (it also clips any label the fit misses — intended)
- [x] **Dashboard nav fix** (`app/globals.css`) — the 7-link `.nav` did not wrap, which widened the mobile
  layout viewport to ~445 px on `/actions`, `/followups`, `/memory`, `/connections`, `/settings`. `.nav`
  now wraps and a `@media (max-width: 640px)` block stacks `.topbar` and tightens padding
- [x] `app/experience/intelligence-network.tsx` — `useThree` imported (fixed 2026-11-27 12:24 IST, commit
  `3aabdf4`); `npx tsc --noEmit` clean again and `gate.mjs` back to **GATE PASS** on all 5 stages

## H. Server

- [x] `/api/health`, `/api/briefs`
- [x] `/api/act` — through the lifecycle + registry
- [x] `/api/actions`, `/api/actions/preview`, `/api/actions/[id]`
- [x] `/api/memory`, `/api/followups`, `/api/connections`
- [x] `/api/stt`, `/api/parse`
- [x] Adapters: demo, Notion, Slack, Resend, Exa behind one interface
- [x] CORS headers correct

## I. Tests & gate

- [x] **263 unit tests, 18 files**
- [x] Container-rule tests (capture, z-order, bytes, canvas bounds, menu)
- [x] Gate tests (swipe burst, tap burst)
- [x] Lifecycle tests (illegal transitions, ambiguity, receipts)
- [x] Voice tests (REVIEW mandatory, cancellation)
- [x] Commitment tests (promise, request, deadline, overdue)
- [x] Memory tests (scoring, recency, empty)
- [x] `scripts/gate.mjs` — typecheck → test → manifest → plugin build → app build
- [x] **GATE PASS** (all 5 stages) — re-run 2026-11-27 12:26 IST after the `useThree` import fix: typecheck
  18.7 s, 263 tests, manifest, plugin build, app build
- [x] 3 new store tests — Postgres `Date`→ISO, string passthrough, omitted null optionals
  (`tests/action-store.test.ts`, now 11 tests)
- [x] `scripts/layout-check.mjs` — drives headless Chrome over the DevTools Protocol (real device
  emulation, not `--window-size`), measures `scrollWidth` against the requested width, detects
  layout-viewport expansion, distinguishes visible overflow from content deliberately clipped by an
  `overflow: hidden` ancestor, sweeps 7 scroll stops per page, writes screenshots. Usage:
  `node scripts/layout-check.mjs http://localhost:5173/ 390 320 768 1440`
- [x] **Layout sweep green** — `/`, `/lens`, `/dashboard`, `/actions`, `/followups`, `/memory`,
  `/connections`, `/settings` all pass at 390 px and 320 px: no horizontal overflow, no visible clipped
  content (the only clipped items are 3D labels inside `.stage`, which is intended)
- [x] `scripts/db-check.mjs` — connectivity/schema probe for the Neon action store
  (`node scripts/db-check.mjs` with `DATABASE_URL`); confirmed the `actions` table exists with 11 columns
  and 2 rows
- [x] `tsc --noEmit` — clean again after the `useThree` import fix (section G)

## J. Docs

- [x] `README.md` — problem, features, architecture, verified behaviour, value, setup
- [x] `PLAN.md` — product, architecture, build order, non-goals, deferred
- [x] `ARCHITECTURE.md` — 4 layers, invariants, test inventory
- [x] `DECISIONS.md` — 23 decisions (1 superseded) + 7 open questions
- [x] `COMPARISON.md` — workspace survey, GitHub survey, what we changed
- [x] `DEMO.md` — 3-minute script + 60-second version + Q&A
- [x] `SKILLS.md` — what was installed and what shaped the code
- [x] `CHECKLIST.md` — this file
- [x] `../research.md`

## K. Ship

- [x] `npm run build` green — re-run 2026-11-27 12:26 IST as part of the gate, after the responsive edits
- [x] `npm test` green (263)
- [x] `npm run build:plugin` green → `dist/`
- [x] SDK confirmed bundled in the plugin chunks
- [x] UTF-8 correct in the built HTML
- [x] All API routes return 200
- [x] Write path verified: `receipt_persisted` + delivered string
- [x] Idempotency verified: retry returns byte-identical response
- [x] Validation verified: agenda rejected as a write
- [x] `evenhub pack` → `prelude.ehpk` (243 KB, SDK 0.0.16), rebuilt 2026-11-27 — packing needs no login; only uploading does
- [x] Deployed backend — <https://prelude-green.vercel.app> (`/api/health` → `200`, `mode: demo`)
- [x] Postgres action store live in production — `/api/actions` → `durable: true`, real rows
- [x] `/actions` 500 **fixed locally, pending redeploy** — Neon returns `timestamptz` as a JS `Date` while
  the store's `Row` type claimed `string`, so the server component tried to render a `Date` and Next threw
  "Objects are not valid as a React child". `toRecord()` in `src/lib/action-store.ts` now normalises
  timestamps to ISO strings via an `iso()` helper; `toRecord` and `Row` are exported; 3 unit tests pin
  Date→ISO, string passthrough, and omitted null optionals. Committed locally — the live deployment still
  serves the old build until the owner redeploys
- [ ] Private-build install on hardware (`evenhub upload`, needs login + glasses)
- [ ] Demo video recorded
- [ ] Submitted on DoraHacks

## L. Known gaps (honest)

- [x] Live Notion **read** wired — `getMeetings()` queries `NOTION_DATABASE_ID` and maps pages via `src/core/notion-map.ts`; falls back to fixtures with a `note` on any failure
- [ ] Google Calendar read not implemented (Notion only)
- [x] Database — Neon Postgres action store (`DATABASE_URL`); in-memory fallback keeps a zero-setup demo working
- [ ] No auth; the deployment runs `auth: open`. A shared key (`requireActKey`) exists but is not enforced for the demo
- [ ] `CHAR_ADVANCE_PX = 8.6` is an estimate, not measured font metrics
- [ ] Commitment detection is heuristic; false-positive rate unmeasured
- [ ] Beta-build lock test not run (needs hardware)
- [x] `wrapUntrusted()` applied to the transcript before `/api/parse` reaches an LLM

## M. Next actions, in order

1. **Redeploy on Vercel (owner)** — today's fixes are committed and pushed on `master`; the live build still
   serves the pre-fix code, so `/actions` is still the one 500 on production until the next deploy lands
2. `evenhub login` → `evenhub upload prelude.ehpk -m "…"` → verify it installs as a private build on the
   glasses
3. Record the demo per `DEMO.md`
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
