# Deep Research — Heads Up: Even Realities Hackathon (TVM Ventures × Daos Hub)

> Compiled 2026-11-25. Sources: DoraHacks event page + builds list, Even Hub official docs
> (`hub.evenrealities.com/docs`), npm registry metadata, official `evenhub-templates` repo,
> community reverse-engineering notes (`nickustinov/even-g2-notes`), `even-toolkit`,
> and live endpoint probes run from this machine.
>
> Everything marked **[PROBED]** was verified by an actual HTTP request during this research.

---

## 1. The event

| Field | Value |
|---|---|
| Name | Heads Up: Even Realities Hackathon by TVM Ventures & Daos Hub |
| Prize pool | **$10,000 USDT** + up to 10 pairs of G2 |
| Build week | Nov 23 – Nov 29, 2026 (online, worldwide) |
| Submission deadline | **Nov 29, 23:59 Dubai (GMT+4)** = Nov 30, 01:29 IST |
| Demo Day | Dec 3, 14:00–18:00, Daos Hub, Dubai (remote allowed) |
| Teams | 1–4 people, one team each, up to 2 projects per team |
| Required | Public GitHub/GitLab repo + README with setup + **demo video ≤ 3 min** |
| Optional | Packaged `.ehpk`, up to 5 API feature requests |
| Hardware needed | **None** — free Even Hub simulator is accepted for the demo video |

### Prize structure

| Prize | Cash | G2 |
|---|---|---|
| Grand Prize | $2,000 | 2 pairs |
| 1st per track (×4) | $1,250 | 1–2 pairs |
| 2nd per track (×4) | $375 | — |
| Best Telegram integration | $1,000 | — |
| Community Partner Award | up to $500 | — |

A project can win **one** cash prize — highest wins, next project moves up.

### Judging rubric (this is the spec)

| Criterion | Weight | What it actually means |
|---|---|---|
| **Usefulness on G2** | **30%** | Solves a real everyday moment, works at a glance, hands-free |
| **Read and write** | **25%** | Acting is fast: short phrase, one tap, or the ring — smart defaults / AI drafts, not long dictation |
| **Technical execution** | 20% | Works end to end, reliable, clean code |
| **UX for display and voice** | 15% | Clear on 576×288 monochrome, natural by voice |
| **Business potential & safety** | 10% | Real users/demand, careful with data and money |

**Read & write is the criterion a text description cannot win.** A demo must show the round trip:
state on the lens → one gesture → a real side effect → a receipt on the lens.

---

## 2. The four tracks

| # | Track | Apps in scope | Named example moments |
|---|---|---|---|
| 01 | Messaging & News | Telegram (accounts, bots, channels, Mini Apps), Discord, Slack | see new messages only from chats you pick; digest of channels; reply by voice or approve an AI draft |
| 02 | Crypto & DeFi | Gram Wallet, Polymarket, Hyperliquid, Trust Wallet | check balance / live odds / open position; place testnet bet or order by voice, confirm with one tap |
| 03 | Exchanges & Stocks | Binance, OKX, Bybit, Coinbase, Interactive Brokers | PnL, positions, price alerts during a session; "Move $500 from spot to margin? Yes/No" |
| 04 | **AI Assistants & Work** | Claude, ChatGPT, OpenRouter, Notion, Google Workspace (Gmail, Calendar, Drive) | **"a short brief before your next meeting"**, "inbox cleared in 30 seconds", "answers from your own notes"; reply to an email, add a task, move a meeting by voice |

Special prize: **Best Telegram integration** — open to any track.

Money safety rule: demos must use **testnet, paper trading, or read-only data**. No custody, no financial advice, never commit keys.

---

## 3. Competitive analysis — 63 builds (as of 2026-11-25)

### Distribution by track

| Track | Approx. builds | Crowding |
|---|---|---|
| 01 Messaging & News | ~30 | **Bloodbath** — ~20 are Telegram triage variants |
| 02 Crypto & DeFi | ~18 | **Heavy** — Hyperliquid/Polymarket HUD clones |
| 03 Exchanges & Stocks | ~4 | Light |
| 04 AI Assistants & Work | **~6** | **Nearly empty** |

### Track 04 builds (the ones that matter to us)

