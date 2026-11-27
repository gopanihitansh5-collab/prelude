# What already exists — and what we take from it

You asked: *check all the work done, what we're doing, how we can harness or replicate it, and if people
have already made similar things, how do we make ours better.*

This is that answer, in four parts: **our own workspace**, **the public G2 ecosystem**, **the concrete
changes we made because of it**, and **how we make ours better**.

---

## Part 1 — Our own workspace

Surveyed every project in `c:\Users\rcgop\Desktop\work` (code files, excluding `node_modules`/`.next`/`.git`).

| Project | Code files | What it is | Reusable for Prelude? |
|---|---|---|---|
| `terraforge` | 16,580 | Large Python ML/data platform | ❌ Different domain |
| `praxis-telco-churn` | 7,534 | Churn prediction pipeline | ❌ Different domain |
| `lightnoteaiiii` | 1,156 | Next.js AI document product | ✅ **Yes — several modules** |
| `G2_Glasses` | 770 | This hackathon folder | — |
| `ppc-crm` | 409 | Next.js CRM | ⚠️ Patterns only |
| `crucible` | 346 | Web3/contracts project | ❌ Different domain |
| `team-hub` | 248 | Next.js team app w/ Prisma | ⚠️ Patterns only |
| `blockchain-gnn-link-prediction` | 181 | ML notebook project | ❌ Different domain |
| `trustllm` | 108 | Next.js app | ⚠️ Patterns only |
| `notiqy-ai` | 54 | Python inference | ❌ Different domain |
| `incident-intel` | 41 | Python service | ❌ Different domain |

### What we actually took from `lightnoteaiiii`

This is the one project with directly transferable, production-grade code.

| Module | What it does | How we used it |
|---|---|---|
| `lib/ai/provider.ts` | Explicit provider selection that **never silently changes provider**; throws on an invalid value; separates "which provider" from "is it configured" | Adopted the same discipline in `src/lib/speech.ts`: keyword rules first, LLM only when a key exists, and the dashboard shows which is active |
| `lib/ai/usage.ts` | Per-call metering that **never throws** and writes one structured JSON line | Same rule applied to `checkpoint()` in `src/even/app.ts` — a checkpoint must never break the app |
| `lib/security/input-guard.ts` | `assertMaxLen` / `checkMaxLen` size caps + `wrapUntrusted()` prompt-injection containment with marker neutralisation | **Directly relevant.** Our `/api/parse` sends a user transcript to an LLM. Adopted the size-cap idea; the injection wrapper is the next step if we enable LLM routing by default |
| `lib/security/redact.ts` | Secret redaction before logging | Applied as a rule: no token ever reaches the WebView, and the server never logs one |
| `lib/observability/report-error.ts` | Structured error reporting | Pattern noted for the `/api/act` failure path |

**The single most valuable idea borrowed:** *an explicit choice never silently changes provider.* Our app
now says `demo` in the header when there is no token, instead of quietly pretending to be live. That is
the same principle applied to the UI.

### What we deliberately did **not** take

- `terraforge` / `praxis-telco-churn` — ML pipelines, nothing to do with a 576×288 display.
- `crucible` — Web3 contracts. The hackathon's money-safety rule makes this a liability, not an asset.
- `team-hub`'s Prisma schema — no ORM: the action store is one Neon Postgres table in
  `src/lib/action-store.ts`, with an in-memory fallback, and a meeting brief needs nothing more.

---

## Part 2 — The public G2 ecosystem

Searched GitHub for Even Realities / Even Hub projects. Four results, and one of them is a goldmine.

| Repo | What it is | What we took |
|---|---|---|
| **`maticsh/matic-even`** | **23 measured findings on real G2 hardware**, plus `@maticsh/glasses`, `@maticsh/phone`, `@maticsh/testing` packages, a probe app, and a relay server | ⭐ **The most valuable find.** Three of its findings were real bugs in our code. See Part 3 |
| `lim0513/even-g2-plugin-hear` | Live captions for the hard of hearing, Soniox STT, nothing recorded | Confirms the STT-behind-a-server pattern we use |
| `tntpsu/even-voice-shim` | Push-to-talk STT shim, VAD + Cloudflare Worker, explicitly a **workaround for the missing on-device STT API** | Validates our decision to keep voice as a *fallback* and tap as the primary path |
| `chrissantorelli/moonphase-g2` | Moon phase app | Nothing — different domain |

Plus the official and community references already catalogued in `../research.md`:
`even-realities/evenhub-templates` (4 scaffolds), `nickustinov/even-g2-notes` (perf + event quirks),
`nickustinov/demo-app-g2`, `dmyster145/EvenChess`, `fuutott/rdt-even-g2-rddit-client`,
`fabioglimb/even-toolkit` (55+ components, 191 icons).

### The competitive picture (from the DoraHacks builds list)

| Track | Builds | Verdict |
|---|---|---|
| 01 Messaging & News | ~30 | Bloodbath — ~20 Telegram triage clones |
| 02 Crypto & DeFi | ~18 | Heavy — Hyperliquid/Polymarket HUD clones |
| 03 Exchanges & Stocks | ~4 | Light |
| **04 AI Assistants & Work** | **~6** | **Our track. Nearly empty** |

Closest competitor: **Glance Brief** — next meeting + unread inbox, reply saved as a **Gmail draft, never
sent**. That is a self-inflicted wound on the 25% read&write criterion. We send, and we show the delivered
string.

---

## Part 3 — What we changed because of the research

This is the part that matters. Three findings from `matic-even` were **real bugs in our code**, not
nice-to-haves.

### 🔴 H12 — One long swipe arrives as several scroll events

> *"One long swipe can arrive as several scroll events. A screen that changes on swipe then flips more
> than once."*

