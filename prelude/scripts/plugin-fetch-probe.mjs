// Why does the packaged page's fetch fail? Answer it in the page, not by guessing.
//
// Loads dist/index.html twice — once over file:// (the .ehpk's real scheme) and
// once over http://localhost (a permissive origin) — and in each case performs
// the same fetch the app performs, capturing the exact thrown error and the
// response headers the server returned.
//
//   node scripts/plugin-fetch-probe.mjs

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const entry = resolve('dist/index.html')
if (!existsSync(entry)) {
  console.error('dist/index.html missing — run `npm run build:plugin`')
  process.exit(2)
}

const BACKEND = 'https://prelude-green.vercel.app'
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p))
if (!CHROME) {
  console.error('No Chrome or Edge found')
  process.exit(2)
}

// A tiny static server for the "http origin" half of the experiment.
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.json': 'application/json',
}
const distRoot = resolve('dist')
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = join(distRoot, path)
  if (path.endsWith('/')) file = join(file, 'index.html')
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const httpOrigin = `http://127.0.0.1:${server.address().port}`

const OUT = join(tmpdir(), 'prelude-fetch-probe')
mkdirSync(OUT, { recursive: true })
const PORT = 9933 + Math.floor(Math.random() * 200)

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(OUT, 'profile')}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let ws
let nextId = 1
const pending = new Map()

function send(method, params = {}, sessionId) {
  const id = nextId++
  const payload = { id, method, params }
  if (sessionId) payload.sessionId = sessionId
  ws.send(JSON.stringify(payload))
  return new Promise((res, rej) => {
    pending.set(id, { resolve: res, reject: rej })
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        rej(new Error(`${method} timed out`))
      }
    }, 30000)
  })
}

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return (await res.json()).webSocketDebuggerUrl
    } catch {
      // not up yet
    }
    await sleep(200)
  }
  throw new Error('Chrome never came up')
}

const PROBE = `(async () => {
  const out = { origin: location.origin, fetch: null }
  try {
    const res = await fetch('${BACKEND}/api/briefs', { cache: 'no-store' })
    let meetings = null
    try {
      const body = await res.json()
      meetings = Array.isArray(body.meetings) ? body.meetings.length : null
    } catch {
      meetings = 'not-json'
    }
    out.fetch = {
      ok: true,
      status: res.status,
      acao: res.headers.get('access-control-allow-origin'),
      meetings,
    }
  } catch (error) {
    out.fetch = { ok: false, error: String(error && error.message ? error.message : error) }
  }
  return out
})()`

try {
  ws = new WebSocket(await connect())
  await new Promise((r, j) => {
    ws.onopen = r
    ws.onerror = () => j(new Error('ws error'))
  })
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else res(msg.result)
    }
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)

  const cases = [
    ['file:// (the .ehpk scheme)', pathToFileURL(entry).href],
    ['http://127.0.0.1 (permissive origin)', `${httpOrigin}/index.html`],
  ]

  for (const [label, url] of cases) {
    await send('Page.navigate', { url }, sessionId)
    await sleep(3000)
    const { result } = await send(
      'Runtime.evaluate',
      { expression: PROBE, awaitPromise: true, returnByValue: true },
      sessionId,
    )
    const value = result.value
    console.log(`\n${label}`)
    console.log(`  origin:  ${value.origin}`)
    if (value.fetch?.ok) {
      console.log(`  fetch:   200 ok, status ${value.fetch.status}, acao ${value.fetch.acao}, meetings ${value.fetch.meetings}`)
    } else {
      console.log(`  fetch:   FAILED — ${value.fetch?.error}`)
    }
  }
} finally {
  try {
    ws?.close()
  } catch {
    // ignore
  }
  chrome.kill()
  server.close()
}
