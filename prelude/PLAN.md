# PLAN — Prelude

**Track 04 · AI Assistants & Work** — *the brief before your next meeting.*

Status: **built and verified.** See [CHECKLIST.md](./CHECKLIST.md) for live status and
[DECISIONS.md](./DECISIONS.md) for the reasoning behind every choice.

---

## 1. The problem

You have a meeting in nine minutes. To be ready you need four facts and one action:

1. Who am I meeting?
2. What did they last say to me?
3. What doc did we last touch?
4. What is on the agenda?

…and then you need to *do* something: reply "running 5 late", add a prep note, or open the agenda.

Today that costs: unlock phone → open calendar → open the thread → open the doc → type a reply.
On a pair of glasses the fix is not "put the phone screen on your face". It is **one card, one decision,
one tap** — and a receipt that proves the tap did something real.

## 2. Who it is for

Knowledge workers and founders who wear G2 and move between meetings all day: in a corridor, in a lift,
carrying a laptop, mid-conversation. They do not want an inbox on their face. They want the one meeting
that is about to start, the gist of it, and an action they can accept with a tap.

## 3. What we build

A single Even Hub plugin, **Prelude**, with eight screens and one control surface.

| Screen | What it shows | Gestures |
|---|---|---|
| **brief** (root) | `PRELUDE · 9m` / who + title + open commitment + doc + agenda | tap → actions, swipe → next meeting, double-tap → exit |
| **actions** | ranked actions with a `>` cursor | swipe moves cursor, tap executes, double-tap → back |
| **agenda** | agenda items, paginated with a glyph progress bar | swipe pages, tap → back |
| **note** | prep-note composer: 3 preset chips | swipe selects, tap saves, double-tap → back |
| **memory** | cross-source recall with source + timestamp | tap → back |
| **followup** | every open commitment across meetings | tap → act, double-tap → back |
| **voice** | the voice state machine, transcript, parsed action | tap confirms, double-tap cancels |
| **receipt** | `SENT · 12:04` + the exact string delivered | tap → next meeting, double-tap → exit |

### The read & write round trip (the 25% criterion)

```
lens shows the card
   → one tap on "Reply: running 5 late"
      → POST /api/act  { meetingId, action: 'reply', text }
         → server validates against deterministic rules
            → walks the 9-state lifecycle
               → calls the provider adapter
                  → 200 { ok, status: 'receipt_persisted',
                          delivered: "running 5 late",
                          providerReference: "demo_idem_971776f9" }
   → lens shows SENT · 12:04 · "running 5 late"
```

The receipt carries **the exact string the server delivered**. The client never re-derives it, so the
confirmation cannot disagree with what was sent. That is the property a screenshot cannot fake.

### Voice (the 15% criterion)

```
IDLE → LISTENING → TRANSCRIBING → REVIEW → CONFIRMED → EXECUTING → RECEIPT
```

`transcribing → confirmed` is **not a legal transition**. The user sees the parsed action and taps.
A misheard transcript can never send a message.

## 4. Architecture

Four layers, arrows pointing inward only.

```
src/even/  ──▶  src/core/          (types + reducer + layout)
app/api/   ──▶  src/core/  ──▶  src/lib/integrations/
src/lib/   ──▶  src/core/
src/core/  ──▶  nothing
```

| Layer | Directory | Rule |
|---|---|---|
| Even Hub experience | `src/even/` | The only layer that imports the SDK |
| Application API | `app/api/` | No UI, no SDK |
| Intelligence engine | `src/core/` | **Imports nothing.** No SDK, no DOM, no fetch |
| Integration engine | `src/lib/integrations/` | The only layer that holds a provider token |

**The rule that makes this trustworthy:** `src/core/` imports nothing. That is what makes the layout
engine testable and what makes the display budget provable.

Full detail: [ARCHITECTURE.md](./ARCHITECTURE.md).

## 5. The display budget

| Band | y | h | Content |
|---|---|---|---|
| header | 0 | 32 | `PRELUDE · 9m` + mode tag |
| body | 36 | 200 | the card, ~7 lines at ~42 chars |
| status | 244 | 44 | the gesture hint or the receipt |

