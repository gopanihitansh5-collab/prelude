# DEMO — shot list with narration

A 2:29 cut. [demo.mp4](./demo.mp4) is already rendered — **this file exists so the video can be re-cut**, not because you
need to assemble it. Narration is `en-IN-PrabhatNeural` (Indian English, male) at +2% rate, one clip per scene, and
every cue below lands on the frame it describes. The picture is Playwright driving the deployed app; ffmpeg adds the
title card, captions, narration and end card. The rubric this is built for:
**usefulness 30% · read & write 25% · technical 20% · UX 15% · business 10%** — the time is spent in that order,
and the receipt gets the last word.

| Time | Scene | What is on screen | What is heard |
|---|---|---|---|
| 0:02.5 – 0:28.0 | The cost | Landing page, slow scroll. Do not hurry it; the cost is the point. | "Nine fifty-one. My next meeting is in nine minutes… five context switches, before I even start typing." |
| 0:28.4 – 0:58.0 | The card | The lens at exactly 576×288. Hold on the brief. | "This is Prelude, on Even Realities G2. One card…" |
| 0:58.4 – 1:16.3 | The commitment | Point at `OPEN: revised enterprise pricing`. | "The app read a message where I said I would send the revised pricing by Wednesday…" |
| 1:16.6 – 1:27.4 | Memory | Swipe to memory. `YES · 3 matches`, source and timestamp. | "Have we discussed pricing before? Yes…" |
| 1:27.8 – 1:38.8 | The action | Tap → actions list → tap *Reply: running 5 late*. | "One tap to act. Reply. Prep note. Or open the agenda…" |
| 1:39.2 – 2:11.8 | The write | The actions page: the record and the provider reference. | "The reply goes out through the server, not from the glasses…" |
| 2:12.2 – 2:25.0 | **The receipt** | `SENT · 12:04` — the exact delivered string. **Hold this frame.** | "Sent, at twelve oh four, carrying the exact string the server delivered… never a blind retry." |
| 2:25.0 – 2:29.0 | End card | Tagline, URL, repo, test count. | (music of the last clip tails off) |

## How to record it

```bash
cd prelude
npm install
npm run dev            # http://localhost:5173/lens
```

1. Open `/lens` and set the browser zoom so the lens measures exactly 576×288 on screen. No browser chrome in
   that crop.
2. Record the screen at 1080p or better, **without** audio, following the right-hand column.
3. Drop [`demo-voiceover.mp3`](./demo-voiceover.mp3) on the timeline starting at 0:00.
4. Trim any shot longer than its narration cue — the audio is the clock, not a suggestion.

## The three frames that must not be rushed

1. **The card** (0:20) — a judge must be able to read all three bands in one glance.
2. **The commitment line** (0:45) — this is the reason the product exists.
3. **The receipt** (1:25) — the exact delivered string, with the provider's reference. If a judge screenshots
   one frame of this video, it should be this one.

## Before you record

- [ ] `npm run gate` passes (typecheck, 275 tests, manifest, both builds)
- [ ] `/api/health` returns `{"ok":true,...}` and the header shows the mode
- [ ] The lens shows the brief, not `loading…`
- [ ] In demo mode, say the word **demo** on camera rather than implying a live integration
- [ ] 1080p+, 16:9, and the lens crop free of browser chrome

## If a shot fails

The narration is segmented, so a re-take only needs the scene that failed. The clip boundaries are the times in
the table above; `ffmpeg -ss <start> -to <end>` on the mp3 gives you the cue for any single scene.
