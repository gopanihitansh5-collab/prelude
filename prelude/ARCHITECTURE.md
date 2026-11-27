# ARCHITECTURE

Module boundaries, the invariants each one protects, and why the boundaries are where they are.

Status: **built, deployed and verified** — 275 tests across 20 files, typecheck clean, gate pass, Postgres action store live.

---

## The four layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. EVEN HUB EXPERIENCE          src/even/                          │
│     Glasses UI · gestures · microphone · display controller         │
│     The only layer that imports @evenrealities/even_hub_sdk         │
├─────────────────────────────────────────────────────────────────────┤
│  2. PRELUDE APPLICATION API      app/api/                           │
│     Briefs · actions · voice · receipts · memory · connections      │
│     Next.js route handlers. No UI, no SDK.                          │
├─────────────────────────────────────────────────────────────────────┤
│  3. INTELLIGENCE ENGINE          src/core/                          │
│     Brief · commitments · memory · ranking · layout · voice         │
│     Pure. No SDK, no DOM, no fetch. 275 tests.                      │
├─────────────────────────────────────────────────────────────────────┤
│  4. INTEGRATION ENGINE           src/lib/integrations/              │
│     Notion · Slack · Resend · Exa · demo, behind one interface      │
│     The only layer that holds a provider token.                     │
└─────────────────────────────────────────────────────────────────────┘
```

**The dependency rule:** arrows point inward only.

```
src/even/  ──▶  src/core/          (types + reducer + layout)
app/api/   ──▶  src/core/  ──▶  src/lib/integrations/
src/lib/   ──▶  src/core/
src/core/  ──▶  nothing
```

`src/core/` importing anything from `src/even/`, `app/`, or `src/lib/` is a bug. It is the reason the
core can be tested in seconds without a browser.

---

## `src/core/` — the intelligence engine

| File | Responsibility | Invariant it protects |
|---|---|---|
| `types.ts` | Domain types, 8 screens | No imports except `voice.ts` types |
| `format.ts` | Byte counting, truncation, wrapping, field fitting | `utf8Bytes` agrees with `TextEncoder`; `fitFields` never cuts a field in half |
| `brief.ts` | Raw meeting → `Brief` | The brief is a pure function of (meeting, now) |
| `commitments.ts` | Detect promises and requests | Deterministic; no model can widen what counts as a commitment |
| `memory.ts` | Cross-source recall | Scoring is reproducible; no embeddings |
| `voice.ts` | The voice state machine | `transcribing → confirmed` is illegal |
| `action-lifecycle.ts` | The action state machine | No execution without validation + confirmation |
| `actions.ts` | Ranking + the reducer | Every gesture is a pure transition |
| `layout.ts` | `AppState` → three strings | Every band ≤ 999 UTF-8 bytes |
| `panel.ts` | `AppState` → the panel layout | Every row ≤ 26 chars; derived from the same state |
| `fixtures.ts` | Demo meetings | Times are relative to load, so the card always reads "9m" |

### Two renderers, and which one is authoritative

There are two renderers, and the distinction matters:

| Renderer | Output | Authority |
|---|---|---|
| `layout.ts` → `render(state)` | `{ header, body, status }` | **The contract.** These are the exact strings the SDK containers receive. Every band is clamped to 999 UTF-8 bytes by a test. |
| `panel.ts` → `renderPanel(state)` | A structured panel layout | **The visual layer.** It reproduces what the hardware *looks* like: a dithered clock, a bordered list panel, icon glyphs. |

`layout.ts` is authoritative for behaviour. `panel.ts` is authoritative for appearance. Both derive
from the same `AppState`, so they cannot disagree about the facts — only about presentation.

The lens page shows both, stacked, with a caption saying which is which. That is deliberate: a judge
should be able to see the SDK contract and the hardware appearance side by side rather than trusting
one screenshot.

**The rule:** never let `panel.ts` become the source of a fact. If a value is not in `AppState`, it
does not belong in either renderer.

### Why the reducer is one function

Every gesture is a test case. `reduce(state, input)` returns `{ state, effect }` — the new state and a
declarative effect (`act`, `listen`, `exit`, `refresh`). The controller performs effects; it never decides
what a tap means.

### The commitment detector

```
"I'll send the revised pricing by Wednesday."
   │
   ├─ PROMISE_PATTERNS match  → owner: 'me'
   ├─ DEADLINE_PATTERNS match → dueAt: promisedAt + 3 days
   ├─ extractLabel()          → "revised pricing"
   └─ status                  → 'overdue' if dueAt < now
