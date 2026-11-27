// Film the deployed app and cut a narrated demo.
//
// The rules this follows, from EveryInc's product-launch-video skill:
//   • capture the REAL UI — never invent a label that is not on screen
//   • the product appears within the first three seconds
//   • burnt-in captions, because most views are muted
//   • the one moment only this product delivers gets the most screen time
//     (here: the receipt)
//   • a single headline + call to action on the end card
//
// Playwright records the browser; ffmpeg adds the title card, captions, the
// narration and the end card. Scene boundaries are the narration's, so the
// video and the voice cannot drift.
//
//   node scripts/demo-video.mjs [--base https://…] [--out docs/demo.mp4]

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const BASE = argOf('--base', process.env.PRELUDE_BASE ?? 'https://prelude-green.vercel.app')
const OUT = resolve(argOf('--out', 'docs/demo.mp4'))
const WORK = join(process.env.TEMP ?? '.', 'prelude-demo')
const VOICE = resolve('docs/demo-voiceover.mp3')
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p))

if (!existsSync(VOICE)) {
  console.error(`missing narration: ${VOICE}`)
  process.exit(2)
}

const W = 1920
const H = 1080
const TITLE_S = 2.5
const END_S = 3.5

// Scene boundaries come from the narration (docs/DEMO-SHOTLIST.md). Each scene
// is a real page, with real interactions, held for its line.
const SCENES = [
  {
    id: 'problem',
    url: '/',
    seconds: 22.4,
    caption: "It's 09:51 and the meeting is in nine minutes.",
    act: async (page, ms) => {
      await slowScroll(page, 0, 0.42, ms)
    },
  },
  {
    id: 'brief',
    url: '/lens',
    seconds: 24.7,
    caption: 'One glance: who, what, and what I owe.',
    act: async (page, ms) => {
      await page.waitForTimeout(Math.min(1200, ms))
      await page.mouse.wheel(0, 40)
      await page.waitForTimeout(ms - 1300)
    },
  },
  {
    id: 'memory',
    url: '/memory',
    seconds: 14.2,
    caption: 'Memory answers with the source and the timestamp.',
    act: async (page, ms) => {
      await slowScroll(page, 0, 0.25, ms)
    },
  },
  {
    id: 'action',
    url: '/lens',
    seconds: 6.7,
    caption: 'One tap to act — no dictation, no keyboard.',
    act: async (page, ms) => {
      const tap = page.getByRole('button', { name: /● tap/ })
      if (await tap.count()) {
        await tap.first().click().catch(() => {})
      }
      await page.waitForTimeout(ms - 600)
    },
  },
  {
    id: 'write',
    url: '/actions',
    seconds: 8.3,
    caption: 'The token lives on the server, never on the glasses.',
    act: async (page, ms) => {
      await slowScroll(page, 0, 0.22, ms)
    },
  },
  {
    id: 'receipt',
    url: '/actions',
    seconds: 25.6,
    caption: 'SENT — the exact string the server delivered.',
    act: async (page, ms) => {
      await slowScroll(page, 0.22, 0.6, Math.min(ms, 9000))
      await page.waitForTimeout(Math.max(0, ms - 9000))
    },
  },
  {
    id: 'radar',
    url: '/followups',
    seconds: 8.7,
    caption: 'Open commitments, tracked across every meeting.',
    act: async (page, ms) => {
      await slowScroll(page, 0, 0.3, ms)
    },
  },
]

async function slowScroll(page, from, to, ms) {
  const steps = Math.max(8, Math.round(ms / 120))
  for (let i = 1; i <= steps; i++) {
    const f = from + ((to - from) * i) / steps
    await page.evaluate((fraction) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: Math.round(max * fraction), behavior: 'instant' })
    }, f)
    await page.waitForTimeout(Math.max(20, ms / steps))
  }
}

// Title and end cards are real HTML, rendered by the same browser.
async function renderCard(browser, html, file) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: file })
  await page.close()
}