| Build | One-liner | Gap we can exploit |
|---|---|---|
| **FixGuide AI** | Hands-free phone-repair assistant | Not a work moment; narrow domain |
| **Kept** | Say a promise out loud → filed in Notion with person, direction, due date | Capture-only; no pre-meeting brief, no read-back |
| **Glance Brief** | Next meeting + unread inbox; reply with one tap, saved as a **Gmail draft, never sent** | Closest competitor. **Never sends** — weak on read&write. No prep note, no agenda, no voice |
| **Aside** | Notion tasks: today at a glance, done with a tap, captured in one breath | Task list, not a meeting brief |
| **ByYourSide** | Dementia care reminders via Telegram bot + G2 prompts | Healthcare, different user |
| **Private build** | hidden | — |

### Track 01 patterns (what to avoid)

Every one of these is the same shape: *unread Telegram message → AI draft → one tap sends*.
`Glance`, `GlanceAlert`, `HeadsUp Pulse`, `TapBack`, `GlanceReply`, `Glance Desk`, `Heads Up`,
`OpticSentry OS`, `Balas Kilat`, `TG Glance`, `TeleGlance`, `Telegram Glance`, `Glance: Telegram`,
`PolyGlot-G2`, `BlinkWire`, `PinGuard`, `Glimpse`, `FUSE Glance`, `BotTap`, `Quiet Seat`, `Paid`…
Differentiators attempted: multi-language, conflict locks, Slack/Discord/HN, voice notes, TON bill splits.

**Conclusion: do not enter Track 01.** Even a better Telegram app competes with 30 entries for one $1,250 slot.

### Track 02/03 patterns

Hyperliquid candles + Polymarket odds + paper trades + "confirm with a tap". ~18 near-identical HUDs.
`Matrix Neo`, `HL Glass`, `PulseHUD`, `GlanceFi`, `PerpWatch`, `PolyGlance`, `PaperPoly`, `Odds`,
`WickSight`, `Riskline`, `LiveEdge HUD`, `Event Checkpoint`, `GlanceCart`, `GlanceMarkets`, `CoinGlance`,
`TickGlance`, `Binance Session`, `CryptoGlance`, `LensFi`, `GlanceFi G2`, `Glass Wallet`, `GlanceDesk`.

**Conclusion: do not enter Track 02 or 03.**

### The strategic read

1. **Track 04 is the only track with a real opening** (~6 builds vs ~30).
2. The organizers **literally name our moment** in the track description: *"Get a short brief before your next meeting."*
3. The strongest existing entry (`Glance Brief`) **deliberately never sends** — it saves a Gmail draft.
   That is a self-inflicted wound on the 25% read&write criterion.
4. Nobody in Track 04 combines **brief + prep note + agenda + voice** in one glanceable card.

---

## 4. The G2 hardware contract

| Spec | Value |
|---|---|
| Display | **576 × 288 px per eye**, monochrome green, **4-bit greyscale (16 levels)** |
| Font | Single LVGL font baked into firmware. **No monospace, no size control, no bold/italic** |
| Capacity | ~**400–500 characters** in a full-screen text container |
| Containers | max **4 image** + **8 other** per page; **exactly one** `isEventCapture: 1` |
| Image container | max **288 × 144 px** each; 4-bit greyscale; LZ4-compressed in transit |
| Input | Temple touchpads + optional R1 ring: press, double press, swipe up, swipe down, long press + release |
| Audio in | 4-mic array, **PCM s16le 16 kHz mono**, 100 ms per event (3,200 bytes) |
| Not present | **No camera. No speaker.** |
| Connectivity | BLE 5.2 to the phone; app logic runs in a WebView on the phone |

### Text container limits

| Method | Max chars |
|---|---|
| `createStartUpPageContainer` | 1,000 |
| `textContainerUpgrade` | **2,000** |
| `rebuildPageContainer` | 1,000 |

### `textColor` (SDK 0.0.14+)

Five brightness levels **0–4**. Omitted on create/rebuild → device default **4**.
Omitted on `textContainerUpgrade` → keeps current. `0` is dimmest, not "unset" — may be invisible.
**`textColor` is 0–4; `borderColor` is 0–15.** Different scales on the same container.

### `zOrderIndex` (SDK 0.0.12+)

All-or-nothing per page: if any container sets it, **every** list/text/image container must.
Values must be unique. Larger = closer to front. Violations fail locally before reaching firmware.

---

## 5. SDK surface (v0.0.16, verified from `dist/index.d.ts`)

### Bridge methods

