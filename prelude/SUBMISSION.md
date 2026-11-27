# SUBMISSION

Everything needed to submit to **Heads Up: Even Realities Hackathon** (DoraHacks). Deadline
**2026-11-30 01:29 IST** (Nov 29, 23:59 Dubai).

Four things are required, one is optional:

| Required | Where it is |
|---|---|
| Public repository with a README that explains setup | <https://github.com/gopanihitansh5-collab/prelude> — [README](./README.md) |
| Demo video, up to 3 minutes, in the simulator or on G2 | script + shot list in [DEMO.md](./DEMO.md) |
| Short description: problem, who it is for, how it works, track | copy below |
| — | — |
| Optional: packaged `.ehpk` | `prelude.ehpk` — uploaded as **com.prelude.brief 0.1.0**, private beta |

---

## Short description (paste into DoraHacks)

**Track 04 · AI Assistants & Work**

**The problem.** You have a meeting in nine minutes. You know there is something you were
supposed to send. Finding out costs you the phone: unlock, calendar for the time, the thread for
the last message, the doc for the agenda, your own notes for the promise you made. Then you have
to act, and that is another four screens.

**Who it is for.** Anyone who walks between meetings all day — founders, sales, consultants,
managers — and would rather glance than unlock.

**What Prelude does.** One card on Even G2 before the meeting: who you are meeting, how long
until it starts, the last thing they said, the doc, and the one commitment you owe them —
`OPEN: Enterprise pricing promised`. One tap acts: reply, prep note, open agenda. The reply goes
out through the backend and comes back as a **provider-confirmed receipt** with the exact string
delivered, so the glasses never claim an action that did not happen.

**How it works.** A Next.js backend holds the integrations (Notion read, Resend email write, Exa
enrichment, an LLM that may only *propose*) and the action store (Neon Postgres). The plugin is a
static WebView bundle using Even Hub SDK 0.0.16, painting three text containers at 576×288. The
domain logic is pure and deterministic: an LLM can propose an action, but only a 9-state
lifecycle can authorise one, and voice can never send without a REVIEW step.

**What makes it different for a judge.** Read *and* write, proved: a receipt exists only after a
provider confirmed the action, and a retry returns that same receipt instead of sending twice.
That property is a state machine with idempotency keys, tested — not a promise in a README.

---

## Track compliance (read this before submitting)

Track 04's in-scope apps are **Claude, ChatGPT, OpenRouter, Notion, Google Workspace**. The rule is
"build your core integration on the apps listed in your track; any other tools on top are fine".
So the submission must describe the core integration as **Notion**, which is accurate:

| Role | App | In track scope? |
|---|---|---|
| **Core integration — read** | **Notion** (`src/lib/integrations/notion.ts`) — meetings, attendees, last thread, doc, block content | **yes** |
| **Core integration — write** | **Notion** — a prep note is appended as blocks to the meeting page | **yes** |
| Reasoning | **OpenRouter / any OpenAI-compatible LLM** (`src/lib/llm.ts`) — may only *propose* an action | **yes** |
| Add-on | Resend email — delivers a reply to an external attendee with an `Idempotency-Key` | add-on, allowed |
| Add-on | Exa — one citable line when a meeting has no thread and no doc | add-on, allowed |

Use that framing in the DoraHacks description: **"Core integration: Notion (read the meeting,
write the prep note)."** Do not present email delivery as the core — it is a second write channel,
which the rules permit, but it is not the track's app.

Known gap to state honestly if asked: Google Calendar and Gmail are designed but not wired
([DECISIONS.md](./DECISIONS.md#open-questions)); Notion is the wired read+write path.

---

## What existed before Nov 23 (required by the rules)

Everything in `prelude/` was written during the build week, with two exceptions, stated plainly:

| Thing | Origin | What we wrote |
|---|---|---|
| Even Hub SDK `@evenrealities/even_hub_sdk` 0.0.16 | official SDK, existed before | our usage of it: containers, gesture gating, event quirks |
| `@evenrealities/evenhub-cli` 0.2.0 | official tooling, existed before | `scripts/build-plugin.mjs`, `scripts/gate.mjs` |
| Next.js, React, three.js, drei, GSAP | open-source libraries, existed before | all application code |
| Notion / Slack / Resend / Exa / Neon APIs | third-party APIs, existed before | adapters behind one interface |
| ments· findings on G2 input timing | public write-up (`maticsh/matic-even`), existed before | the gates and constants cite it; no code copied |
| Skills in `.agents/skills/` | third-party skill pack, installed before | not shipped in the plugin bundle; `.gitignore`d |

The 121-build competitive landscape influenced positioning, not code — see
[COMPETITION.md](./COMPETITION.md).

---

## Up to 5 API feature requests (optional, high-signal)

1. **`eventTypeOf(event)` in the SDK.** `CLICK_EVENT = 0` and protobuf omits zero-value fields,
   so a single tap arrives with no `eventType` at all. Any resolver written as
   `event.sysEvent?.eventType ?? CLICK` fires CLICK on every scroll and lifecycle event. We wrote
   `bridge.ts::eventTypeOf` to resolve the default *inside* the envelope check and documented the
   trap; a helper in the SDK would prevent the whole class of bug.
2. **A stable app origin, and say what it means for CORS.** The whitelist is not a CORS bypass:
   the packaged plugin's origin is `null`, so the backend must return
   `Access-Control-Allow-Origin: null` — which no normal server does by default, and which some
   security scanners flag. Either give the WebView a stable origin, or document the expected
   server configuration.
3. **`evenhub inspect <file.ehpk>`.** `.ehpk` is a binary container with no unpack command, so
   there is no way to verify what was packaged — we could only compare file timestamps to know
   whether a build was stale. A list-contents command would make releases checkable.
4. **Icon linting before upload.** The portal requires every *visible* pixel to be opaque
   `#F4F4F4` on a 2×2 raster grid; the first `evenhub create` was rejected with
   `icon pixel (0, 0) is #000000`. A `evenhub icon check` (or the same validation in `pack`) would
   turn that round trip into an error at build time.
5. **A pre-launch or prefetch hook.** A brief is only useful if it is ready the moment the user
   looks up, but the app cannot run in the background, so the card must be fetched on open. A
   "prepare this app" callback (or a documented warm-start) would let the first glance be instant
   instead of a spinner.

---

## Before you press submit

- [x] Repository is public and the README explains setup
- [x] `.ehpk` built, uploaded, promoted to private beta (`evenhub ls` → `com.prelude.brief 0.1.0 Private`)
- [x] Deployment live: <https://prelude-green.vercel.app> — `/actions` renders, retries return one receipt
- [x] 271 tests, typecheck clean, gate pass
- [ ] **Demo video recorded** — the one thing that cannot be generated: follow [DEMO.md](./DEMO.md)
- [ ] Short description pasted from above
- [ ] Track selected: **04 · AI Assistants & Work**