const cardShell = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${W}px;height:${H}px;background:#050807;overflow:hidden}
  body{display:flex;align-items:center;justify-content:center;
       font-family:ui-monospace,"Cascadia Mono",Consolas,monospace;color:#e8f5ee}
  .wrap{text-align:left}
  .kicker{font-size:22px;letter-spacing:.34em;color:#7dffa8;text-transform:uppercase;margin-bottom:28px}
  h1{font-family:ui-sans-serif,system-ui,Segoe UI,sans-serif;font-size:104px;line-height:1.02;margin:0;font-weight:650;letter-spacing:-2px}
  h1 .dim{color:#8fa39b;font-weight:400}
  .sub{margin-top:30px;font-size:30px;color:#9baaa5;line-height:1.45;max-width:1250px}
  .rule{height:2px;width:220px;background:linear-gradient(90deg,#7dffa8,#4dd0ff);margin:34px 0}
  .foot{margin-top:44px;font-size:24px;color:#6d8079}
  .url{color:#c8ffe0}
</style></head><body><div class="wrap">${inner}</div></body></html>`

const TITLE_HTML = cardShell(`
  <div class="kicker">Even Realities G2 · Track 04</div>
  <h1>Your glasses can read.<br><span class="dim">Prelude writes.</span></h1>
  <div class="rule"></div>
  <div class="sub">The brief before your next meeting — and one tap that ends in a receipt you can look up.</div>
`)

const END_HTML = cardShell(`
  <div class="kicker">Prelude</div>
  <h1>The brief before<br>your next meeting.</h1>
  <div class="rule"></div>
  <div class="sub"><span class="url">prelude-green.vercel.app</span> &nbsp;·&nbsp; github.com/gopanihitansh5-collab/prelude</div>
  <div class="foot">275 tests · TypeScript · Even Hub SDK 0.0.16</div>
`)

// Captions: one cue per scene, wrapped for 720p legibility.
function srt(segments, offset, total) {
  const wrap = (text, width = 62) => {
    const words = text.split(/\s+/)
    const lines = []
    let line = ''
    for (const w of words) {
      if ((line + ' ' + w).trim().length > width) {
        lines.push(line.trim())
        line = w
      } else line += ' ' + w
    }
    if (line.trim()) lines.push(line.trim())
    return lines.join('\n')
  }
  const t = (s) => {
    const ms = Math.round(s * 1000)
    const hh = String(Math.floor(ms / 3600000)).padStart(2, '0')
    const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
    const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
    const mmm = String(ms % 1000).padStart(3, '0')
    return `${hh}:${mm}:${ss},${mmm}`
  }

  let cursor = offset
  let index = 1
  const cues = []
  for (const seg of segments) {
    cues.push(`${index++}\n${t(cursor)} --> ${t(cursor + seg.seconds - 0.15)}\n${wrap(seg.caption)}\n`)
    cursor += seg.seconds
  }
  // Hold a closing line over the end card.
  cues.push(`${index}\n${t(cursor)} --> ${t(total)}\nPrelude — one card, one tap, one receipt.\n`)
  return cues.join('\n')
}

// ── record ──────────────────────────────────────────────────────────────────
rmSync(WORK, { recursive: true, force: true })
mkdirSync(WORK, { recursive: true })
mkdirSync(join(WORK, 'video'), { recursive: true })
mkdirSync(resolve(OUT, '..'), { recursive: true })

console.log(`base:    ${BASE}`)
console.log(`voice:   ${VOICE}`)
console.log(`out:     ${OUT}`)

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text'],
})

const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: join(WORK, 'video'), size: { width: W, height: H } },
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
})
const page = await context.newPage()

// Drive the recording on a wall clock, not on fixed sleeps. Navigation time
// varies (networkidle, cold CDN), so `waitForTimeout(sceneLength)` accumulates
// drift and by the third scene the picture is showing the wrong page for the
// narration. Each scene therefore ends at its scheduled offset from the moment
// recording started.
const startedAt = Date.now()
let scheduled = 0

for (const scene of SCENES) {
  const sceneStart = scheduled
  scheduled += scene.seconds * 1000
  process.stdout.write(`[${scene.id}] ${scene.seconds}s @ ${(sceneStart / 1000).toFixed(1)}s … `)

  await page.goto(BASE + scene.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(500)

  const elapsed = Date.now() - startedAt
  const remaining = sceneStart + scene.seconds * 1000 - elapsed
  if (remaining > 400) await scene.act(page, remaining)
  else console.log('(late, skipped interaction)')

  // Hold until the scheduled boundary, absorbing any overshoot.
  const wait = sceneStart + scene.seconds * 1000 - (Date.now() - startedAt)
  if (wait > 0) await page.waitForTimeout(wait)
  console.log('done')
}

await context.close()
await browser.close()

const { readdirSync, statSync } = await import('node:fs')
const recorded = readdirSync(join(WORK, 'video')).filter((f) => f.endsWith('.webm'))
if (recorded.length === 0) {
  console.error('no recording produced')
  process.exit(1)
}
const webm = join(WORK, 'video', recorded[0])
console.log(`recorded: ${(statSync(webm).size / 1e6).toFixed(1)} MB`)

// Title and end cards, rendered in the same browser engine.
const cardBrowser = await chromium.launch({ executablePath: CHROME, headless: true })
await renderCard(cardBrowser, TITLE_HTML, join(WORK, 'title.png'))
await renderCard(cardBrowser, END_HTML, join(WORK, 'end.png'))
await cardBrowser.close()

// The recording runs long/short by fractions; trim or pad it to the narration's
// exact length so the captions and the voice stay locked together.
const narrationSeconds = Number(
  execFileSync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    VOICE,
  ])
    .toString()
    .trim(),
)
const scenesSeconds = SCENES.reduce((sum, s) => sum + s.seconds, 0)
const targetSeconds = Math.min(narrationSeconds, scenesSeconds + 0.6)
const totalSeconds = TITLE_S + targetSeconds + END_S
console.log(`narration ${narrationSeconds.toFixed(1)}s · picture ${totalSeconds.toFixed(1)}s`)

const captions = join(WORK, 'captions.srt')
writeFileSync(captions, srt(SCENES, TITLE_S, totalSeconds), 'utf8')

const fontFile = 'C\\:/Windows/Fonts/arialbd.ttf'
// A dark band behind the captions, because a caption that lands on white text is
// unreadable no matter how large the font is. Fades in and out for polish.
const filter = [
  `[1:v]trim=0:${targetSeconds.toFixed(2)},setpts=PTS-STARTPTS,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x050807,setsar=1,fps=30[v]`,
  `[0:v]scale=${W}:${H},setsar=1,fps=30[t0]`,
  `[2:v]scale=${W}:${H},setsar=1,fps=30[t1]`,
  `[t0][v][t1]concat=n=3:v=1:a=0,drawbox=x=0:y=${H - 250}:w=${W}:h=250:color=0x040706@0.88:t=fill[band]`,
  `[band]subtitles='${captions.replace(/\\/g, '/').replace(':', '\\:')}':force_style='FontName=Arial,FontSize=27,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&HC0000000,BorderStyle=1,Outline=2.2,Shadow=1,MarginV=52'[sub]`,
  `[sub]fade=t=in:st=0:d=0.5,fade=t=out:st=${(totalSeconds - 0.6).toFixed(2)}:d=0.6[vout]`,
].join(';')

const audioFilter = `adelay=${Math.round(TITLE_S * 1000)}|${Math.round(TITLE_S * 1000)},apad=pad_dur=${END_S + 1}`

const ffArgs = [
  '-y',
  '-loop', '1', '-t', String(TITLE_S), '-i', join(WORK, 'title.png'),
  '-i', webm,
  '-loop', '1', '-t', String(END_S), '-i', join(WORK, 'end.png'),
  '-i', VOICE,
  '-filter_complex', `${filter};[3:a]${audioFilter}[aout]`,
  '-map', '[vout]',
  '-map', '[aout]',
  '-t', String(totalSeconds),
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '20',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '128k',
  '-movflags', '+faststart',
  OUT,
]

console.log('muxing …')
execFileSync('ffmpeg', ffArgs, { stdio: ['ignore', 'ignore', 'inherit'] })

const size = (await import('node:fs')).statSync(OUT).size
const duration = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', OUT])
    .toString()
    .trim(),
)
console.log(`\nwrote ${OUT} — ${duration.toFixed(1)}s, ${(size / 1e6).toFixed(1)} MB`)
