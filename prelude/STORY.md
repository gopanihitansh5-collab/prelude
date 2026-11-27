# Why Prelude

The submission is judged on five things: usefulness on G2 (30%), read *and* write (25%), technical execution
(20%), UX for display and voice (15%), business potential and safety (10%). This document is the argument for
each, followed by the part judges rarely get: **the challenges we hit and exactly how each one was beaten**, with
the file that proves it.

---

## 1. The value it drives

**The moment.** You are walking into a meeting. Somewhere in your phone is one thing you promised. Also: their
last message, the doc, the agenda, and the name of the person who is not the one you expected.

**The cost today.** Unlock → calendar → thread → doc → your notes → then act, which is another four screens. Call
it 40–60 seconds of phone-handling — while walking, in a corridor, in front of the person you are about to meet.

**What Prelude changes.** One glance, no unlock: who, how long, the thread, the doc, **the commitment you owe**.
One tap acts. The result is not a toast — it is a receipt.

**Why it is worth building.** It is daily, recurring, and it lands in the exact moment the organizers named in the
brief — *"a short brief before your next meeting"* — and then goes further, into the write. There is no data
network effect needed and no behaviour change beyond looking up instead of down.

**The business shape.** The backend already does the expensive part (integration, safety, receipts); the glasses
are a new surface on an existing workflow, not a new habit. Notion teams are the wedge: Prelude reads their
database and writes prep notes back to it, so adoption does not require data migration.

---

## 2. How unique it is — and where it is not

We surveyed the field. `prelude/COMPETITION.md` holds the evidence; the honest summary:

**Not unique (do not claim it):** pre-meeting briefs (six builds lead with it, FUSE Brief reads more sources than
we do), AI-drafted replies (modal), undo windows (8+ repositories — Cue 3 s, Kept 5 s, Glance Desk 2 s; **we have
none**), a large test count (Brief claims 511), deterministic fallback when the model fails, evidence that a write
happened (Questling "checks it arrived", GlanceMail's Sent state, Brief's `Sent` only after server confirmation),
read breadth (Questling reads six sources), write breadth, **and commitments with due dates and overdue state —
Kept (`2 DUE TODAY 1 LATE`), Kith (`2d overdue`) and Questling all do it.** Our third differentiator from the first
pass of research did not survive the second pass. Keeping it as product value, not as a claim of novelty.

**Genuinely rare, verified across 28 read READMEs of the 121 builds:**

| Claim | Why it is rare | Proof |
|---|---|---|
| **Ambiguity is a state, not a retry** | **0 of 28 verified builds model it.** Two say the sentence ("Not confirmed. Check Sent on your phone"; "if delivery is uncertain… check the chat") with no state, no surviving record and no reconciliation pass. Undo cancels *before* the send; this handles *after* it. | `src/core/action-lifecycle.ts` (`executing → reconciling`, never back), `src/lib/execute.ts`, `tests/action-lifecycle.test.ts` |
| **The receipt is a durable, addressable record** | **≤2 partial matches.** Most show a confirmation screen; Next Brief's `/api/audit/:id` (`Applied / Undone / Not reversible`) is closest. Ours persists the delivered string + provider reference, keyed and fetchable — a row you can look up tomorrow. | `src/lib/action-store.ts`, `app/api/actions/[id]/route.ts`, `app/actions/page.tsx`, `tests/execute.test.ts` |

**Product value we keep claiming without pretending it is unique:** the brief leads with the commitment you owe,
and the same detector runs as a radar across meetings (`src/core/commitments.ts`, `app/api/followups/route.ts`).
Others track overdue promises too — for Telegram people, or as a list. Ours puts it where the meeting starts.

That is the whole differentiation: **not "we have a brief", and not "we send" — but *"the brief ends in an
accountable action, and a lost response cannot become a duplicate message."***

---

## 3. Think → Act → Prove

The product is a loop, and each arc is enforced in code rather than by convention:

```
THINK   brief.ts + commitments.ts      deterministic; an LLM may propose, never decide
  │
ACT     actions.ts → reducer           every gesture is a pure transition
  │     action-lifecycle.ts            9 states; illegal transitions refused, not caught
  │
PROVE   execute.ts → adapter           the provider answers
        action-store.ts                a row is written
        receipt on the lens            the exact delivered string + provider reference
```

The design decision behind it: **a model may propose an action, but only the state machine may authorise one.**
That is why the LLM lives behind `src/lib/llm.ts` and cannot reach `execute.ts` — and why voice has a mandatory
REVIEW step (`transcribing → confirmed` is an illegal transition, `tests/voice.test.ts`).

---

## 4. Challenges we actually faced, and how each was beaten

This is the part we can prove rather than describe. Every row is a real failure, found by a test or a probe, and
fixed with the mechanism named.