```

Deterministic on purpose. An LLM may *propose* a commitment, but the rules that decide whether one is
open are code, so they can be tested and cannot drift with a model change.

---

## `src/even/` — the Even Hub layer

| File | Responsibility | Invariant it protects |
|---|---|---|
| `bridge.ts` | SDK connection + event translation | `eventTypeOf` resolves CLICK **inside** the envelope check |
| `gate.ts` | Swipe and tap gating | One long swipe = one action; a fast double-tap ≠ two actions |
| `containers.ts` | The three text containers + menu | Exactly one `isEventCapture`; unique `zOrderIndex`; ≤999 bytes |
| `app.ts` | The controller | One write in flight; checkpoints on foreground events |

### The event pipeline

```
SDK event
   │
   ├─ menuItemClickEvent?  ──▶ onMenu(itemID)          (bypasses isEventCapture)
   ├─ SYSTEM/ABNORMAL exit ──▶ checkpoint()
   ├─ FOREGROUND 4 or 5    ──▶ checkpoint()            (never pause)
   │
   └─ toInput(event)
         │
         ├─ LONG_PRESS / RELEASE  ──▶ { type: 'long_press' }
         ├─ DOUBLE_CLICK          ──▶ { type: 'double_click' }
         ├─ SCROLL_TOP/BOTTOM     ──▶ { type: 'up' | 'down' }   ──▶ swipeGate (700 ms)
         └─ CLICK (or undefined)  ──▶ { type: 'click' }         ──▶ tapGate (350 ms)
                │
                ▼
            reduce(state, input)  ──▶ { state, effect }
                │
                ├─ effect 'act'    ──▶ POST /api/act ──▶ receipt input
                ├─ effect 'exit'   ──▶ shutDownPageContainer(1)
                └─ effect 'listen' ──▶ audioControl(true, Glasses)
```

### Why the gates exist

| Gate | Finding | What it prevents |
|---|---|---|
| Swipe 700 ms | **H12** | One long swipe arriving as several scroll events, flipping 3 screens |
| Tap 350 ms | **H11** | A fast double-tap being read as two taps — and on the root page, exiting the app |

Both cite their finding ID in `gate.ts`.

### The write queue

`textContainerUpgrade` costs ~83 ms on hardware. A fast-tapping user would queue overlapping writes.

```
paint(bands)
  ├─ if key === lastWritten → return          (no redundant write)
  ├─ if writing → pending = key; return       (newest wins)
  └─ writing = true
       for each of 3 upgrades: await
       writing = false
       if pending && pending !== lastWritten → paint() again
