# SKILLS — the tooling used to build this

What was installed, what it does, and which parts actually shaped the code.

---

## Installed

### `alirezarezvani/claude-skills` — 434 skills

```bash
npx skills add alirezarezvani/claude-skills
```

Installed into `.agents/skills/` (universal format: Antigravity, Cline, Codex, Cursor, Gemini CLI +16
more), symlinked for Claude Code. Lockfile: `skills-lock.json`.

The domains that matter for this project:

| Domain | Skills | Used for |
|---|---|---|
| Engineering — Core | 54 | Architecture, code review, TDD, frontend, backend, QA |
| Engineering — POWERFUL | 110 | Agent design, CI/CD, security audit, `human-gate`, `commit-craft`, `i18n-localization` |
| Product | 19 | Discovery, PRDs, UX research, `design-qa` |
| Productivity | 13 | `meetings` (cost gate + agenda + action items), `handoff`, `weekly-review` |

**Which ones actually shaped the code:**

- **`human-gate`** — the idea that a plan is not shippable until a named person has reviewed it and no
  blocker is open. This is why `DECISIONS.md` records *revisit-if* conditions rather than just choices.
- **`commit-craft`** — split a tangled working tree into a reviewable series; block staged secrets. This
  is why the token rule is stated in three separate files rather than once.
- **`i18n-localization`** — check translation files against CLDR plural rules. Relevant because the
  firmware font has no Hindi (finding H23), so any non-Latin text must be sent as an image.
- **`design-qa`** — UI finish QA. This is why the lens mirror is exactly 576×288 rather than "about right".
- **`meetings`** — cost gate + agenda + action items. The product is literally a meeting tool, so the
  skill's framing of "what does this meeting need to be worth attending" shaped the brief's fields.

### `ChristopherKahler/paul` — the PLAN → APPLY → UNIFY loop

```bash
npx paul-framework
```

Three principles, all adopted:

1. **Loop integrity** — every plan closes with UNIFY. No orphan plans. This is why `CHECKLIST.md` exists
   and is kept current rather than written once.
2. **In-session context over subagent sprawl** — subagents are for discovery and research, not
   implementation. This is why the research was delegated but the code was not.
3. **Acceptance-driven development** — define done before starting. Every task in `PLAN.md` has a
   verification, and every invariant in `ARCHITECTURE.md` names the test that pins it.

---

## Research sources that changed the code

| Source | What it gave us |
|---|---|
| `hub.evenrealities.com/docs` | The platform contract: 576×288, container limits, event types, manifest rules, QA rubric |
| `even-realities/evenhub-templates` | The canonical event-handling pattern (`eventTypeOf`) |
| **`maticsh/matic-even`** | **23 measured findings on real hardware.** Three were real bugs in our code — see `COMPARISON.md` |
| `nickustinov/even-g2-notes` | Measured call costs (83/104/165 ms), event quirks, UI patterns |
| `fabioglimb/even-toolkit` | 55+ components, 191 pixel icons, per-screen architecture |
| `lightnoteaiiii` (local) | Provider discipline, usage metering, input guards, secret redaction |

---

## The working method

```
RESEARCH  →  research.md          (what the platform actually does)
PLAN      →  PLAN.md              (what we build and why)
DECIDE    →  DECISIONS.md         (every non-obvious choice + revisit-if)
BUILD     →  src/                 (core first, then even, then api)
VERIFY    →  tests + gate         (263 tests, typecheck, both builds)
DOCUMENT  →  README, ARCHITECTURE, DEMO, COMPARISON, CHECKLIST
```

The rule that made this work: **research before code, and write down what would change your mind.**
Three of our bugs were found in someone else's field notes, not in our own tests — because we looked
before we built.

---

## What we would install next

| Tool | Why |
|---|---|
| `@maticsh/testing` | A fake glasses bridge, so the controller can be tested end to end without a simulator |
| `@maticsh/glasses` | Real font metrics via `@evenrealities/pretext`, replacing our `CHAR_ADVANCE_PX` estimate |
| `even-toolkit` | 191 pixel-art icons for the store listing and any future image screens |
| `@evenrealities/evenhub-simulator` | Already available; the automation API would let the gate drive real input in CI |

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
