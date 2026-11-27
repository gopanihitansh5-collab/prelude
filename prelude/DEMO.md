# DEMO — the 3-minute script

The rubric weights: **Usefulness 30% · Read&write 25% · Technical 20% · UX 15% · Business 10%**.
The script spends its time in that order.

**The most impressive moment must be the receipt.** A judge should be able to see the action in the
external service and verify the exact same content appears on the glasses.

---

## Before you record

```bash
npm install
npm run dev            # http://localhost:5173
```

Open two windows side by side:

1. `http://localhost:5173/lens` — the 576×288 lens
2. The Notion page (or Slack channel) you will write to

If you have no token, the app runs in demo mode and the header says `demo`. **Say so on camera.** An
honest demo is stronger than a claim a judge can disprove.

Set the browser zoom so the lens is exactly 576×288 on screen.

### Pre-flight checklist

- [ ] `npm run gate` passes (typecheck, 263 tests, manifest, both builds)
- [ ] `/api/health` returns `{"ok":true,"mode":"demo"}` or `"live"`
- [ ] The lens renders the brief, not `loading…`
- [ ] The external service is logged in and visible
- [ ] Screen recording at 1080p or higher, no browser chrome in the lens crop

---

## 0:00–0:30 — The moment

> "It's 09:51. I have a meeting in nine minutes. To be ready I need four things: who I'm meeting, what
> they last said, what doc we last touched, and what's on the agenda. And then I need to *do* something."

Show the phone: unlock → calendar → thread → doc → type a reply. **Do not rush this.** The cost is the
point.

> "That's five context switches for a nine-minute warning."

## 0:30–1:00 — The brief

Put on the glasses (or show the lens).

```
PRELUDE · 9m
Ada Lovelace · CTO
Pricing v3 — final call

OPEN: Enterprise pricing promised

doc Pricing v3 · 3h ago · 3 items · 35m
```

> "One glance. Who, what, and — the part that matters — **what I owe**. Not a summary. A commitment."

Point at `OPEN: Enterprise pricing promised`.

> "That came from a message where I said *'I'll send the revised pricing by Wednesday.'* The app found
> the promise, not just the sentence."

## 1:00–1:30 — Memory

Swipe to memory (or use the contextual menu).

> "Have we discussed the enterprise pricing before?"

```
YES · 2 matches
Last: Nov 22
Ada Lovelace · Pricing v3
Enterprise discount 15%
```

> "Two discussions, the most recent on the 22nd, and the decision was a 15% discount. With the source
> and the timestamp, so I can check it."

## 1:30–2:00 — The action

Tap → actions.

```
> Reply: running 5 late
  Add prep note
  Open agenda (3)
```

Tap the reply.

> "One tap. No dictation, no keyboard."

## 2:00–2:30 — The write

Switch to the Notion page / Slack channel. **Show the message arriving.**

> "That's the real write. The server holds the token — the glasses never see it."

## 2:30–3:00 — The receipt

Back to the lens.

```
SENT · 12:04
via slack

running 5 late
```

> "And the receipt carries **the exact string the server delivered**. Not what the model proposed —
> what actually left the building. That's the difference between a demo and a product."

**Hold on this frame.** It is the moment the 25% criterion is won.

---

## If you have 30 more seconds

Show the follow-up radar:

```
3 OPEN COMMITMENTS
OVERDUE: Enterprise pricing
  pricing
OPEN: Architecture doc
  architecture
```

> "The same detector runs across every meeting, so the app is useful between meetings too — not just
> nine minutes before one."

---

## What to say if asked

| Question | Answer |
|---|---|
| "Is this real or mocked?" | "The write is real. With no token it runs in demo mode and the header says `demo` — I never hide which mode it's in." |
| "Why not Telegram?" | "Thirty builds in that track. Six in this one, and the organizers named this exact moment." |
| "What if the network fails mid-send?" | "The action goes to `reconciling`, not back to `executing`. A blind retry would send a duplicate message." |
| "How do you know the tap did something?" | "The receipt is built from the provider's response, not from the model's proposal. The delivered string is the record's text." |
| "What about long press?" | "We don't depend on it. Users can bind it to Even AI, so voice is also in the contextual menu." |
| "Does it work with the phone locked?" | "That's the beta-build test. Local sideload is not representative — we test the shipped build." |
| "How many tests?" | "263, in a few seconds, with no SDK, no browser and no network." |
| "What's not built?" | "Google Calendar read and auth. Notion read is wired when a token is set; with none the read path is fixtures. Action history is Neon Postgres when `DATABASE_URL` is set, in-memory otherwise. It's in the README." |

---

## Recording checklist

- [ ] Lens at exactly 576×288, no browser chrome visible
- [ ] The external service visible in the same frame as the receipt
- [ ] Say the mode out loud (`demo` or `live`)
- [ ] Hold the receipt frame for at least 3 seconds
- [ ] Under 3:00
- [ ] No cuts inside the write → receipt sequence; it must read as one continuous action
- [ ] Upload to a public URL (Vimeo / YouTube unlisted) and put the link in the submission

---

## The 60-second version

If the submission form only allows a short clip:

| Time | Beat |
|---|---|
| 0:00–0:10 | The brief on the lens, `OPEN: Enterprise pricing promised` |
| 0:10–0:25 | Tap → actions → tap reply |
| 0:25–0:40 | The message arriving in Slack/Notion |
| 0:40–0:55 | The receipt: `SENT · 12:04 · running 5 late` |
| 0:55–1:00 | "The receipt carries the exact string the server delivered." |

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
