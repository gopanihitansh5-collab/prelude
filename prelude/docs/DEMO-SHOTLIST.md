# DEMO — shot list with narration

A 1:50 cut, timed to [demo-voiceover.mp3](./demo-voiceover.mp3) — narration rendered with ElevenLabs, one clip per
scene, and verified by transcribing the finished track back to text. Every cue lands on the frame it describes, so
you can record the screen once and lay the audio underneath. The rubric this is built for:
**usefulness 30% · read & write 25% · technical 20% · UX 15% · business 10%** — the time is spent in that order,
and the receipt gets the last word.

| Time | Scene | What is on screen | What is heard |
|---|---|---|---|
| 0:00.0 – 0:22.4 | The cost | Phone: unlock → calendar → thread → doc → start typing. Do not hurry it; the cost is the point. | "It is 09:51. My next meeting is in nine minutes… five context switches before I even start typing." |
| 0:22.8 – 0:47.5 | The card | The lens, at exactly 576×288. Hold on the brief. | "This is Prelude, on Even Realities G2. One card…" |
| 0:48.0 – 1:02.2 | The commitment | Point at `OPEN: revised enterprise pricing`. | "That is not a summary. The app read a message where I said I would send revised pricing by Wednesday…" |
| 1:02.6 – 1:09.3 | Memory | Swipe to memory. `YES · 3 matches`, source and timestamp. | "Have we discussed pricing before? Yes…" |
| 1:09.7 – 1:18.0 | The action | Tap → actions list → tap *Reply: running 5 late*. | "One tap to act. Reply, prep note, or open the agenda…" |
| 1:18.5 – 1:44.1 | The write | The backend call; the provider target. The token never touches the device. | "The reply goes out through the server, not from the glasses…" |
| 1:44.5 – 1:50.5 | **The receipt** | Back to the lens: `SENT · 12:04`, the exact delivered string. Then the actions page with the provider reference. **Hold this frame.** | "Sent, at twelve oh four, carrying the exact string the server delivered… a retry returns that receipt instead of sending twice… never a blind retry." |
| 1:50.5 – end | Optional | Follow-up radar: `3 OPEN COMMITMENTS · 1 OVERDUE`. | (covered by the last clip, 1:44.5–1:50.5) |

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
