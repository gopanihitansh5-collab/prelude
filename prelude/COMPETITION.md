# COMPETITION

**Verdict:** Prelude picked the right track but the wrong headline. Track 04 · AI Assistants & Work is no
longer the empty room our earlier survey described — it holds roughly 14–17 builds plus 3 private ones, and
six or more of them (FUSE Brief, TriageG2, G2 Meeting Brief, Next Up, Glance Brief, Nod, plus Cue on the
Messaging listing) sell the same sentence we do: *a short brief before your next meeting*. "Pre-meeting
brief" is therefore a crowded claim and must not lead our submission. The write path is crowded too, but in
a specific way: nearly every serious Track 04 entry writes something (Gmail draft or send, Notion task,
Calendar move), and several already have confirmation gates, undo windows and — in one case — idempotency
keys. What is genuinely thin is **evidence that the write happened**: a durable, addressable record carrying
the provider's reference, plus a modelled answer for "the provider may have acted but we lost the response".
Prelude's defensible position is narrow and real — *brief → one tap → a receipt you can look up tomorrow* —
and it is undercut by a genuinely weaker read side than FUSE Brief. Judges will see the brief; they should
remember the receipt.

## The field

Method: the DoraHacks build list is not machine-readable — `https://dorahacks.io/hackathon/...` returns
**HTTP 405 "Human Verification"** to `web_fetch`, and there is no public builds API (confirmed 404 earlier).
Track-04 entries below are therefore **"reported on the DoraHacks build list, not independently verified"**
unless a public repo was found and its README read. To corroborate the shape of the field independently I
scanned **400 GitHub repos** matching Even G2 / EvenHub queries, isolated the **109** that were created or
described inside the hackathon window (Nov 15–29, 2026), and read the READMEs of the 12 most relevant.

### Track 04 · AI Assistants & Work — the direct competition

| Build | Verified? | One-line claim |
|---|---|---|
| **FUSE Brief** (hacker215a393) | reported, not verified — no public repo found | Reads Google Calendar (ICS), Gmail (mbox) and Notion **on the device**; named deterministic rules pick what matters; a whitelisted LLM compresses to 42 columns, and when it fails the deterministic text still renders. Also takes spoken commands: reply to email, add task, **move a meeting**. |
| **TriageG2** (z121245017) | ✅ repo `LoganZ2/triage-g2` | Calendar/Gmail/Notion + AI executive HUD; pre-meeting 3-bullet briefs, **safe Gmail drafts**, Voice-to-Notion, Default-NO gate, 1-tap Undo. Claims 9/9 Vitest. |
| **G2 Meeting Brief** (nazarinojatulaev) | ✅ repo `Nazarbek01/g2-meeting-brief` | Next meeting + 3-line AI brief; Google Calendar + OpenAI backend, README is thin on write path. |
| **Next Up** (blockchaincali) | reported, not verified | "Know who you're meeting before you walk in. Send the follow-up before you reach the car." |
| **Glance Brief** (hacker19939bb) | ⚠️ **contradicted** — see note | Listing says: next meeting + unread inbox, reply with one tap, **saved as a Gmail draft, never sent**. |
| **Nod** (shotaro.takakura) | ✅ repo `Class-now/nod-g2` | Claude triages Gmail; 3-line brief + 3 ready replies; **default is a Gmail draft**, sending needs a second explicit choice. |
| **Kept** (mochii) | reported, not verified | Say a promise out loud; filed to Notion with person, direction and due date. No deadline/overdue state claimed. |
| **Aside** (eliezercombi) | ✅ repo `eliezercombi/aside` | Notion tasks at a glance, done with a tap, captured by voice as a draft you confirm; dates resolved by rules, not the model. |
| **Cue** (Yash Kashyap) | ✅ repo `yashh1323/cue-even-g2` | Chief-of-staff HUD: Notion + Calendar sync, two-way Telegram, Gray8 bitmaps; writes go through a server-side `CommitQueue` with **3-second undo, idempotency keys and Telegram audit receipts**. |
| **Questling** (pili_lilian) | reported, not verified | "Who needs you and what's next; acts in Calendar, Gmail, Slack and Telegram with one tap." |
| **Oh, Right!** (Kai) | reported, not verified | Voice-first assistant: reminders, meeting prep, Telegram replies you approve. |
| **GlanceBrief** (ckk518314) | reported, not verified | "Your day, at a glance." |
| **JoatGlass** | reported, not verified | Phone-first assistant/terminal. |
| **Chengzhang** | reported, not verified | Article drafting. |
| **FixGuide AI** | reported, not verified | Hands-free phone-repair assistant. |
| **Chairside** | reported, not verified | Book clients from Telegram DMs. |
| **(3) Private Builds** | unreadable by design | — |