**Our bug:** `dispatch()` acted on every `up`/`down`. One long swipe would have flipped through three
meetings.

**Fix:** `src/even/gate.ts` — `createGate(700)`. Act on the first event, ignore the rest for 700 ms.
**Test:** `tests/gate.test.ts` asserts a 7-event burst collapses to exactly one.

### 🔴 H11 — Quick repeated taps become a double tap

> *"The glasses read quick repeated taps as a double tap. On the root page a double tap opens the exit
> dialog. So a triple tap never reaches the app as three taps."*

**Our bug:** a user tapping twice quickly to open actions then act would have **exited the app**.

**Fix:** `createGate(350)` on taps.
**Test:** three taps at 0/120/240 ms collapse to one.

### 🔴 H19 — Users can bind long press to a system action

> *"Users can bind a temple's long press to a system action. On the tester's glasses, a long press on the
> left temple starts Even AI. So an app cannot count on a long press reaching it."*

**Our bug:** voice was reachable **only** by long press. On a user with that binding, voice would be
unreachable.

**Fix:** a contextual menu with a **"Speak"** item (`MENU_ITEMS`), wired through `menuItemClickEvent`.
Long press still works; the menu is the reliable route.
**Test:** `tests/containers.test.ts` asserts ≤10 items, non-zero unique IDs, ≤32 UTF-8 bytes per label,
and that labels are verbs not state readouts.

### 🟡 H2 — The five text brightness levels look too alike to rank text

> *"All five textColor levels render… In normal use the levels look close together. They do not give a
> useful hierarchy."*

**Our bug:** we had header=4, body=4, status=**2** — using brightness as hierarchy, which the field notes
say does not work.

**Fix:** all three bands at 4. Hierarchy now comes from position and the gap in `y`.
**Test:** `BRIGHTNESS` is asserted uniform, with the reason written in the file.

### 🟡 H20 — A page rebuild cannot animate, and empty-then-filled shows a second jump

**Our fix:** the startup page is built **with its text already in it**, and every later change is an
in-place `textContainerUpgrade`. We never call `rebuildPageContainer`.
**Test:** `startupPage()` is asserted to have non-empty content in every container.

### 🟡 H7 — OS overlays fire foreground events, and EXIT does not mean "app left"

> *"Never map EXIT to pause and ENTER to resume. With overlays, that mapping pauses your app when the menu
> closes, just as the user comes back to it."*

**Our fix:** every foreground event (4 or 5) is a **checkpoint** — save state, re-arm — never a pause.
**Test:** the reducer has no pause path; `checkpoint()` is wrapped so it can never throw.

### 🟢 H22 — Share, clipboard and mail links fail in the Even WebView

Not applicable yet (we have no share button), but recorded so we do not add one.

### 🟢 H15 — A QR sideload ran 18 minutes with the iPhone locked

Contradicts Even's own docs. Means our local testing is more representative than expected — but we still
plan a beta build for the 5-minute lock test.

---

## Part 4 — How we make ours better than what exists

| Lever | What we do | Why it beats the field |
|---|---|---|
| **The empty track** | Track 04, ~6 builds vs ~30 | We are not competing with 30 Telegram clones |
| **The named moment** | The organizers literally wrote *"a short brief before your next meeting"* | We build the example they gave |
| **Real write, verbatim receipt** | Server returns the delivered string; the lens renders it unchanged | Glance Brief never sends. A screenshot cannot fake our receipt |
| **Commitment awareness** | The brief leads with what you owe, not what was said | Every competitor summarises; nobody surfaces obligations |
| **Follow-up radar** | The same detector runs across every meeting | Useful *between* meetings, not only nine minutes before one |
| **Measured-hardware discipline** | Every input rule cites a finding ID and has a test | Most entries are built on the docs alone; the docs are wrong about lock behaviour (H15) |
| **Pure tested core** | 271 tests, no SDK/DOM/network | The state machine is provable, not click-tested |
| **Honest demo mode** | No token → fixtures, header says `demo` | Borrowed from `lightnoteaiiii`'s "never silently change provider" |
| **One codebase, two targets** | Next.js serves the dashboard + API **and** exports the plugin | Competitors have a plugin or a backend, rarely both from one tree |
| **Firmware rules pinned by tests** | one capture container, unique z-order, ≤999 bytes, canvas bounds | The SDK validates at runtime; we fail at test time |
| **Ambiguity as a state** | A lost response goes to `reconciling`, never a blind retry | Nobody else models the duplicate-send risk |

### What we would take next, if there were more time

1. **`@maticsh/testing`** — a fake glasses bridge for tests. Would let us test the controller end to end
   without a simulator.
2. **`@maticsh/glasses` text fitting** — they use `@evenrealities/pretext` for real font metrics. Our
   `CHAR_ADVANCE_PX = 8.6` is an estimate; theirs is measured.
3. **`wrapUntrusted()`** from `lightnoteaiiii` — wrap the transcript before it reaches the LLM in
   `/api/parse`.
4. **`even-toolkit`'s 191 pixel icons** — for the store listing icon (24×24, 2×2 blocks).
5. **`matic-even`'s relay server** — a hardened proxy pattern if we ever need more than one origin.

---

## Sources

- `maticsh/matic-even` — 23 measured findings, MIT, measured 2026-10-03 → 10-09 on a real G2, SDK 0.0.16
- `lim0513/even-g2-plugin-hear`, `tntpsu/even-voice-shim`, `chrissantorelli/moonphase-g2`
- `even-realities/evenhub-templates`, `nickustinov/even-g2-notes`, `fabioglimb/even-toolkit`
- Local: `lightnoteaiiii/lib/{ai,security,observability}`
- `../research.md` — the full research, including live endpoint probes

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