```ts
waitForEvenAppBridge(): Promise<EvenAppBridge>
bridge.getUserInfo() / getDeviceInfo()
bridge.setLocalStorage(k,v) / getLocalStorage(k)
bridge.getAppLocation(opts) / startAppLocationUpdates / stopAppLocationUpdates
bridge.pickImageFromAlbum() / captureImageFromCamera()
bridge.createStartUpPageContainer(c)   // → 0 ok, 1 invalid, 2 oversize, 3 OOM
bridge.rebuildPageContainer(c)         // → boolean
bridge.updateImageRawData(d)           // → 'success' | 'imageException' | 'imageSizeInvalid' | 'imageToGray4Failed' | 'sendFailed'
bridge.textContainerUpgrade(c)         // → boolean
bridge.audioControl(isOpen, source?)   // AudioInputSource.Glasses | .Phone
bridge.imuControl(isOpen, pace?)       // ImuReportPace.P100 … P1000
bridge.shutDownPageContainer(mode)     // 1 = system exit dialog (REQUIRED on root page)
bridge.onEvenHubEvent(cb)              // single subscription for everything
bridge.onLaunchSource / onDeviceStatusChanged / onAppLocationChanged
```

### `OsEventTypeList`

| Event | Value | Notes |
|---|---|---|
| `CLICK_EVENT` | **0** | **Protobuf omits zero → arrives as `undefined`** |
| `SCROLL_TOP_EVENT` | 1 | swipe up / scroll to top |
| `SCROLL_BOTTOM_EVENT` | 2 | swipe down / scroll to bottom |
| `DOUBLE_CLICK_EVENT` | 3 | must call `shutDownPageContainer(1)` on root |
| `FOREGROUND_ENTER_EVENT` | 4 | also fires when the contextual menu opens |
| `FOREGROUND_EXIT_EVENT` | 5 | also fires when the menu closes — **not** app teardown |
| `ABNORMAL_EXIT_EVENT` | 6 | unexpected disconnect |
| `SYSTEM_EXIT_EVENT` | 7 | user confirmed exit |
| `IMU_DATA_REPORT` | 8 | |
| `LONG_PRESS_EVENT` | 9 | SDK 0.0.14+ |
| `LONG_PRESS_RELEASE_EVENT` | 10 | SDK 0.0.14+ |

### The single most important code pattern

```ts
// CLICK_EVENT is 0 and protobuf drops zero-value fields, so a tap arrives
// with NO eventType at all. Resolve the default INSIDE the envelope check.
function eventTypeOf(env?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!env) return null
  return env.eventType ?? OsEventTypeList.CLICK_EVENT
}
```

Writing `event.sysEvent?.eventType ?? CLICK_EVENT` is a **bug**: it reads CLICK on every event
that carries no `sysEvent` at all — every scroll, lifecycle event and audio frame fires your tap handler.

### Event routing

| Capture container | Events arrive as |
|---|---|
| Text container | `event.textEvent` |
| List container | `event.listEvent` |

Two things bypass routing entirely: **`menuItemClickEvent`** (contextual menu) and
**long press** (`event.sysEvent`, `eventSource` absent).

### Contextual menu (SDK 0.0.14+, Even App 2.2.9+)

- `menuObject.menuItems[]` — max **10**, `itemID` non-zero uint32 unique, `itemName` ≤ **32 UTF-8 bytes**
- Fire-and-forget: selecting sends one event and closes the menu; labels do not re-render
- `rebuildPageContainer` **without** `menuObject` **clears** your items
- Design labels as verbs (`Restart`, `Skip`), not state readouts

---

## 6. Performance — measured on real hardware

From community measurements (G2 firmware 2.2.7.14, SDK 0.0.13, ~40 sends):

| Call | Cost |
|---|---|
| `updateImageRawData` | **~104 ms fixed** + ~3.9 ms per KB of gray4 |
| `rebuildPageContainer` | **~165 ms**, flat regardless of container count |
| `textContainerUpgrade` | **~83 ms** per call |
| `createStartUpPageContainer` | ~100–135 ms |

**Per-call overhead dominates; payload size barely matters.** 10.5× the image data costs 1.6× the time.

### Consequences for design

1. **Fewer host calls beats cheaper host calls.**
2. Break-even between N × `textContainerUpgrade` and one rebuild is **2 containers**.
   Updating 5–6 text containers in place (~415–500 ms) is ~3× worse than one rebuild (~165 ms).