> ⚠️ **Correction to `COMPARISON.md` / `README.md`.** Those docs say Glance Brief "saves a Gmail draft,
> never sends" and call that a self-inflicted wound. The listing does say that, but the public repo
> `qinheyi/glance-brief` with the same product name and the same demo data model **does send**: the draft
> screen's `SEND` is described as "the only write path", gestures are ignored while a send is in flight,
> and the backend refuses `/api/send` unless the request carries `confirmed: true` (16 unit tests). Either
> there are two builds sharing the name or the listing is stale. **Do not repeat the "they never send"
> line in the submission** — it is checkable and it is wrong. Correcting it costs us one talking point and
> buys us credibility on every other one.

**Counted from the listing** (the lead's capture, reported not independently verified):

| Track | Builds | Shape |
|---|---|---|
| 01 Messaging & News | **~55+** | ~20 Telegram triage/reply variants; the special-prize magnet |
| 02 Crypto & DeFi | **~30** | Hyperliquid/Polymarket HUDs with one-tap paper orders |
| 03 Exchanges & Stocks | **~8** | Multi-exchange spreads, PnL, liq guards |
| 04 AI Assistants & Work | **~14–17 + 3 private** | briefs, inbox triage, Notion task glance, email drafts |
| Total | **121** | 10 winners, $10k, up to 10 pairs of G2 |

My independent GitHub sample agrees on shape: of 109 hackathon-window repos, messaging- and crypto-shaped
descriptions dominate by a wide margin; work-shaped repos are a minority and several of them are Task-04-listed
under another track. Representative verified Track 01/02 rows: `Alfonova-Node/tg-glance`, `samizdatproject/tapback`,
`zahar-io/nod-g2`, `Bolajiev/relay-g2` ("reply debt, cleared"), `LoganZ2/evenpulse-g2`, `k58v2hbzkk-del/witness`,
`deniart865/oddsglance-g2`, `swiftbotlabs/liq-guard`, `teylerboal-dev/evenpulse-g2`.

## The crowded claims

A judge scrolling 121 builds will have seen all of these before reaching ours:

1. **The pre-meeting brief.** At least six builds lead with it (FUSE Brief, TriageG2, G2 Meeting Brief, Next Up,
   Glance Brief, Nod), plus Cue on the Messaging listing. FUSE Brief is the strongest: it reads three sources,
   renders deterministically when the model fails, and compares favourably to us on coverage alone.
2. **"Inbox cleared in 30 seconds."** The organizers' own phrase, and half of Track 04 uses it: Nod, Glance Brief,
   Glance (Hajrajadoon), Inbox 30, TriageG2.
3. **AI drafts, one tap, confirmation gate.** Gmail-draft-first is the modal safety posture: Nod (draft default,
   second choice to send), Glance Brief (`confirmed: true` on the server), TriageG2 (safe drafts), Brief
   (two presses, `Sent` only after the server confirms).
4. **Undo.** Cue ships a 3-second `CommitQueue` undo; TriageG2 ships 1-tap Undo; Cue and TriageG2 both pair it
   with a Default-NO gate. **Prelude has no undo window** — this is now table stakes, not cleverness.
5. **Notion task at a glance.** Aside, GlanceNotes (`jinan86/even-realities-glancenotes`), GlanceQueue
   (`448934312-eng`), Questling, Kept.
6. **Deterministic fallback when the model fails.** FUSE Brief does it for the brief; Glance Brief does it for
   drafts ("built-in rules write the draft if the AI is down"). Our "rules propose, model only suggests" story is
   good engineering but **not novel in this field**.
7. **Test cards.** TriageG2 advertises 9/9 Vitest; Glance Brief 16 unit tests. A larger test count is not a
   differentiator on its own.
8. **The OEM already ships this.** Even Realities' own Conversate 2.0 includes **Prep Notes** — upload a doc or
   brief before a session and the G2 surfaces relevant keywords, fact-checks and suggested responses live.
   Our real competitor for the *idea* is the firmware, and the judges know it.

## Where Prelude is different

Three claims only. Each is backed by code in this tree and mapped to one judging criterion.

### 1. Ambiguity is a state, not a retry — *Technical execution (20%) + Business & safety (10%)*

If a provider may have acted but the response was lost, the action goes to `reconciling` and **cannot** return
to `executing`. No competitor I verified models this: Cue's 3-second undo and TriageG2's undo are *pre-commit*
cancellations, and Glance Brief's in-flight gesture guard stops a double tap inside one request — neither
answers "the request left and we do not know if it landed".

- `src/core/action-lifecycle.ts:55` — `executing` may only reach `provider_confirmed`, `reconciling` or `failed`.
- `src/core/action-lifecycle.ts:191` — the comment and the transition into `reconciling`.
- `src/lib/execute.ts:93` — an action stuck in `reconciling` is reconciled, never retried.
- `DECISIONS.md` D-17 states the reasoning and the revisit condition.

This is the rarest claim we have, and it is provable in a unit test rather than in a screenshot.

### 2. The receipt is a durable, addressable record — not a screen state — *Read & write (25%)*

The lens shows the **server's** delivered string plus the provider's reference; the record is a row, reachable
by id, listed on a history page, and a repeat POST returns the *same* `actionId` and `providerReference` instead
of sending twice (verified live against Neon, `CHECKLIST.md` §K).

- `src/lib/action-store.ts` — Neon Postgres store with an in-memory fallback; reports `durable: false` rather
  than hiding a lost trail.
- `app/api/actions/[id]/route.ts` + `app/actions/page.tsx` — the receipt and the audit page, not just a toast.
- `src/lib/execute.ts:83-84` — the idempotency key is computed and looked up before any provider call.
- `src/core/action-lifecycle.ts:83` — `idempotencyKey()`.

Concede the ground honestly: **Cue claims idempotency keys and audit receipts, Brief shows `Sent` only after the
server confirms, Glance Brief enforces `confirmed: true` server-side.** The difference is durability and
addressability — a row you can fetch by id tomorrow, holding the delivered text and the provider's own
reference — and that is a grading difference on "works end to end", not a category difference.

### 3. The brief leads with what you owe, including overdue — *Usefulness on G2 (30%)*

Every Track 04 build summarises. Kept captures promises but claims no deadline state; Kith (`Rampop01/kith`,
Track 01) does show "2d overdue" promises — for Telegram people, not for the meeting in front of you. Prelude
puts `OPEN: …` / overdue on the pre-meeting card and runs the same detector across every meeting as a
follow-up radar, so the app is useful between meetings too.

- `src/core/commitments.ts` — `CommitmentStatus = 'open' | 'overdue' | 'done'`, `detectCommitments()`,
  `topCommitment()`, `commitmentLine()`.
- `app/api/followups/route.ts` + `app/followups/page.tsx` — the radar.
- `src/core/brief.ts` — the commitment is a first-class field of `Brief`, not a summary line.

## Where Prelude is weak

Straight from our own `CHECKLIST.md` §L and the field evidence above:

- **FUSE Brief out-covers us on the read side, and judges will notice.** It reads Google Calendar (ICS), Gmail
  and Notion; Glance Brief has Gmail/Calendar/Telegram adapters; Brief and TriageG2 both read Gmail + Calendar.
  **Prelude reads Notion only — no Google Calendar adapter** (`CHECKLIST.md` §L). "Who am I meeting" from a
  Notion database is a weaker story than from a calendar.
- **We also write less breadth.** FUSE Brief claims "reply to an email, add a task, move a meeting"; Cue writes
  Telegram, Notion and Calendar. We write email (Resend) and Notion notes. Our depth is on one path, not breadth.
- **No undo.** Cue (3 s) and TriageG2 (1-tap) have it. We mitigate with preset-only replies and a confirmation
  state instead — a mitigation, not a feature.
- **No auth; `auth: open`.** Single-user demo. A shared key exists (`requireActKey`) but is not enforced.
- **No real user testing.** Commitment detection is heuristic and its false-positive rate is unmeasured (Q-06).
- **No hardware validation.** Private-build install not run, 5-minute lock test not run; `CHAR_ADVANCE_PX = 8.6`
  is an estimate, not measured font metrics.
- **Production is one redeploy behind.** Until the owner redeploys, `/actions` and a repeated `POST /api/act`
  return 500 on the live URL (`CHECKLIST.md` §K/§L). A judge who clicks will find that first. Redeploy before
  submission — this is the single cheapest point we can recover.
- **Not in the Best Telegram integration special prize.** Deliberate (D-01), but it is a prize we cannot win.
- **The test count is not the argument.** 271 tests beat the visible field, but the field mostly does not compete
  on tests, and judges weight working behaviour at 20%, not test volume.

## The three-sentence pitch

Prelude is the brief before your next meeting on Even G2: who you are meeting, the last thread, the doc, and the
commitment you owe — one card, three text bands, one glance. One tap acts — reply, prep note, agenda, join — and
the lens shows a receipt carrying the exact string the server delivered and the provider's reference, persisted
as a record you can look up later, with an idempotent retry that never sends twice and a `reconciling` state for
the case where the provider might have acted and the response was lost. Voice must pass through a REVIEW step
that the state machine forbids skipping, because a misheard transcript must never send a message.

## Sources

Event and listing (DoraHacks blocked to automated fetch — HTTP 405 "Human Verification"):
- https://dorahacks.io/hackathon (build list; **not machine-readable**, no public builds API)
- https://competehub.dev/en/competitions/dorahackseven-realities
- https://www.competehub.dev/zh/competitions/dorahackseven-realities
- https://www2.fundsforngos.org/fellowships/submissions-open-for-heads-up-hackathon/
- https://www.eventbrite.com/e/heads-up-even-realities-hackathon-by-tvm-ventures-daos-hub-tickets-2004953173915
- DoraHacks build-list capture supplied by the team (track counts, FUSE Brief/TriageG2/Next Up/Kept/Questling/
  Oh Right!/JoatGlass/Chengzhang/FixGuide/Chairside/GlanceBrief descriptions)

Competitor repositories read in full (README):
- https://github.com/qinheyi/glance-brief (Glance Brief — sends, `confirmed: true`, 16 tests)
- https://github.com/mythos-builds/brief-g2 (Brief — Gmail + Calendar, `Sent` after server confirm)
- https://github.com/Class-now/nod-g2 (Nod — draft default, explicit send)
- https://github.com/Hajrajadoon/glance-g2 (Glance — Gmail triage, send path)
- https://github.com/Nazarbek01/g2-meeting-brief (G2 Meeting Brief)
- https://github.com/eliezercombi/aside (Aside — Notion tasks)
- https://github.com/Rampop01/kith (Kith — overdue promises, Track 01)
- https://github.com/yashh1323/cue-even-g2 (Cue — CommitQueue, 3 s undo, idempotency keys, audit receipts)
- https://github.com/LoganZ2/triage-g2 (TriageG2 — read-and-write Telegram, 9/9 Vitest)
- https://github.com/jinan86/even-realities-glancenotes (GlanceNotes)
- https://github.com/448934312-eng/glancequeue-even-g2 (GlanceQueue)
- https://github.com/Bolajiev/relay-g2 (Relay — "reply debt, cleared", `Sent. 4 left.`)

GitHub sample (400 repos scanned via the public search API; 109 in the hackathon window):
- https://api.github.com/search/repositories?q=%22even+g2%22 (pages 1–4, sorted by update)
- https://github.com/even-realities/everything-evenhub · https://github.com/pangoleen/awesome-even-realities-g2

Prior art and OEM features (the brief is not a new idea):
- https://www.evenrealities.com/de-CA/blogs/even-insider/context-without-compromise (Conversate 2.0 **Prep Notes**)
- https://www.t3.com/tech/vr/even-realities-conversation-coaching-smart-glasses-update-0326
- https://phandroid.com/2026/03/28/even-realities-promises-big-improvements-with-its-new-update-for-the-g2-smart-glasses/
- https://devpost.com/software/g2-meets (G2 Meets — live context + meeting notes, another event)
- https://www.linkedin.com/posts/kartikshelar_still-thinking-about-the-problem-sohail-gidwani-activity-7518434516768632832-qZ7K
  (Footnote, LA Hacks — G2 meeting companion with prep and follow-up review)

Internal evidence: `README.md`, `DECISIONS.md` (D-01, D-03, D-04, D-16, D-17, D-18, D-23), `CHECKLIST.md` §K/§L,
`COMPARISON.md` (corrected here on Glance Brief), `../research.md`.