```

One write in flight, one pending, newest wins. Never a queue that grows.

### Why we never rebuild the page

**H20**: a rebuild cannot animate, and a page rebuilt empty then filled shows a second jump. So the
startup page is built **with its text already in it**, and every later change is an in-place upgrade.

---

## `app/api/` — the application API

| Route | Method | Responsibility |
|---|---|---|
| `/api/health` | GET | Liveness + mode (`demo` / `live`) |
| `/api/briefs` | GET | Today's meetings |
| `/api/act` | POST | Execute an approved action → receipt |
| `/api/actions` | GET | Action history, newest first; reports whether the store is durable |
| `/api/actions/preview` | POST | Validate without executing |
| `/api/actions/[id]` | GET | Status + receipt for one action |
| `/api/memory` | GET | Cross-source recall |
| `/api/followups` | GET | Open commitments across all meetings |
| `/api/connections` | GET | Provider status, never a token |
| `/api/stt` | POST | PCM → transcript |
| `/api/parse` | POST | Transcript → structured action |

### The action execution path

```
POST /api/act { meetingId, action, text, confirmed }
   │
   ├─ 1. createAction        → deterministic idempotency key
   ├─ 2. validateAction      → deterministic rules (no model)
   ├─ 3. transition ×4       → created → validated → awaiting → authorized → executing
   ├─ 4. adapter.execute     → the provider call
   ├─ 5. afterExecution      → confirmed | rejected | ambiguous
   └─ 6. buildReceipt        → only from a provider-confirmed record