3. Clearing the display: 1 container → blank image send wins; **2+ containers → rebuild wins**.
4. Animation ceiling ≈ **9.5 fps** for one container; animate **one large** container, not several small.
5. Debounce display writes (~120 ms) — the BLE render queue is slow.
6. **Never await `getAppLocation` before first paint** (~3 s on device → blank glasses).
7. Never await slow work inside the event dispatcher — it drops taps.

---

## 7. Networking — the two gates

Every outbound request must clear **both**:

1. **Even-side permission check** — the origin must be in `app.json` `permissions[network].whitelist`.
   Full origin only (`https://api.example.com`); **no wildcards, no bare hostnames**.
2. **Browser CORS** — the server must return `Access-Control-Allow-Origin` (+ preflight for JSON bodies).

> The whitelist is **not** a CORS bypass. Adding a domain does not override CORS.

**Never bundle secrets.** An `.ehpk` is extractable. All third-party keys live behind your own server.

---

## 8. Manifest (`app.json`) — exact rules

| Field | Rule |
|---|---|
| `package_id` | reverse-domain, **lowercase letters/digits only**, ≥2 segments, **no hyphens/underscores**, each segment starts with a lowercase letter |
| `edition` | exactly `"202601"` |
| `name` | **≤ 20 characters**, must **not contain "Even"** (case-insensitive) |
| `version` | `x.y.z`, no `v`, no pre-release |
| `min_sdk_version` | required; current floor `"0.0.14"` |
| `min_app_version` | **derived by the CLI from the SDK version at pack time** — don't set by hand |
| `entrypoint` | must exist inside the build folder |
| `permissions` | **array of objects** `{name, desc, whitelist?}` — not a map |
| `supported_languages` | `en, de, fr, es, it, zh, ja, ko` |

Permission names: `network`, `location`, `g2-microphone`, `phone-microphone`, `album`, `camera`.
**Every declared permission must actually be used** — unused ones are flagged at review.

### Packaging

```bash
npm run build
evenhub pack app.json dist -o app.ehpk --sdk-ver 0.0.16
```

`--sdk-ver` matters: without it the CLI reads npm `latest`, not the SDK you bundled.

---

## 9. QA rubric — what reviewers reject

- ❌ Root-page double-tap that does **not** call `shutDownPageContainer(1)`
- ❌ Custom in-app exit UI instead of the system dialog
- ❌ Black screen on first run when setup is needed
- ❌ Re-prompting setup every launch (must persist in `localStorage`)
- ❌ Lingering WebView after exit
- ❌ Unused permissions
- ❌ Icon that is illegible, coloured, or not built from 2×2 blocks
- ❌ Display name mismatch between portal, `app.json`, and on-glasses name
- ❌ Medical diagnosis, financial advice, emergency routing

### The 5-minute locked-phone test

Open app → steady state on glasses → **lock phone 5 min** → unlock → app still alive and responsive.
Only a **beta build** survives this. QR sideload dies the moment the WebView backgrounds.

### Android backgrounding

Chromium WebView **may be suspended** under memory pressure → treat as a cold start.
Persist anything important to `localStorage`; re-arm `audioControl` and location on foreground.

---

## 10. Tooling versions (verified)

| Package | Version | Notes |
|---|---|---|
| `@evenrealities/even_hub_sdk` | **0.0.16** | published 2026-09-24; `minAppVersion` 2.2.10 |
| `@evenrealities/evenhub-cli` | **0.2.0** | published 2026-10-20; 10 new commands, `--json` everywhere |
| `@evenrealities/evenhub-simulator` | **0.9.5** | published 2026-09-01; automation API since 0.7.0 |

Node requirement: **20.17+ / 22.13+ / 23.5+**. This machine: Node **v22.14.0**, npm 11.12.1 ✅

### Simulator automation API (for CI)

```bash
evenhub-simulator http://localhost:5173 --automation-port 9898
```

| Endpoint | Purpose |
|---|---|
| `GET /api/ping` | health → `pong` |
| `GET /api/screenshot/glasses` | 576×288 **RGBA** PNG of the framebuffer (use `alpha > 0` as lit-pixel test) |
| `GET /api/screenshot/webview` | PNG of the host webview |
| `GET /api/console[?since_id=N]` | console + uncaught errors + failed fetches |
| `DELETE /api/console` | clear buffer |
| `POST /api/input` | `{"action":"up\|down\|click\|double_click\|long_press\|long_press_release\|context_menu"}` |

