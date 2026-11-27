// Landing-page layout verification over Chrome DevTools Protocol.
//
// Headless `--screenshot --window-size` is not device emulation: it can clip a
// page that renders fine in a real phone viewport. This script drives Chrome
// with Page/Emulation domains so the measurements are the ones a browser makes.
//
// Usage: node scripts/layout-check.mjs [url] [widths...]

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_TO_CHECK = process.argv[2] ?? 'http://localhost:5199/'
const WIDTHS = process.argv.slice(3).map(Number).filter(Boolean)
const VIEWPORTS = WIDTHS.length
  ? WIDTHS.map((w) => ({ width: w, height: w < 500 ? 844 : 900, mobile: w < 500 }))
  : [
      { width: 390, height: 844, mobile: true },
      { width: 320, height: 568, mobile: true },
      { width: 768, height: 1024, mobile: true },
      { width: 1440, height: 900, mobile: false },
    ]

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p))

if (!CHROME) {
  console.error('No Chrome or Edge found')
  process.exit(2)
}

const OUT = join(tmpdir(), 'prelude-layout')
mkdirSync(OUT, { recursive: true })

const PORT = 9333 + Math.floor(Math.random() * 200)
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
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

const EVAL = `(() => {
  const docEl = document.documentElement
  // Compare against the width we asked for, not window.innerWidth. Under mobile
  // emulation Chrome widens the layout viewport when the page overflows, so
  // innerWidth can lie by exactly the amount of the bug.
  const vw = window.__expectedWidth || window.innerWidth

  // An element that pokes past the viewport but sits inside an ancestor with
  // overflow:hidden is clipped by design — it cannot make the page scroll and
  // the user never sees it. Only visible overflow is a layout bug.
  const isClippedByAncestor = (el) => {
    let node = el.parentElement
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node)
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const r = node.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) return node
      }
      node = node.parentElement
    }
    return null
  }

  const offenders = []
  const clipped = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    const overflowRight = Math.round(r.right - vw)
    const overflowLeft = Math.round(-r.left)
    const over = Math.max(overflowRight, overflowLeft)
    if (over <= 1) continue
    const entry = {
      tag: el.tagName.toLowerCase(),
      cls: (el.className && el.className.toString().slice(0, 60)) || '',
      text: (el.textContent || '').trim().slice(0, 40),
      right: Math.round(r.right),
      left: Math.round(r.left),
      over,
    }
    const clipper = isClippedByAncestor(el)
    if (clipper) {
      entry.clippedBy = clipper.className ? '.' + clipper.className.toString().split(' ')[0] : clipper.tagName.toLowerCase()
      clipped.push(entry)
    } else {
      offenders.push(entry)
    }
  }
  offenders.sort((a, b) => b.over - a.over)
  clipped.sort((a, b) => b.over - a.over)

  return {
    viewport: vw,
    innerWidth: window.innerWidth,
    layoutViewportExpanded: window.innerWidth - vw,
    scrollWidth: docEl.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    horizontalOverflow: docEl.scrollWidth - vw,
    offenders: offenders.slice(0, 8),
    clipped: clipped.slice(0, 5),
    headline: (() => {
      const h = document.querySelector('h1')
      if (!h) return null
      const r = h.getBoundingClientRect()
      return { text: h.textContent.trim().slice(0, 40), width: Math.round(r.width), right: Math.round(r.right), fontSize: getComputedStyle(h).fontSize }
    })(),
    page: (() => {
      const sections = [...document.querySelectorAll('section, header, footer')].map((s) => ({
        tag: s.tagName.toLowerCase(),
        id: s.id || null,
        cls: (s.className || '').toString().split(' ')[0] || null,
        height: Math.round(s.getBoundingClientRect().height),
      }))
      return {
        title: document.title,
        scrollHeight: docEl.scrollHeight,
        bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
        sections: sections.filter((s) => s.height > 0),
      }
    })(),
  }
})()`

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
    }
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)

  let failures = 0
  for (const vp of VIEWPORTS) {
    await send(
      'Emulation.setDeviceMetricsOverride',
      {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
        screenWidth: vp.width,
        screenHeight: vp.height,
      },
      sessionId,
    )
    await send('Page.navigate', { url: URL_TO_CHECK }, sessionId)
    await sleep(2500)
    await send(
      'Runtime.evaluate',
      { expression: `window.__expectedWidth = ${vp.width}` },
      sessionId,
    )

    const { result } = await send(
      'Runtime.evaluate',
      { expression: EVAL, returnByValue: true, awaitPromise: false },
      sessionId,
    )
    const data = result.value

    const bad =
      data.horizontalOverflow > 0 ||
      data.offenders.length > 0 ||
      data.layoutViewportExpanded > 1
    if (bad) failures++
    console.log(
      `${bad ? 'FAIL' : 'PASS'} ${vp.width}x${vp.height}  scrollWidth=${data.scrollWidth} innerWidth=${data.innerWidth} overflow=${data.horizontalOverflow}${
        data.layoutViewportExpanded > 1
          ? `  layoutViewportExpanded=+${data.layoutViewportExpanded}px`
          : ''
      }`,
    )
    if (data.headline) {
      console.log(
        `      h1 width=${data.headline.width} right=${data.headline.right} font=${data.headline.fontSize} — "${data.headline.text}"`,
      )
    }
    for (const o of data.offenders) {
      console.log(`      over=${o.over}px  <${o.tag} class="${o.cls}"> "${o.text}"`)
    }
    if (data.clipped.length) {
      const worst = data.clipped[0]
      console.log(
        `      clipped by an overflow:hidden ancestor (expected for 3D labels): ${data.clipped.length}, worst over=${worst.over}px <${worst.tag}> "${worst.text}"`,
      )
    }
    console.log(
      `      page: ${data.page.sections.length} sections, scrollHeight=${data.page.scrollHeight}, text=${data.page.bodyText} chars`,
    )

    // The earlier "clipped" screenshot was most likely captured mid-animation.
    // Sweep the page top-to-bottom and re-measure at every stop.
    const stops = 6
    let scrollFails = 0
    for (let i = 0; i <= stops; i++) {
      const y = Math.round(((data.page.scrollHeight - vp.height) * i) / stops)
      await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` }, sessionId)
      await sleep(700)
      const { result: scrolled } = await send(
        'Runtime.evaluate',
        { expression: EVAL, returnByValue: true },
        sessionId,
      )
      const s = scrolled.value
      if (s.horizontalOverflow > 0 || s.offenders.length > 0 || s.layoutViewportExpanded > 1) {
        scrollFails++
        console.log(
          `      FAIL at scrollY=${y}: overflow=${s.horizontalOverflow} expanded=+${s.layoutViewportExpanded}px`,
        )
        for (const o of s.offenders.slice(0, 4)) {
          console.log(`        over=${o.over}px <${o.tag} class="${o.cls}"> "${o.text}"`)
        }
      }
      for (const c of s.clipped.slice(0, 2)) {
        if (c.over > 12) {
          console.log(`      note at scrollY=${y}: label clipped ${c.over}px by ${c.clippedBy} — "${c.text}"`)
        }
      }
    }
    if (scrollFails === 0) {
      console.log(`      scroll sweep: ${stops + 1} stops, no horizontal overflow`)
    } else {
      failures++
    }
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' }, sessionId)
    await sleep(400)
    const shot = await send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: false },
      sessionId,
    )
    const file = join(OUT, `landing-${vp.width}x${vp.height}.png`)
    writeFileSync(file, Buffer.from(shot.data, 'base64'))
    console.log(`      shot: ${file}`)
  }
  console.log(failures === 0 ? 'ALL VIEWPORTS PASS' : `${failures} VIEWPORT(S) FAILED`)
  process.exitCode = failures === 0 ? 0 : 1
} finally {
  try {
    ws?.close()
  } catch {
    // ignore
  }
  chrome.kill()
}