| # | Challenge | How it showed up | How it was tackled | Proof |
|---|---|---|---|---|
| 1 | **`CLICK_EVENT = 0` disappears on the wire** | Protobuf omits zero-value fields, so a single tap arrives with *no* `eventType`. The obvious `event.sysEvent?.eventType ?? CLICK` fires CLICK on every scroll, lifecycle event and audio frame. | Resolve the default **inside** the envelope check in `bridge.ts::eventTypeOf`; documented as the trap it is. | `tests/containers.test.ts`, `tests/gate.test.ts` |
| 2 | **One long swipe arrives as several scroll events** | A single gesture flipped multiple screens. | Time-gate swipes (700 ms) and taps (350 ms), constants traced to measured hardware findings. | `src/even/gate.ts`, `tests/gate.test.ts` |
| 3 | **The BLE queue is slow (~83 ms per text upgrade)** | Fast tapping queued overlapping writes and the display lagged. | One write in flight, one pending, newest wins; the controller never decides what a gesture means. | `src/even/app.ts` |
| 4 | **576×288, 4-bit mono, hard byte limits** | Text overflowed or got cut mid-word. | `fitFields()` drops whole fields instead of truncating one; every band clamped to ≤999 UTF-8 bytes by test, measured in **bytes** not characters. | `src/core/format.ts`, `src/core/layout.ts` |
| 5 | **The network whitelist is not a CORS bypass** | Adding the host to `app.json` did not make the browser accept the response. | Two gates handled separately: whitelist in the manifest, CORS in `middleware.ts`. | `middleware.ts`, `app.json` |
| 6 | **The packaged app could not reach the API at all** | Loading `dist/index.html` over `file://` showed every fetch failing with "Failed to fetch" while the server answered normal origins fine. The origin is opaque (`null`), and Chrome does **not** accept `ACAO: null` for an opaque origin — `null` is not a wildcard. The app had been silently falling back to fixtures. | API routes answer `*` when the origin is opaque. Safe here: no cookies, no credentials; the write path is gated by a shared secret header. | `middleware.ts`, `scripts/plugin-e2e.mjs` |
| 7 | **A retry returned 500 with an empty body** | `executeAction` looked a retry up with the raw `meeting|kind|text` string while the record stored the FNV hash. The lookup never matched, so a second row was inserted and Postgres `UNIQUE(idempotency_key)` threw. In memory it was worse: it sent twice. | Look up with the same key the record is created with; return a failed record as-is instead of re-walking a terminal state. 8 tests pin the contract. | `src/lib/execute.ts`, `tests/execute.test.ts` |
| 8 | **`/actions` crashed in production** | Neon returns `timestamptz` as a `Date`; the row type claimed `string`, so a server component rendered a `Date` and Next threw "Objects are not valid as a React child". | Normalise timestamps at the store boundary (`toRecord` → ISO), with tests for Date, string and null. | `src/lib/action-store.ts`, `tests/action-store.test.ts` |
| 9 | **No Even host in a browser, but a red error on every load** | `createStartUpPageContainer failed: 1` in the console for a condition that is *expected* — the mirror has no glasses to paint. | Ask `hasEvenHost()` first (the exact `window.flutter_inappwebview` channel the SDK posts through); skip the call, say so once at info level, keep `console.error` for a real host that fails. | `src/even/bridge.ts`, `tests/bridge.test.ts` |
| 10 | **The portal rejected our store icon** | `icon pixel (0, 0) is #000000; every visible pixel must be opaque #F4F4F4`. | Generated a 24×24 icon with the glyph in `#F4F4F4` on a transparent field on the 2×2 raster grid. | `scripts/make-icon.mjs` |
| 11 | **The deploy failed with no explanation beyond "no app directory"** | The Next app lives in `prelude/`, the Vercel project was rooted at the repository, so every build ran `next build` in an empty root. | Set `rootDirectory = prelude` on the project via the API (clearing stale build commands) and recorded it in a script. | `scripts/vercel-admin.mjs` |
| 12 | **The `.ehpk` on disk was stale** | Gate rebuilt `dist/` after the package was stamped, so the artifact did not match the code. | Pack **after** the final build; verify by mtime, not hash (packing is non-deterministic), now a documented step. | `prelude.ehpk`, `SUBMISSION.md` |
| 13 | **3D labels clipped on phones** | drei renders `<Html>` as real DOM, so nodes near the edge bled past the viewport; the page hid the overflow, cutting "RECEIPT" in half. | Each scene measures the canvas (`useThree`) and scales to fit; a CDP script with real device emulation measures `scrollWidth` vs the requested width. | `app/experience/*.tsx`, `scripts/layout-check.mjs` |
| 14 | **Google sign-in does not work in the WebView** | It fails inside the Even app. | Designed for the device-authorization flow with a pairing code and wrote the decision down rather than pretending it works. | `DECISIONS.md` |
| 15 | **`.ehpk` cannot be inspected** | No unpack command, so a release could not be verified by contents. | Built probes that load the packaged page and report every request, failure and console error — that is how #6 and #9 were found. | `scripts/plugin-e2e.mjs`, `scripts/route-probe.mjs` |

**What this list is for.** It is not a brag sheet. It is the evidence that "works end to end" is a claim earned by
finding the failures, and that the safety story (idempotency, ambiguity, review) is enforced by code with tests —
not by a slide.

---

## 5. Documentation as proof

| Document | What it proves |
|---|---|
| [CHECKLIST.md](prelude/CHECKLIST.md) | every task's true state, including what is **not** done and why |
| [ARCHITECTURE.md](prelude/ARCHITECTURE.md) | four layers, the dependency rule, and every invariant with the test that protects it |
| [DECISIONS.md](prelude/DECISIONS.md) | 23 decisions, each with a **revisit-if** condition — including one superseded decision left visible |
| [COMPETITION.md](prelude/COMPETITION.md) | what the other builds do, what is crowded, what is rare, and what we are worse at |
| [SUBMISSION.md](prelude/SUBMISSION.md) | the submission copy, track compliance, and five grounded API feature requests |
| [DEMO.md](prelude/DEMO.md) | the three-minute script |

And the machine-checked part: **275 tests in 20 files**, a pure `src/core/` that imports no SDK, DOM or network,
and a gate that runs typecheck → tests → manifest → plugin build → app build.

---

## 6. What we would do next

In order, and unglamorous: enforce the shared key instead of `auth: open`; add the Google Calendar adapter (the
single biggest coverage gap against FUSE Brief); add a post-send **undo** (a compensating action, not a
pre-commit cancel — we already have the `reconciling` vocabulary for it); and run the 5-minute locked-phone test on
real hardware. Each is a week of work, not a rewrite, because the boundaries already exist.