Allow **~4 s after launch** before sending input (SDK init + page creation).
`context_menu` **toggles** — a blind second send closes it.

---

## 11. Live endpoint probes **[PROBED]**

Run from this machine on 2026-11-25.

| Endpoint | Result |
|---|---|
| `https://testnet.binancefuture.com/fapi/v1/time` | **200** `{"serverTime":1795596163292}` |
| `https://testnet.binancefuture.com/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=3` | **200**, 445 B |
| `https://testnet.binancefuture.com/fapi/v1/premiumIndex?symbol=BTCUSDT` | **200**, 231 B |
| `https://testnet.binancefuture.com/fapi/v1/exchangeInfo` | **200**, 905 KB |
| `https://api.binance.com/api/v3/time` | **200** |
| `https://testnet.binance.vision/api/v3/time` | **200** |
| `https://api.hyperliquid.xyz/info` `{"type":"allMids"}` | **200**, 25 KB |
| `https://gamma-api.polymarket.com/markets?limit=2&active=true&closed=false` | **200**, 12 KB |
| `https://clob.polymarket.com/markets?limit=2` | **200**, 1.8 MB |
| `https://api.notion.com/v1/users/me` (no token) | **401** — reachable, auth required |
| `https://slack.com/api/api.test` | **200** |
| `https://discord.com/api/v10/gateway` | **200** |
| `https://oauth2.googleapis.com/device/code` (GET) | **404** — endpoint exists, POST only |
| `https://hub.evenrealities.com/catalogue.json` | **200** but returns the SPA shell, not JSON |
| `https://dorahacks.io/api/...` | **404** — no public builds API |

**Takeaways**
- Binance **testnet futures** and Hyperliquid public info are both live and keyless → usable for a
  read-only or paper-trading demo with zero credentials.
- Notion requires a token but the host is reachable → a server-side integration token works.
- Google's **device authorization flow** (`POST /device/code`) is the correct answer to
  "Google sign-in does not work inside the WebView" — the user authorises on their phone browser
  and the backend holds the refresh token. No OAuth inside the WebView.

---

## 12. Reference implementations worth reading

| Repo | Why |
|---|---|
| `even-realities/evenhub-templates` | 4 official scaffolds: `minimal`, `asr`, `image`, `text-heavy`. **The event-handling pattern in `minimal/src/main.ts` is the canonical one.** |
| `nickustinov/even-g2-notes` | Community reverse-engineering: measured perf, event quirks, UI patterns |
| `nickustinov/demo-app-g2` | SDK feature showcase, max containers, Unicode glyphs |
| `dmyster145/EvenChess` | Full app with tests, linting, modular architecture |
| `fuutott/rdt-even-g2-rddit-client` | Clean packaging + API proxy reference |
| `fabioglimb/even-toolkit` | 55+ components, 191 pixel icons, per-screen architecture, text measurement |
| **`maticsh/matic-even`** | **23 measured findings on real G2 hardware** — see §12b. The single most valuable source |
| `lim0513/even-g2-plugin-hear` | Live captions, Soniox STT, nothing recorded — confirms the STT-behind-a-server pattern |
| `tntpsu/even-voice-shim` | Push-to-talk STT shim, explicitly a workaround for the missing on-device STT API |
| `ChristopherKahler/paul` | PLAN → APPLY → UNIFY loop; acceptance-driven development |
| `alirezarezvani/claude-skills` | 434 skills / 137 agents / 188 commands, `npx skills add` installable |

---

## 12b. Measured hardware findings — `maticsh/matic-even`

23 findings measured on a real G2 (SDK 0.0.16, iPhone, QR sideload, 2026-10-03 → 10-09).
Each states a claim, a method, a confidence level, and what to do about it. **These contradict the
official docs in places, and the measurements win.**

### The ones that changed our code

| ID | Claim | What we did |
|---|---|---|
| **H11** | Quick repeated taps are read as a **double tap**, and on the root page a double tap opens the exit dialog. A triple tap never reaches the app as three taps | `createGate(350)` on taps |
| **H12** | One long swipe can arrive as **several scroll events**. A screen that changes on swipe flips more than once | `createGate(700)` on swipes |
| **H19** | Users can bind a temple's long press to a **system action** (Even AI). An app cannot count on a long press reaching it | Voice is also in the contextual menu |
| **H2** | All five `textColor` levels render, but they look **too alike to rank text** | All three bands at 4; hierarchy from position |
| **H20** | A page rebuild **cannot animate**, and a page rebuilt empty then filled shows a second jump | Startup page built with text; only in-place upgrades |
| **H7** | OS overlays fire `FOREGROUND_ENTER` on open and `FOREGROUND_EXIT` on close. **Never map EXIT to pause** | Every foreground event is a checkpoint |

