// Route probe: load a page in headless Chrome over CDP and report what the
// browser actually requested, what failed, and what the console said.
//
//   node scripts/route-probe.mjs http://localhost:5173/lens [more urls...]
//
// It exists because a page can look fine while quietly falling back to fixtures:
// a cross-origin fetch that CORS blocks is a failed request, not a visible error.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URLS = process.argv.slice(2)
if (URLS.length === 0) {
  console.error('usage: node scripts/route-probe.mjs <url> [url...]')
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

const OUT = join(tmpdir(), 'prelude-probe')
mkdirSync(OUT, { recursive: true })
const PORT = 9533 + Math.floor(Math.random() * 200)

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(OUT, 'profile')}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let ws
let nextId = 1
const pending = new Map()
const events = { failed: [], responses: [], console: [], exceptions: [] }

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

function reset() {
  events.failed.length = 0
  events.responses.length = 0
  events.console.length = 0
  events.exceptions.length = 0
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
      case 'Network.loadingFailed':
        events.failed.push({
          url: msg.params.url ?? '(unknown)',
          error: msg.params.errorText,
          type: msg.params.type,
        })
        break
      case 'Network.requestWillBeSent':
        events.responses.push({ url: msg.params.request.url, status: null })
        break
      case 'Network.responseReceived':
        for (const r of events.responses) {
          if (r.url === msg.params.response.url && r.status === null) {
            r.status = msg.params.response.status
          }
        }
        break
      case 'Runtime.consoleAPICalled':
        if (msg.params.type === 'error' || msg.params.type === 'warning') {
          events.console.push({
            type: msg.params.type,
            text: msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '),
          })
        }
        break
      case 'Runtime.exceptionThrown':
        events.exceptions.push({
          text: msg.params.exceptionDetails.text,
          detail: msg.params.exceptionDetails.exception?.description ?? '',
        })
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
  await send('Log.enable', {}, sessionId)

  let failures = 0
  for (const url of URLS) {
    reset()
    await send('Page.navigate', { url }, sessionId)
    await sleep(4000)

    const bad = events.failed.filter((f) => !/ERR_ABORTED/.test(f.error))
    const errored = events.responses.filter((r) => r.status !== null && r.status >= 400)
    const api = events.responses.filter((r) => r.url.includes('/api/'))
    const problems = bad.length + errored.length + events.exceptions.length
    if (problems > 0) failures++

    console.log(`${problems === 0 ? 'PASS' : 'FAIL'} ${url}`)
    console.log(`      requests=${events.responses.length} api=${api.length}`)
    for (const r of api) console.log(`      api ${r.status ?? 'pending'} ${r.url}`)
    for (const f of bad) console.log(`      FAILED ${f.error} ${f.type} ${f.url}`)
    for (const r of errored) console.log(`      HTTP ${r.status} ${r.url}`)
    for (const e of events.exceptions) console.log(`      EXCEPTION ${e.text} ${e.detail.slice(0, 120)}`)
    for (const c of events.console.slice(0, 4)) console.log(`      console.${c.type}: ${c.text.slice(0, 140)}`)
  }

  console.log(failures === 0 ? 'ALL ROUTES CLEAN' : `${failures} ROUTE(S) WITH FAILURES`)
  process.exitCode = failures === 0 ? 0 : 1
} finally {
  try {
    ws?.close()
  } catch {
    // ignore
  }
  chrome.kill()
}
