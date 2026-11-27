# DECISIONS — the log you can revisit

Every non-obvious choice, why it was made, what it costs, and **what would make us change our mind**.
This file exists so a future reader (or a future us) can audit the reasoning instead of guessing.

Format: **D-nn · title** — decision · why · cost · revisit-if.

Status: 23 decisions; D-22 is superseded by D-23.

---

## Product

### D-01 · Build for Track 04, not Track 01
**Decision.** Enter AI Assistants & Work.
**Why.** ~30 builds in Messaging & News, ~18 in Crypto, ~4 in Exchanges, **~6 in Track 04**. The organizers
also name our exact moment in the track description: *"Get a short brief before your next meeting."*
**Cost.** We give up the "Best Telegram integration" special prize ($1,000).
**Revisit if.** Track 04 fills past ~15 builds before submission.

### D-02 · Meeting brief, not a general assistant
**Decision.** The product is one card before one meeting, not a chat assistant.
**Why.** 576×288 at ~42 chars/line forces one decision per screen. A general assistant needs multi-turn
state the display cannot show.
**Cost.** We cannot answer arbitrary questions on the lens.
**Revisit if.** The memory screen proves people want recall more than briefs.

### D-03 · Commitment awareness over summarisation
**Decision.** The brief leads with *what you owe*, not *what was said*.
**Why.** `"Pricing v3 · 3h ago"` is a summary. `"OPEN: Enterprise pricing promised"` is a decision input.
Every competitor summarises; nobody surfaces obligations.
**Cost.** The detector is heuristic and will miss some promises.
**Revisit if.** False positives exceed ~20% on real threads.

### D-04 · Send, don't draft
**Decision.** A tap performs the real write.
**Why.** The closest competitor (Glance Brief) saves a Gmail **draft and never sends**. That is a
self-inflicted wound on the 25% read&write criterion.
**Cost.** A mis-tap sends a real message. Mitigated by: presets only (no free text on the lens),
a confirmation state for voice, and idempotency keys.
**Revisit if.** We add free-text composition — then a preview step becomes mandatory.

### D-05 · Eight screens, one navigation model
**Decision.** Do not expose eight modules as eight menus. One consistent model: tap selects, swipe moves,
double-tap goes back.
**Why.** Extra navigation on glasses is a cost with no benefit. The gesture vocabulary must be identical
on every screen so the user never has to think.
**Cost.** Some screens are reachable only through the actions list.
**Revisit if.** A screen needs a different gesture to be usable.

---

## Platform

### D-06 · Never depend on long press
**Decision.** Voice is reachable from the contextual menu, not only from a hold.
**Why.** Measured finding **H19** (`maticsh/matic-even`): users can bind a temple's long press to Even AI,
so an app cannot count on receiving it.
**Cost.** One extra menu item.
**Revisit if.** Even Realities makes long press non-bindable.

### D-07 · Gate swipes at 700 ms
**Decision.** Act on the first scroll event, ignore the rest for 700 ms.
**Why.** **H12**: one long swipe can arrive as several scroll events, flipping several screens.
**Cost.** A deliberate fast double-swipe is read as one.
**Revisit if.** We measure the real event spacing per swipe.

### D-08 · Gate taps at 350 ms
**Decision.** Ignore a second tap inside 350 ms.
**Why.** **H11**: quick repeated taps are read as a double tap, and on the root page a double tap opens
the exit dialog. A user tapping twice quickly would exit the app.
**Cost.** Genuine rapid tapping is slower.
**Revisit if.** We move the primary action off the root page.

### D-09 · All three bands at brightness 4
**Decision.** Do not use `textColor` for hierarchy.
**Why.** **H2**: all five levels render but look too alike to rank text.
**Cost.** Hierarchy comes only from position and spacing.
**Revisit if.** A firmware update widens the perceived range.

### D-10 · Never rebuild the page
**Decision.** Build the startup page with its text already in it; every later change is
`textContainerUpgrade`.
**Why.** **H20**: a rebuild cannot animate, and a page rebuilt empty then filled shows a second jump.
Also measured: a rebuild is ~165 ms flat, while 3 upgrades are ~249 ms — but a rebuild loses scroll
position and flickers, which matters more than 84 ms.
**Cost.** We cannot change the layout at runtime. We do not need to.
**Revisit if.** A screen needs a genuinely different container arrangement.

### D-11 · Checkpoint on every foreground event
**Decision.** `FOREGROUND_ENTER` and `FOREGROUND_EXIT` both save state; neither pauses.
**Why.** **H7**: OS overlays (contextual menu, exit dialog) fire these events. Mapping EXIT to pause
would pause the app when the menu closes, just as the user returns.
**Cost.** A `localStorage` write per overlay open/close.
**Revisit if.** Writes prove expensive on device.

### D-12 · Resolve `CLICK_EVENT` inside the envelope
**Decision.** `eventTypeOf(env)` returns `null` for a missing envelope and `CLICK` only for a present one
with no type.
**Why.** `CLICK_EVENT` is `0` and protobuf omits zero-value fields, so a tap arrives with no `eventType`.
Writing `event.sysEvent?.eventType ?? CLICK` reads CLICK on every event with no `sysEvent` — every scroll,
lifecycle event and audio frame fires the tap handler.
**Cost.** One extra function.
**Revisit if.** Never. This is a correctness invariant.

---

## Architecture

### D-13 · `src/core/` imports nothing
**Decision.** No SDK, no DOM, no fetch in the core.
**Why.** It makes the layout engine and the state machine testable in plain Node — 275 tests in a few seconds.
It also makes the display budget provable rather than hoped for.
**Cost.** The Even layer must translate between SDK types and core types.
**Revisit if.** Never.

