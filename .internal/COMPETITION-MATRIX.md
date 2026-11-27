# COMPETITION MATRIX — verified feature table

Extends `COMPETITION.md` (12 READMEs read by the previous analyst). Method this pass: **45 public READMEs
fetched** from `raw.githubusercontent.com/<owner>/<repo>/HEAD/README.md`, located with the **public GitHub
search API** (30 + 15 + 8 = 53 paced queries, ~7 s apart, unauthenticated). Every column below is what the
repo's own README says; unreadable or unstated = `—`. No field is inferred from a build's DoraHacks blurb.
Legend: **GCal** Google Calendar · **ICS** iCal feed · **srv** server-side store · **·L** track taken from the
DoraHacks listing, not the README. "confirm?" = is there an explicit second act before the write.

| repo | build (match) | trk | reads | write path (confirm?) | undo | idem / dedupe | state / ambiguity | commit-ments | tests | backend | honest |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `qinheyi/glance-brief` | **Glance Brief** (name+desc) | 04 | Gmail, GCal, Telegram | Gmail send, TG send (tap=SEND, `confirmed:true` srv) | — (double-tap=discard pre-send) | in-flight gesture guard; no key | pure reducer state machine; no unknown-outcome | "what you owe them" in brief, no dates | 16 | Node srv | demo-mode caveat, adapters unit-tested only |
| `Khazmi-lab/glance-brief` | **Glance Brief** (2nd build; drafts-only matches listing) | 04 | Gmail, GCal | Gmail **draft only** + discard stale drafts (confirm) | — | draft **ledger**, Gmail 404 removes entry | state machine; no ambiguity; failure shown not hidden | — | vitest, no count | Node srv | "not tested against real Google/LLM/STT" |
| `Class-now/nod-g2` | **Nod** | 04 | Gmail, GCal | Gmail draft (default) → send on 2nd explicit choice | — | repeated send returns first result; srv guards | `view/step` pure state machine; failed send not retried | next meeting card | npm test (no count) + eval p/r | Node srv | not on physical hardware |
| `kangmochi/Kept` | **Kept** | 04 | Notion | Notion row create/complete (SAVE THIS? confirm) | 5 s glass + 60 s srv record (trash) | "ALREADY SAVED?" similar-title check, but allows 2nd copy | screen states only; no unknown-outcome | **due dates + overdue** (`2 DUE TODAY 1 LATE`, I owe/owed) | npm test (no count) | Hono srv | "known limits", real glasses not covered |
| `eliezercombi/aside` | **Aside** | 04 | Notion, Telegram | Notion create/update (draft + tap) | — | "working" screen blocks input so no double-save | screen states; no ambiguity | overdue-first list, due dates | **48** | relay srv | explicit "not done" list |
| `z121245017-ai/triage-g2` | **TriageG2** (listed builder) | 04 | GCal, Gmail, Notion | Gmail draft+send, Cal move, Notion (Default-NO gate) | 1-tap on receipt | — (asks API for "idempotent Undo tokens") | before→after diff preview; no unknown-outcome | task due dates in Notion | vitest (no count) | optional Node bridge | zero-key sandbox |
| `LoganZ2/triage-g2` | **TriageG2** (same name, different repo) | 01→04 | Telegram, GCal | TG threaded send, tasks | — | — | `resolveEvenEventType`; **no undo/ambiguity** | — | **9/9** badge | **none — keys in browser memory** | sandbox mode |
| `Nazarbek01/g2-meeting-brief` | **G2 Meeting Brief** | 04 | ICS/GCal | **none — read-only** | n/a | n/a | — | — | — | local Node srv | limitations §, "read-only" |
| `GabrielAvenging/next-brief` | *possible* **Next Up** (unconfirmed) | 04 | GCal, Notion | Cal patch, Notion task, TG "running late" (confirm:true srv) | receipt + companion **audit log** | one write at a time; `confirm:true` enforced | **audit status `Applied/Undone/Not reversible`** — closest to our receipt, no unknown state | next meeting, no promises | npm test | Express srv | demo vs live table |
| `plilian/questling-even-realities` | **Questling** | 04 | GCal, Gmail, Slack, Telegram, GitHub, Todoist | replies, Cal blocks, Todoist (confirm every change) | — | **"checks it arrived"** (delivery verification) | deterministic heads-up engine, quiet hours/cooldown; no ambiguity | **overdue quests**, "who is waiting" | **163** | Node srv | business model, hackathon § |
| `LopeWale/joatGlass` | **JoatGlass** | — | Gmail, iMessage, GCal, Reminders | email/text/reminder mutate behind hardware `ConfirmGate` | — | FIFO dismissal tombstones | — | reminders | test dirs, no count | iPhone app + Mac relay | synthetic demo data |
| `Nowhitestar/Chengzhang-G2` | **Chengzhang** | 04 | speech, web fact-check | article → Notion/phone (tap per note) | **Undo** on each change | — | `reconcile` = drops unsourced sentences | — | **34** | Node srv | STT simulated in tests |
| `emiliotecnologias/fixguide-ai` | **FixGuide AI** | 04 | repair guides | job log / notes on-device (tap) | — | — | screen state machine | — | — | Node srv (Claude proxy) | "says so" when offline; STT 501 |
| `KLe518314/glancebrief` | **GlanceBrief** (ckk518314) | 04 | brief cards (demo data, optional fetch) | **none — read-only** | n/a | n/a | — | — | — | **none, no keys** | "no backend, no API keys" |
| `ovevayrus/chairside` | **Chairside** | 04·L | Telegram Business, GCal | Cal event + TG reply ("Book & reply", rechecks slot) | — | acceptance applies to active offer; overlap recheck | **"If Telegram delivery is uncertain, the owner sees a notice to check the chat"** | booking slots | vitest, no count | shop Node srv | "limits" §, verified-where table |
| `soshixos/glancemail` | unmatched (Track 4) | 04 | Gmail | Gmail **send** on "approve" | — | `dryRun` server flag | "Sent state" confirm; no unknown-outcome | — | E2E curl log, no count | local Node srv | "cut from MVP: calendar brief" |
| `mythos-builds/brief-g2` | **Brief** | — | Gmail label, GCal | Gmail send (two presses) | — | "two presses at the same moment = one mail" | **"Not confirmed. Check Sent on your phone." + never retried on its own** | brief = who/why/last said | 128+130+238+15 | CF Worker + D1 | simulator-only caveat |
| `Hajrajadoon/glance-g2` | Glance (unmatched) | 04 | Gmail (+GCal opt) | Gmail send | — | guard output checks | screen state machine | — | **39** | Express srv | limitations + roadmap |
| `JimmyOgb/brieftap` | **BriefTap** | 01 | Telegram MTProto | TG reply on 1 tap | — | — | — | — | — | Render srv | API-limitation list |
| `ElTanque81/polyglot-g2` | **PolyGlot-G2** | — | Telegram | TG send with countdown | **5 s** | — | — | **promise tracker w/ due time**, "tell them it's done" | — | Fastify srv | — |
| `boliny25-crypto/glancewire-g2` | **GlanceWire** | 01+02 | TG public channels, Polymarket | paper position (side→confirm) | — | — | "if the network dies, the app says so" | — | — | srv | no mocks claim |
| `Akar-Samudra-Artifisial/bouncer` | **Bouncer** | — | Telegram groups | moderation actions (dry-run by default) | — | **`update_id` / `msg:<chat>:<id>` dedupe** | — | — | selftest | srv | dry-run default |
| `AliceMessi/glance-desk` | Glance Desk (unmatched) | — | Telegram work chats | TG send, 2 s cancel window | **2 s** | **atomic `sending` claim — two teammates never answer one thread** | claim/race handled; no unknown outcome | — | **80** + e2e | CF Worker + D1 | claims-and-proof table |
| `tegar07257/inbox30` | Inbox 30 (unmatched) | 04 | Gmail | drafts, voice amendments | — | — | — | — | — | self-run Node srv | "your mail never touches our servers" |
| `bck-stack/closer` | Closer (unmatched) | — | Gmail quotes | Gmail send after 30 s outbox | **30 s** | single-use approval bound to vendor+amount, **expires 10 min** | commitment-phrase scan on every draft | scans commitments | **128** | CF Worker + D1 | "try to trick the guard" button |
| `Rampop01/kith` | Kith (Track 01) | 01 | Telegram | TG send (one-tap deliver) | — | — | — | **"2d overdue" promises, owed-to-me** | — | bot + Mini App srv | "next" list |
| `Bolajiev/relay-g2` | Relay (Track 01) | — | Telegram | TG reply behind **CHECK/MAYBE review gate** | — | — | **no default commitments**; uncertainty preserved | asks w/ urgency | **51** (+58 stated) | Express srv | limitations § |
| `k58v2hbzkk-del/witness` | **Witness** | — | Polymarket | paper action on ring tap | — | — | — | — | **13** | srv | "honestly … within rules" |