### The rest, worth knowing

| ID | Claim |
|---|---|
| H1 | A small, solid, filled shape blinking at the edge catches the eye. Thin blinking text reads as flicker. `soft` brightness blink fails |
| H3 | Images show all 16 grey levels |
| H4 | A 144×144 PNG lands in 150–300 ms |
| H5 | Replacing an image does not flicker, and rapid sends all land |
| H6 | `isWearing` changes while a plugin is open |
| H8 | `●▲▼` look heavier in the simulator than on glass |
| H9 | The firmware font reads a little large, and has no size control |
| H10 | With the phone unlocked, a 5 s heartbeat ran with no gaps (longest interval 8 s) |
| H13 | The IMU is an accelerometer in g. x is pitch. Pace is ms between samples |
| H14 | At 1 Hz the IMU can tell looking up, looking down, still and moving apart |
| H15 | **A QR sideload ran 18 minutes with the iPhone locked** — contradicts Even's docs |
| H16 | A plain long press reaches the app as `LONG_PRESS_EVENT` then `LONG_PRESS_RELEASE_EVENT` |
| H17 | Wear detection is a user setting. With it off, `isWearing` stays false |
| H18 | The display sits **above** the line of sight. Put the thing people look up for in the centre |
| H21 | Overflowing capture text scrolls in firmware. Nobody has seen an end-of-scroll event |
| H22 | `navigator.share` missing; `clipboard.writeText` silently fails; `mailto:`/`sms:` do nothing; `execCommand('copy')` works |
| H23 | The firmware font has **no Hindi**. Send it as an image |

### Store-review lessons from the same repo

- Review flags **any URL string in your bundle that is not on your whitelist** — not just requests.
- Turn sensors **off** on the exit events.
- Portal field limits, a public privacy policy, and manifest checks are all enforced.

### Why this matters

Three of our bugs were found in someone else's field notes, not in our own tests. The official docs say
a QR sideload dies when the phone locks; H15 measured 18 minutes. **Read the measurements before you
trust the docs.**

---

### Useful glyphs that ship in the firmware font

| Use | Characters |
|---|---|
| Progress | `━ ─ █▇▆▅▄▃▂▁` |
| Navigation | `▲△▶▷▼▽◀◁` |
| Selection | `●○ ■□ ★☆` |
| Borders | `╭╮╯╰ │─` |
| Cursor | `>` |

---

## 13. Design constraints that shape the product

1. **One decision per screen.** 576×288 at ~42 chars/line and ~8 body lines is the budget.
2. **No background fill.** Borders and text are the only structure.
3. **No word wrap helper, no styled spans.** Wrap every line yourself.
4. **No read-back of what the display shows.** Keep your own mirror of screen state.
5. **Exactly one event-capturing container** — and nothing enforces it. Pin it with a test.
6. **Text ≤ 999 UTF-8 bytes per container** in practice (the 1,000-char limit is characters, not bytes).
7. **Drop whole fields by priority** rather than truncating a number in half.

---

## 14. Decision

**Build for Track 04 · AI Assistants & Work.**

Product: **Prelude** — *the brief before your next meeting.*

One card, before the meeting starts: who you're meeting, in how long, **what you owe them**, the doc you
last touched together — and **one action**: reply "running 5 late" / add a prep note / open the agenda.
Tap to act. Voice is a fallback with a mandatory review step.

Why this wins on the rubric:

| Criterion | How Prelude scores |
|---|---|
| Usefulness (30%) | The organizers' own named moment. Daily, recurring, hands-free |
| Read & write (25%) | One tap performs a **real** side effect (sends the reply, writes the Notion note) and the lens shows a receipt carrying the delivered string |
| Technical execution (20%) | Pure core + tested layout engine + real backend + simulator gate |
| UX (15%) | Three text bands, one cursor, four gestures, no dashboards |
| Business (10%) | Execs/knowledge workers; token-only auth; no funds, no PII beyond the user's own workspace |

Why not Telegram: 30 competitors for one slot.
Why not crypto: 18 near-identical HUDs, and money-safety rules add risk for zero differentiation.
