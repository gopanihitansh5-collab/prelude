// End-to-end test of the SHIPPED artifact, not the dev server.
//
// The .ehpk contains `dist/index.html` and its chunks, loaded by the Even app's
// WebView from a file path — an opaque (`null`) origin. That is a different
// world from `npm run dev`: the baked-in NEXT_PUBLIC_API_BASE is a cross-origin
// https host, and the request only succeeds if the server answers with
// `Access-Control-Allow-Origin: null`.
//
//   node scripts/plugin-e2e.mjs [dist/index.html]
//
// It loads the packaged page over file:// in headless Chrome, then reports what
// the page rendered, which API calls it made and whether they were allowed.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const entry = resolve(process.argv[2] ?? 'dist/index.html')
if (!existsSync(entry)) {
  console.error(`not found: ${entry} — run \`npm run build:plugin\` first`)
  process.exit(2)
}

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p))
if (!CHROME) {
  console.error('No Chrome or Edge found')
  process.exit(2)
}

// What the bundle baked in at build time — the origin the plugin will call.
const html = readFileSync(entry, 'utf8')
const chunkDir = join(entry, '..', '_next', 'static', 'chunks')
let bakedOrigin = null
if (existsSync(chunkDir)) {
  for (const file of (await import('node:fs')).readdirSync(chunkDir)) {
    const text = readFileSync(join(chunkDir, file), 'utf8')
    const match = text.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/)
    if (match) {
      bakedOrigin = match[0]
      break
    }
  }
}
console.log(`entry:        ${entry}`)
console.log(`baked origin: ${bakedOrigin ?? '(none — same-origin/fixtures)'}`)

const OUT = join(tmpdir(), 'prelude-plugin-e2e')
mkdirSync(OUT, { recursive: true })
const PORT = 9733 + Math.floor(Math.random() * 200)

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
const events = { requests: [], failed: [], responses: [], console: [], exceptions: [] }
// loadingFailed carries only a requestId, so the URL has to be remembered.
const byRequestId = new Map()

function send(method, params = {}, sessionId) {
  const id = nextId++
  const payload = { id, method, params }
  if (sessionId) payload.sessionId = sessionId
  ws.send(JSON.stringify(payload))
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`${method} timed out`))
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
  throw new Error('Chrome DevTools endpoint never came up')
}

try {
  ws = new WebSocket(await connect())
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = (e) => reject(new Error(`ws error ${e.message ?? ''}`))
  })
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
      return
    }
    switch (msg.method) {
      case 'Network.requestWillBeSent':
        byRequestId.set(msg.params.requestId, msg.params.request.url)
        events.requests.push({ url: msg.params.request.url, method: msg.params.request.method })
        break
      case 'Network.loadingFailed':
        events.failed.push({
          url: byRequestId.get(msg.params.requestId) ?? '(unknown)',
          error: msg.params.errorText,
        })
        break
      case 'Network.responseReceived':
        events.responses.push({ url: msg.params.response.url, status: msg.params.response.status })
        break
      case 'Runtime.consoleAPICalled':
        if (msg.params.type === 'error' || msg.params.type === 'warning' || msg.params.type === 'info') {
          events.console.push({
            type: msg.params.type,
            text: msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 220),
          })
        }
        break
      case 'Runtime.exceptionThrown':
        events.exceptions.push(msg.params.exceptionDetails.exception?.description?.slice(0, 220) ?? 'exception')
        break
      default:
        break
    }
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)
  await send('Network.enable', {}, sessionId)

  await send('Page.navigate', { url: pathToFileURL(entry).href }, sessionId)
  await sleep(6000)

  const { result } = await send(
    'Runtime.evaluate',
    {
      returnByValue: true,
      expression: `(() => {
        const text = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
        return {
          title: document.title,
          textLength: text.length,
          text: text.slice(0, 400),
          canvases: document.querySelectorAll('canvas').length,
          buttons: document.querySelectorAll('button, [role=button]').length,
          origin: location.origin,
        }
      })()`,
    },
    sessionId,
  )
  const page = result.value

  const api = events.responses.filter((r) => /\/api\//.test(r.url))
  const external = events.responses.filter((r) => /^https?:/.test(r.url))

  console.log(`origin:       ${page.origin}`)
  console.log(`title:        ${page.title}`)
  console.log(`rendered text: ${page.textLength} chars`)
  if (page.text) console.log(`  "${page.text}"`)

  console.log(`\nrequests:     ${events.requests.length} (external ${external.length}, api ${api.length})`)
  for (const r of api) console.log(`  api ${r.status} ${r.url}`)
  for (const r of external.slice(0, 8)) console.log(`  ext ${r.status} ${r.url}`)

  const hardFailures = events.failed.filter((f) => !/ERR_ABORTED/.test(f.error))
  for (const f of hardFailures) console.log(`  FAILED ${f.error} ${f.url}`)
  for (const e of events.exceptions) console.log(`  EXCEPTION ${e}`)
  for (const c of events.console.slice(0, 8)) console.log(`  console.${c.type}: ${c.text}`)

  const checks = [
    ['page rendered content', page.textLength > 20],
    ['no uncaught exception', events.exceptions.length === 0],
    ['no failed request', hardFailures.length === 0],
    [
      'API reachable from the packaged page',
      bakedOrigin === null || api.some((r) => r.status >= 200 && r.status < 400),
    ],
  ]
  console.log('')
  let ok = true
  for (const [label, pass] of checks) {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`)
    if (!pass) ok = false
  }
  process.exitCode = ok ? 0 : 1
} finally {
  try {
    ws?.close()
  } catch {
    // ignore
  }
  chrome.kill()
}