### D-14 · One codebase, two build targets
**Decision.** Next.js serves the dashboard and API; `NEXT_PLUGIN=1` exports a static plugin bundle.
**Why.** Competitors have a plugin *or* a backend. The switch is `pageExtensions`, so in plugin mode every
`route.ts` is ignored and a static export is possible from the same tree.
**Cost.** Two build commands, and the plugin build must not import server-only code.
**Revisit if.** The plugin needs a dependency that breaks static export.

### D-15 · The two targets must not share a build directory
**Decision.** The plugin build writes `dist/`; the app build writes `.next/`. The gate runs the plugin
build **first**.
**Why.** This was a real bug. Running the plugin build after the app build left `.next/` holding a static
export, and `next start` served a site with **no API routes** — every endpoint returned 404. The fix is
two directories plus an ordering rule in the gate.
**Cost.** The gate takes ~30 s longer than a single build.
**Revisit if.** Next.js gains a way to emit two targets from one build.

### D-16 · Deterministic safety rules, model-agnostic
**Decision.** `action-lifecycle.ts` knows nothing about LLMs. A model may *propose*; only the state machine
authorises and executes.
**Why.** The spec's rule: *"Never let model selection change the safety rules."*
**Cost.** Every new action kind needs a validation rule.
**Revisit if.** Never.

### D-17 · Ambiguity is a state, not an error
**Decision.** An ambiguous provider failure goes to `reconciling`, never back to `executing`.
**Why.** If the provider may have acted but the response was lost, a blind retry sends a duplicate message.
**Cost.** A reconciling action needs a human or a poll to resolve.
**Revisit if.** Every provider gains a true idempotency key (Slack already has one).

### D-18 · Receipts come from the provider, never from the model
**Decision.** `buildReceipt()` reads the action record's text and the provider's reference.
**Why.** A receipt built from an LLM's proposal could disagree with what was actually sent. That is the
one thing a judge can verify.
**Cost.** None.
**Revisit if.** Never.

### D-19 · Voice has a mandatory REVIEW state
**Decision.** `transcribing → confirmed` is not a legal transition.
**Why.** A misheard transcript must never send a message. The user sees the parsed action and taps.
**Cost.** One extra tap for voice.
**Revisit if.** Never.

### D-20 · Demo mode is a first-class path
**Decision.** No token → fixtures, and the UI says `demo`.
**Why.** Borrowed from `lightnoteaiiii`'s rule: *an explicit choice never silently changes provider.*
The demo never depends on a secret, and the README says which parts are live.
**Cost.** Two code paths per adapter.
**Revisit if.** Never.

### D-21 · Deterministic recall, not embeddings
**Decision.** `memory.ts` scores by weighted term overlap plus a recency bonus.
**Why.** It is reproducible and testable. An embedding score cannot be asserted in a unit test without
pinning a model version, and a model change would silently change the answer.
**Cost.** No semantic matching — "pricing" will not find "cost structure".
**Revisit if.** Users ask questions the term overlap cannot answer. Then pgvector, with the deterministic
scorer kept as the fallback.

### D-23 · Postgres action store, in-memory fallback
**Decision.** `src/lib/action-store.ts` selects the store: Neon Postgres when `DATABASE_URL` is set,
the in-memory `Map` otherwise. Both sit behind the `ActionStore` interface.
**Why.** The receipt is only an audit trail if it survives the process. A `Map` loses every record on
restart, so the history page could never prove what actually happened.
**Cost.** The deployment now depends on `DATABASE_URL`; without it history is lost on restart, and the
store reports `durable: false` rather than hiding it. The schema is one `CREATE TABLE IF NOT EXISTS`,
created on first use.
**Revisit if.** The store needs more than one table, a migration framework, or more than one writer.

---

## Open questions

| # | Question | How to resolve |
|---|---|---|
| Q-01 | Does a plugin survive a 30-minute phone lock? | Beta build + lock test (H15 saw 18 min on iPhone) |
| Q-02 | What is the real event spacing per swipe? | Instrument the simulator automation API |
| Q-03 | Do image updates wipe text upgraded earlier? | Probe P13 in `matic-even` |
| Q-04 | Is `@evenrealities/pretext` usable for exact text metrics? | Replace `CHAR_ADVANCE_PX = 8.6` if so |
| Q-05 | Does the firmware emit an end-of-scroll event? | H21 says nobody has seen one |
| Q-06 | What is the false-positive rate of commitment detection? | Run it over 50 real threads |
| Q-07 | Does the contextual menu render identically on every firmware? | Test on hardware; the simulator cannot confirm system slots |

---

## Superseded decisions

When a decision is reversed, it moves here with the date and the reason, so the history stays readable.

### D-22 · In-memory action store, not a database — SUPERSEDED 2026-11-26 by D-23

Original decision: `src/lib/execute.ts` kept actions in a `Map`.
Why it was reversed: the store had to survive a restart, so the receipt and the `/actions` history
could be an audit trail rather than a per-process cache.
What replaced it: `src/lib/action-store.ts` — Neon Postgres when `DATABASE_URL` is set, with the
in-memory `Map` kept as the zero-setup fallback.

### Format for a superseded entry

```
### D-nn · title — SUPERSEDED 2026-12-01 by D-mm
Original decision: …
Why it was reversed: …
What replaced it: …
```

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
- [research.md](../notes/research.md) — the deep research