```

**Idempotency.** The key is `idempotencyKey(meetingId, kind, text)` — an FNV hash rendered as
`idem_xxxxxxxx`, stored under a `UNIQUE(idempotency_key)` constraint. A retry of an action that already
reached the provider returns the existing receipt instead of sending again, and a record already in
`failed` is returned as it stands rather than re-walking the state machine (which would be an illegal
transition). Verified live against Neon: two identical `POST /api/act` calls return the same `actionId`,
the same `providerReference` and the same `at`, and the table holds one row.

The first implementation looked the retry up with the raw `meetingId|kind|text` payload the key is derived
from. That never matched the stored hash, so a retry inserted a second record: Postgres answered with a
duplicate-key `500`, and the in-memory store silently sent twice. `execute.ts` now derives the key and
looks it up with exactly that value. The adapter is resolved once per call and every branch reports
`adapter.id`, so a success and a rejection on the same meeting cannot disagree about the channel.

**Ambiguity.** A 5xx or a network error after the request left is `ambiguous`, not `failed`. The action
goes to `reconciling` and is never retried blindly.

**Validation.** `validateAction()` rejects: an unknown meeting, an unconfirmed action, empty text, text
over 280 characters, and the agenda (a read, not a write). Verified: `POST /api/act` with `agenda`
returns `{"ok":false,"error":"agenda is a read, not a write"}`.

---

## `src/lib/integrations/` — the integration engine

One interface, many providers:

```ts
interface IntegrationProvider {
  readonly id: string
  readonly label: string
  connect(): Promise<Connection>
  getStatus(): Promise<Connection>
  search(query: SearchQuery): Promise<SourceItem[]>
  getItem(id: string): Promise<SourceItem | null>
  execute(action: ActionRequest): Promise<ActionResult>
  disconnect(): Promise<void>
}
```

| Adapter | File | Notes |
|---|---|---|
| Demo | `demo.ts` | Full contract, no credentials. The default |
| Notion | `notion.ts` | Real read + write. No idempotency key, so a retry is ambiguous by design |
| Slack | `slack.ts` | Real read + write. **Has** `client_msg_id`, so a retry is safe |
| Resend | `resend.ts` | Email write target. **Has** an `Idempotency-Key` header, so a retry is safe. No read API |
| Exa | `exa.ts` | Read-only web search. `execute` refuses every action rather than pretending to send |

Adding Gmail, Calendar, Drive or Outlook means writing one file and registering it in `index.ts`. The
brief engine never learns which app a fact came from.

**The token rule.** Only this layer holds a provider token. It never crosses into `src/even/`, and it is
never bundled into the `.ehpk`.

---

## Invariants, and where each is enforced

| Invariant | Enforced by | Test |
|---|---|---|
| Exactly one event-capture container | `containers.ts` | `containers.test.ts` |
| `zOrderIndex` all-or-nothing, unique | `containers.ts` | `containers.test.ts` |
| Every band ≤ 999 UTF-8 bytes | `layout.ts: clampBand` | `actions.test.ts` |
| Containers inside 576×288 | `containers.ts` | `containers.test.ts` |
| Menu ≤10 items, non-zero unique IDs, ≤32 bytes | `containers.ts` | `containers.test.ts` |
| `CLICK_EVENT` resolved inside the envelope | `bridge.ts` | documented (D-11) |
| One swipe = one action | `gate.ts` | `gate.test.ts` |
| One fast double-tap ≠ two taps | `gate.ts` | `gate.test.ts` |
| No execution without confirmation | `action-lifecycle.ts` | `action-lifecycle.test.ts` |
| No execution from an unvalidated transcript | `voice.ts` | `voice.test.ts` |
| Ambiguous failure never retries blindly | `action-lifecycle.ts` | `action-lifecycle.test.ts` |
| A retry returns the stored receipt, never a second send | `execute.ts` | `execute.test.ts` |
| Receipt text comes from the record, not a model | `action-lifecycle.ts` | `action-lifecycle.test.ts` |
| `fitFields` drops whole fields | `format.ts` | `format.test.ts` |
| `utf8Bytes` agrees with `TextEncoder` | `format.ts` | `format.test.ts` |
| Commitments are detected deterministically | `commitments.ts` | `commitments.test.ts` |
| Recall scoring is reproducible | `memory.ts` | `memory.test.ts` |

---

## Test inventory

| File | Tests | Covers |
|---|---|---|
| `format.test.ts` | 31 | byte counting, truncation, wrapping, field fitting, relative time |
| `brief.test.ts` | 20 | attendee selection, last message, brief assembly, upcoming/next |
| `actions.test.ts` | 27 | ranking, navigation, writes, receipts, all 8 screens' rendering |
| `action-lifecycle.test.ts` | 25 | idempotency, illegal transitions, validation, ambiguity, receipts |
| `commitments.test.ts` | 19 | promise, request, deadline, overdue, ordering |
| `memory.test.ts` | 16 | scoring, recency, empty, line fitting |
| `llm.test.ts` | 16 | untrusted-input wrapping, proposal shape, failure fallback |
| `containers.test.ts` | 15 | capture, z-order, bytes, canvas bounds, menu rules |
| `voice.test.ts` | 14 | REVIEW mandatory, cancellation, execution guard |
| `context.test.ts` | 13 | the brief context layer and its provenance |
| `action-store.test.ts` | 11 | in-memory store, Postgres selection, row → record date normalisation |
| `panel.test.ts` | 11 | 26-char rows, panel structure, clock dithering |
| `enrich.test.ts` | 10 | Exa line selection, citation, failure fallback |
| `auth.test.ts` | 9 | shared-secret gate, timing-safe comparison |
| `notion-map.test.ts` | 9 | page → Meeting mapping, blocks → prep notes |
| `execute.test.ts` | 8 | retry contract: stored receipt on retry, one row, key = `idempotencyKey()`, channel parity |
| `gate.test.ts` | 7 | swipe burst, tap burst, window restart |
| `architecture.test.ts` | 5 | the dependency rule — core imports nothing outward |
| `voice-transport.test.ts` | 5 | browser capture → transport seam |
| **Total** | **275** | **20 files** |

---

## What is deliberately absent

| Not built | Why |
|---|---|
| A migration framework | The schema is one `CREATE TABLE IF NOT EXISTS` in the store. A migration tool is the upgrade path once there are real users, not before |
| Auth | The deployment runs in `auth: open` demo mode. A shared key (`requireActKey`) exists for a locked-down build; user accounts do not |
| A queue | Actions are synchronous and idempotent. A queue would add a failure mode without removing one |
| Embeddings | Deterministic term overlap is testable and reproducible. pgvector is the upgrade path |
| A second source of truth | Two renderers exist — `layout.ts` (contract) and `panel.ts` (appearance) — but both derive from `AppState` and neither may invent a fact |
| Live calendar read | Needs a property mapping; a half-mapped one is worse than an honest demo |

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
