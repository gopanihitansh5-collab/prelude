# ARCHITECTURE

Module boundaries, the invariants each one protects, and why the boundaries are where they are.

Status: **built and verified** — 171 tests, typecheck clean, gate pass.

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
│     Pure. No SDK, no DOM, no fetch. 171 tests.                      │
├─────────────────────────────────────────────────────────────────────┤
│  4. INTEGRATION ENGINE           src/lib/integrations/              │
│     Notion · Slack · demo, behind one interface                     │
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
core can be tested in 1.2 seconds without a browser.

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
| `fixtures.ts` | Demo meetings | Times are relative to load, so the card always reads "9m" |

### Why `layout.ts` is the single source of truth

The glasses render containers, not HTML. The browser mirror renders HTML. If those were two code paths,
they would drift, and the mirror would stop being evidence.

So `render(state)` returns `{ header, body, status }` and **both** paths paint exactly those strings.
There is no second renderer.

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

**Idempotency.** The key is `hash(meetingId|kind|text)`. A retry of an action that already reached the
provider returns the existing receipt instead of sending again. Verified: two identical `POST /api/act`
calls return a **byte-identical** response.

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
| Receipt text comes from the record, not a model | `action-lifecycle.ts` | `action-lifecycle.test.ts` |
| `fitFields` drops whole fields | `format.ts` | `format.test.ts` |
| `utf8Bytes` agrees with `TextEncoder` | `format.ts` | `format.test.ts` |
| Commitments are detected deterministically | `commitments.ts` | `commitments.test.ts` |
| Recall scoring is reproducible | `memory.ts` | `memory.test.ts` |

---

## Test inventory

| File | Tests | Covers |
|---|---|---|
| `format.test.ts` | 24 | byte counting, truncation, wrapping, field fitting, relative time |
| `brief.test.ts` | 20 | attendee selection, last message, brief assembly, upcoming/next |
| `actions.test.ts` | 27 | ranking, navigation, writes, receipts, all 8 screens' rendering |
| `containers.test.ts` | 15 | capture, z-order, bytes, canvas bounds, menu rules |
| `gate.test.ts` | 7 | swipe burst, tap burst, window restart |
| `action-lifecycle.test.ts` | 22 | idempotency, illegal transitions, validation, ambiguity, receipts |
| `voice.test.ts` | 12 | REVIEW mandatory, cancellation, execution guard |
| `commitments.test.ts` | 17 | promise, request, deadline, overdue, ordering |
| `memory.test.ts` | 15 | scoring, recency, empty, line fitting |
| **Total** | **171** | |

---

## What is deliberately absent

| Not built | Why |
|---|---|
| A database | A 6-day build does not need one. The in-memory store has the same shape as a Postgres table |
| Auth | The hackathon demo is single-user. OAuth is designed for (device flow) but not wired |
| A queue | Actions are synchronous and idempotent. A queue would add a failure mode without removing one |
| Embeddings | Deterministic term overlap is testable and reproducible. pgvector is the upgrade path |
| A second renderer | The mirror paints the same strings as the glasses. Two renderers would drift |
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