Hard limits, each enforced by a test:

| Constraint | Enforced in | Test |
|---|---|---|
| ≤ 999 UTF-8 bytes per container | `layout.ts: clampBand` | `actions.test.ts` |
| exactly one `isEventCapture: 1` | `containers.ts` | `containers.test.ts` |
| `zOrderIndex` on all or none, unique | `containers.ts` | `containers.test.ts` |
| containers inside 576×288 | `containers.ts` | `containers.test.ts` |
| ≤ 12 containers per page | 3 used | `containers.test.ts` |
| status drops whole fields, never truncates a number | `format.ts: fitFields` | `format.test.ts` |

## 6. Why this wins on the rubric

| Criterion | Weight | Our answer |
|---|---|---|
| Usefulness on G2 | 30% | The organizers' own named moment, daily and recurring, hands-free |
| Read and write | 25% | One tap → real side effect → receipt with the delivered string and provider reference |
| Technical execution | 20% | Pure tested core (263 tests), real backend, firmware rules pinned, deterministic gate |
| UX for display and voice | 15% | Three bands, one cursor, four gestures, voice never auto-commits |
| Business & safety | 10% | Token-only auth, no funds, no analytics, one whitelisted origin |

## 7. Competitive position

| Competitor | Their gap | Our edge |
|---|---|---|
| Glance Brief | Saves a Gmail **draft, never sends** | We send, and show the delivered string |
| Kept | Capture-only, no brief | We brief *before*, capture after |
| Aside | Task list, not a meeting | We are meeting-shaped |
| FixGuide AI | Phone repair | Different domain entirely |

Track 04 has ~6 builds. Track 01 has ~30 near-identical Telegram triage apps.

## 8. Build order (as executed)

1. `src/core/` + tests — the layout engine and the reducer
2. `src/even/` — containers, input routing, controller
3. `src/ui/` — the 576×288 browser mirror
4. `src/lib/` + `app/api/` — brief assembly, act, stt, parse, memory, followups
5. `scripts/gate.mjs` — typecheck → test → manifest → plugin build → app build
6. Docs, demo script, `.ehpk`

## 9. Non-goals

- **No Telegram.** 30 competitors for one slot.
- **No trading.** 18 near-identical HUDs, and money-safety rules add risk for zero differentiation.
- **No camera, no speaker.** The hardware has neither.
- **No dashboard on the lens.** One decision per screen.
- **No general database.** Only the action store is persisted — one Neon Postgres table when
  `DATABASE_URL` is set, with an in-memory fallback. Briefs, meetings and memory are computed, so
  nothing else needs a schema.
- **No auth.** The hackathon demo is single-user. OAuth is designed for (device flow) but not wired.
- **No queue.** Actions are synchronous and idempotent; a queue would add a failure mode without
  removing one.
- **No embeddings.** Deterministic term overlap is testable and reproducible. pgvector is the upgrade path.

## 10. What is deliberately deferred

| Deferred | Why | Upgrade path |
|---|---|---|
| Live **Calendar** read | No Google Calendar adapter yet; a half-mapped one is worse than an honest demo | `getMeetings()` in `src/lib/meetings.ts` is the single seam |
| OAuth | Single-user demo | Google device-authorization flow (no WebView OAuth) |
| Real font metrics | `CHAR_ADVANCE_PX = 8.6` is an estimate | `@evenrealities/pretext` via `@maticsh/glasses` |
| Commitment false-positive tuning | Unmeasured on real threads | Run over 50 real threads, tune the patterns |

## 11. Open questions

Tracked in [DECISIONS.md § Open questions](./DECISIONS.md#open-questions):

- Does a plugin survive a 30-minute phone lock?
- What is the real event spacing per swipe?
- Do image updates wipe text upgraded earlier?
- Is `@evenrealities/pretext` usable for exact text metrics?
- Does the firmware emit an end-of-scroll event?
- What is the false-positive rate of commitment detection?

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