## What is actually rare

Columns where **≤2** of the 28 table rows match us. Counted by reading, not by blurb.

1. **An explicit unknown-outcome *state* that forbids retry and must be reconciled — 0 match.** Two repos say
   the sentence in words and stop there: **Brief** ("`Not confirmed. Check Sent on your phone.`"; "a send is
   never retried on its own") and **Chairside** ("If Telegram delivery is uncertain, the owner sees a notice to
   check the chat"). Neither models it: no state, no record that survives the screen, no reconciliation pass.
   **Nod** ("a failed send is not retried on its own") covers *known* failure, not lost response. This is the
   only column where we are alone, and it is provable in a unit test rather than a screenshot.
2. **A durable, addressable per-action record carrying the provider's own reference — ≤2 partial.** **Next
   Brief** has the closest thing: `/api/audit/:id` with status `Applied / Undone / Not reversible`. **Cue**
   *claims* "idempotency keys and Telegram audit receipts". Neither states that the provider's message id is
   stored on the record, and Next Brief's store is the demo/in-memory one. Addressable-by-id + delivered string
   + provider reference in one row is still unclaimed in any README we read.
3. **Idempotency key computed and looked up before the provider call — 1 verified claim (Cue), code unread.**
   This is a claim column, not a rare column: see dedupe in "behind".

Everything else we believed was rare is now crowded — see below. Do not lead with "receipt" alone.

## Where we are behind

Columns where **≥3** verified competitors do something we do not. Each named.

- **Undo window (8+; we have none).** Cue 3 s · Tapback 2 s · Glance Desk 2 s · PolyGlot 5 s · Kept 5 s (+60 s
  server record) · Closer 30 s · TriageG2 1-tap · Next Brief receipt+log · GlanceReply 5 s/60 s · Chengzhang.
  Table stakes, not cleverness.
- **Evidence that the write happened (4; our headline claim).** Questling "checks it arrived" · GlanceMail
  "Sent state … so you never wonder whether it sent" · Brief "`Sent √` appears only once the server has
  confirmed it" · Next Brief audit log with statuses. We differ in *durability + provider reference*, not in
  *having a receipt idea*.
- **Read breadth (≥5).** Questling (Gmail/Slack/Telegram/GitHub/Todoist/GCal) · Brief (Gmail+GCal) · Glance
  Brief (Gmail+GCal+Telegram) · Next Brief (GCal+Notion) · Chairside (GCal+Telegram Business) · JoatGlass
  (Gmail+iMessage+GCal+Reminders). Prelude reads **Notion only**.
- **Write breadth (≥5).** Questling · Next Brief (Cal/Notion/TG) · TriageG2 (Gmail/Cal/Notion) · Chairside
  (Cal/TG) · Cue (TG/Notion/Cal). Prelude writes email + Notion.
- **Commitments with due dates and overdue state (≥4 — our differentiator #3 collapses).** Kept: `2 DUE TODAY
  1 LATE`, `KEPT 8/10 THIS WEEK`, I-owe/owed-to-me, dates resolved by rules · Kith: "2d overdue", owed-to-me ·
  Questling: overdue quests, "who is waiting" · PolyGlot: promise tracker with due time. Glance Brief's brief
  already includes "**what you owe them**" for the meeting's people. *Ours is the same claim; keep it only if
  we can show it better, not as rare.*
- **Duplicate protection (≥6).** Cue (keys) · Nod ("repeated send returns the first result") · Brief ("two
  presses at the same moment = one mail") · Glance Brief (in-flight guard) · Bouncer (`update_id` dedupe) ·
  Glance Desk (atomic `sending` claim) · Aside (blocking screen).
- **Test volume (≥5 beat our 271).** Brief 511 total (128+130+238+15) · Questling 163 · g2-supervise 134 ·
  Closer 128 · Glance Desk 80 · Relay 51 · Aside 48 · Glance 39 · Chengzhang 34. Ours is above the median,
  below the leaders.
- **Deterministic fallback when the model fails (≥3).** Brief (two-press rules + stub backend) · Glance Brief
  (local templates) · Questling (deterministic heads-up engine) · Glance Desk (heuristic triage fallback).
- **Voice-review-before-send (≥5).** Relay CHECK/MAYBE gates · Brief ("speaking never sends") · Kept SAVE THIS?
  · Khazmi confirm tap · Chairside owner-picks-action. Our "voice must pass REVIEW" is correct but standard.

## Corrections to `COMPETITION.md`

Every one of these was checkable, and the old text was wrong or merged two repos into one:

1. **"Glance Brief never sends" vs "does send" is not a contradiction — there are two builds.** `qinheyi/
   glance-brief` sends (tap=SEND, `confirmed:true`, 16 tests); `Khazmi-lab/glance-brief` is **drafts-only**
   ("Nothing is ever sent: the only write is a Gmail draft"). The listing quote matches the second. Fix the
   note to name both; the "self-inflicted wound" line should point at Khazmi-lab.
2. **TriageG2 is two repos, not one.** `z121245017-ai/triage-g2` (Track **04 primary**, Default-NO gate,
   1-tap Undo stack, receipt) is the listed build; `LoganZ2/triage-g2` (Track **01 primary**, 9/9 Vitest, keys
   in browser memory, **no undo**) is a different app with the same name. `COMPETITION.md` credits the 04
   build's safety features to the 01 repo.
3. **Kept does claim deadlines and overdue** (`2 DUE TODAY  1 LATE`, due label, I-owe/owed-to-me). The earlier
   "no deadline/overdue state claimed" is wrong — it weakens our differentiator #3 further.
4. **Questling is the strongest read/write competitor we have read**: six read sources, confirms every change,
   verifies arrival, 163 tests. It does not appear in `COMPETITION.md`'s weakness analysis at all.
5. **`mythos-builds/brief-g2` is not the only "Brief".** `onepolymath/g2-brief` exists too (Telegram briefing);
   don't assume a single repo when naming competitors.

## Coverage statement

Exact, because a judge can check it:

- **121 builds on the DoraHacks list; 19 of them were resolved to a repository** — 13 of the 16 Track 04 names
  I was given, 6 of the 11 adjacent names. **102 builds were not mapped to a repo** and remain unverified.
- **45 READMEs were fetched from `raw.githubusercontent.com`; 28 are in the table above, the other 17 were
  skimmed and dropped** (duplicate names, unrelated projects, Track 01/02 fillers). Nothing in this matrix
  comes from a DoraHacks blurb — the listing is only used to *label* which build a repo is.
- **Track 04 names with no public repo found** (searched: exact name, name+`even realities`, name+`g2`,
  `in:readme` variants, 3 cooldown-separated batches): **FUSE Brief**, **Oh Right! (Kai)**, **Next Up
  (blockchaincali)** — the closest candidate for Next Up is `GabrielAvenging/next-brief`, name mismatch, so it
  is recorded as *unconfirmed*, not as Next Up.
- **Adjacent names with no public repo found:** **BlinkWire** (sanchay072 — search returns only an unrelated
  puzzle game), **QuickReply** (Suisei), **PinGuard** (qwe70301), **ByYourSide** (mikey), **DEXTRA**.
- **The three private builds remain unreadable by design.** Track 01/02 entries (~85 builds) were not audited
  in depth; only where their README claimed a write path we cared about (dedupe, undo, review gate).
- **Known blind spots:** README claims were not verified against source except where the README names a file
  or test; no repo was cloned, so test counts are *claimed*, not observed. Rate limits: 54 search queries
  issued at ~7 s spacing (53 returned data; one HTTP 403 on the 54th, then a 60 s backoff and 8 more), never
  retried blindly.
