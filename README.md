<div align="center">

<img src="brand/icon.svg" alt="Prelude" width="64" height="64">

# Prelude

**The brief before your next meeting — on Even Realities G2.**

You have a meeting in nine minutes, and you know there is something you were supposed to send.
Prelude puts the whole thing on the lens: who you are meeting, what they last said, the doc, and
**the commitment you owe** — then lets you act with one tap, on a display you do not unlock.

[Live backend](https://prelude-green.vercel.app) ·
[Lens mirror](https://prelude-green.vercel.app/lens) ·
[The argument](prelude/STORY.md) ·
[Submission pack](prelude/SUBMISSION.md) ·
[Competitive position](prelude/COMPETITION.md) ·
[Status](prelude/CHECKLIST.md)

![tests](https://img.shields.io/badge/tests-275%20passing-brightgreen)
![gate](https://img.shields.io/badge/gate-5%2F5%20stages-brightgreen)
![sdk](https://img.shields.io/badge/Even%20Hub%20SDK-0.0.16-black)
![next](https://img.shields.io/badge/Next.js-16.4.6-black)
![license](https://img.shields.io/badge/license-MIT-blue)

`Heads Up · Even Realities × TVM Ventures × Daos Hub` · **Track 04 — AI Assistants & Work**

</div>

![Prelude landing page](prelude/docs/home.png)

## The card

One glance, three text bands on a 576×288 monochrome display — the real `render(state)` output, not a mockup:

```text
┌──────────────────────────────────────────────────────────────┐
│ PRELUDE · 9m                                                 │
│ Ada Lovelace · CTO — Pricing v3 final call                   │
│ OPEN: revised enterprise pricing by Wed · doc Pricing v3     │
│ tap act · swipe next · double exit                           │
└──────────────────────────────────────────────────────────────┘
```

Tap → actions. Swipe → next meeting. Double-tap → exit. The commitment line is the point: every
other app in this field summarises what was **said**; this one leads with what you **owe**.

## Think → act → prove

The write is real, and it is accounted for:

```mermaid
sequenceDiagram
  autonumber
  actor U as Wearer
  participant L as Lens (G2)
  participant B as Backend
  participant P as Provider

  U->>L: tap "reply"
  L->>B: POST /api/act {meetingId, action, confirmed:true}
  B->>B: create record · idempotency key · validate
  B->>B: created → validated → authorized → executing
  B->>P: deliver({text, idempotencyKey})
  P-->>B: provider reference
  B->>B: persist row · status receipt_persisted
  B-->>L: receipt {delivered, providerReference, at}
  L-->>U: SENT · 07:26 — the exact string sent

  Note over B,P: Retry is safe: same key → same receipt, never a second send.<br/>Lost response → `reconciling`, never a blind retry.
```

Everything a judge can check afterwards: [prelude/actions](https://prelude-green.vercel.app/actions) —
a row per action, holding the delivered string and the provider's own reference.

### The state machine (9 states, illegal transitions refused)

```mermaid
stateDiagram-v2
    [*] --> created
    created --> validated
    validated --> awaiting_confirmation
    awaiting_confirmation --> authorized
    authorized --> executing
    executing --> provider_confirmed
    executing --> reconciling
    executing --> failed
    reconciling --> provider_confirmed
    reconciling --> failed
    provider_confirmed --> receipt_persisted
    receipt_persisted --> [*]
    failed --> [*]

    note right of reconciling
        The provider may have acted and the
        response was lost. This state cannot
        return to `executing` — a lost response
        must never become a duplicate message.
    end note
```

## Architecture — four layers, one dependency rule

![Prelude architecture: four layers with a one-way dependency rule](prelude/docs/architecture.svg)

<sub>**Fig. 1** — The arrow that matters: `src/core/` imports nothing from the other three layers. That is why the
pure core is testable in seconds without an SDK, browser or network — and why the safety rules cannot drift with a
model change. Solid edges are allowed dependencies; the dashed edge is the API reaching integrations, which is the
only path a write can take.</sub>

```mermaid
flowchart TD
    subgraph even["1 · Even layer — src/even/"]
        APP["app.ts · controller<br/>one write in flight"]
        CT["containers.ts · 3 text containers"]
        GT["gate.ts · swipe 700ms · tap 350ms"]
        BR["bridge.ts · SDK events"]
    end
    subgraph api["2 · Application API — app/"]
        R["/api/act · /api/briefs<br/>/api/actions · /api/followups"]
    end
    subgraph core["3 · Intelligence engine — src/core/"]
        C1["brief · commitments · memory"]
        C2["actions reducer · lifecycle"]
        C3["layout · panel"]
    end
    subgraph integ["4 · Integrations — src/lib/"]
        I1["Notion (read+write)"]
        I2["Resend · Exa · LLM"]
        I3["Neon Postgres store"]
    end

    APP --> C2
    APP --> C3
    CT --> C3
    BR --> GT
    R --> C2
    R --> I1
    R --> I2
    R --> I3
    I1 --> C1
    C2 -.->|"core imports nothing outward"| C1

    style core stroke-width:3px
```

## Verified, not asserted

```text
$ npm run gate
PASS  typecheck           18.7 s
PASS  test                275 passed (20 files)
PASS  manifest            com.prelude.brief v0.1.1 — 2 permissions
PASS  build (plugin)      dist/  ·  static export
PASS  build (app)         .next/ ·  deployable
GATE PASS

$ curl -s https://prelude-green.vercel.app/api/health
{"ok":true,"mode":"demo","auth":"open","version":"0.1.0"}

$ curl -s -X POST .../api/act -d '{... "text":"production retry proof" ...}'
{"ok":true,"actionId":"act_mwyq8059pzbv53","status":"receipt_persisted",
 "delivered":"production retry proof","channel":"demo","at":"2026-11-27T08:35:38.512Z",
 "providerReference":"demo_idem_d7618be0"}

$ # same request again — byte-identical, no second send
{"ok":true,"actionId":"act_mwyq8059pzbv53","status":"receipt_persisted",
 "delivered":"production retry proof","channel":"demo","at":"2026-11-27T08:35:38.512Z",
 "providerReference":"demo_idem_d7618be0"}
```

The packaged `.ehpk` is verified the same way — loaded over `file://`, the way the Even app loads
it, and checked for requests, console errors and a live API round trip
([`prelude/scripts/plugin-e2e.mjs`](prelude/scripts/plugin-e2e.mjs)).

## Where things live

| Path | What it is |
|---|---|
| **[prelude/](prelude/)** | the application — Next.js backend, Even Hub plugin, pure domain core, 275 tests |
| [prelude/STORY.md](prelude/STORY.md) | value, uniqueness, and **15 challenges with how each was beaten** |
| [prelude/SUBMISSION.md](prelude/SUBMISSION.md) | submission copy, track compliance, five API feature requests |
| [prelude/COMPETITION.md](prelude/COMPETITION.md) | what the other 120 builds do, what is crowded, what is rare |
| [prelude/README.md](prelude/README.md) | setup, module boundaries, verified behaviour |
| [notes/](notes/) | working notes from build week — research, event rules, planning |

## Quickstart

```bash
git clone https://github.com/gopanihitansh5-collab/prelude.git
cd prelude/prelude
npm install
npm run dev            # http://localhost:5173 — dashboard, API, lens mirror
npm test               # 275 tests, no SDK, no browser, no network
npm run gate           # typecheck → tests → manifest → plugin build → app build
```

No secrets required. With none set, the app runs in `demo` mode with fixtures and says so in the
header — the demo never depends on a credential.

## Honest limits

- **Notion is the only wired read path.** Google Calendar and Gmail are designed, not built. The strongest
  competitor in this track reads three sources; that is a real gap, not a footnote.
- **No undo window.** Cancel-before-send is table stakes here (one competitor ships 3 s undo). Prelude
  mitigates with preset replies and a confirmation state, and handles the *after* case instead
  (`reconciling`).
- **Single-user, `auth: open`.** A shared key exists (`requireActKey`) but is not enforced for the demo.
- **No hardware validation.** The simulator and the browser mirror were used; the 5-minute locked-phone
  test on physical G2 has not been run, and `CHAR_ADVANCE_PX = 8.6` is an estimate, not measured metrics.
- **Commitment detection is heuristic** and its false-positive rate is unmeasured.
- **The mirror is not the glasses.** It paints the same `render(state)` strings, but the BLE write path
  itself is only exercised by the SDK.

## Licence

MIT — see [LICENSE](LICENSE).
