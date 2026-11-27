// One command that proves the submission is what it claims.
//
// The project has several independent checks (typecheck, tests, live routes, the
// write path, the packaged bundle, responsive layout, secrets, manifest). Run
// them from one place, in order, and write the results to docs/VERIFICATION.md —
// so "works end to end" is a table with evidence rather than a sentence.
//
//   node scripts/verify-all.mjs            # everything
//   node scripts/verify-all.mjs --quick    # skip the slow browser passes
//
// Exit code is non-zero if any check fails.

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const QUICK = process.argv.includes('--quick')
const BASE = process.env.PRELUDE_BASE ?? 'https://prelude-green.vercel.app'
const results = []

function record(name, ok, evidence) {
  results.push({ name, ok, evidence: String(evidence).replace(/\s+/g, ' ').trim().slice(0, 300) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(38)} ${String(evidence).replace(/\s+/g, ' ').slice(0, 110)}`)
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: true, ...opts })
}

// ── 1. typecheck ────────────────────────────────────────────────────────────
{
  const r = run('npx', ['tsc', '--noEmit'])
  record('typecheck (tsc --noEmit)', r.status === 0, r.status === 0 ? 'clean' : (r.stdout + r.stderr).slice(0, 200))
}

// ── 2. tests ────────────────────────────────────────────────────────────────
{
  const r = run('npx', ['vitest', 'run', '--reporter=default'])
  const out = (r.stdout ?? '') + (r.stderr ?? '')
  const files = out.match(/Test Files\s+(\d+) passed/)
  const tests = out.match(/Tests\s+(\d+) passed/)
  record(
    'unit tests',
    r.status === 0 && Boolean(tests),
    tests ? `${tests[1]} tests in ${files?.[1] ?? '?'} files` : 'no summary parsed',
  )
}

// ── 3. live routes ──────────────────────────────────────────────────────────
{
  const routes = [
    '/',
    '/lens',
    '/dashboard',
    '/actions',
    '/followups',
    '/memory',
    '/connections',
    '/settings',
    '/api/health',
    '/api/briefs',
    '/api/followups',
    '/api/actions',
    '/api/memory?q=enterprise+pricing',
  ]
  const bad = []
  for (const route of routes) {
    try {
      const res = await fetch(BASE + route, { cache: 'no-store' })
      if (res.status !== 200) bad.push(`${route}:${res.status}`)
    } catch (error) {
      bad.push(`${route}:${error.message}`)
    }
  }
  record('live routes respond 200', bad.length === 0, bad.length ? bad.join(' ') : `${routes.length} routes`)
}

// ── 4. the write path, and its idempotency ─────────────────────────────────
{
  const text = `verify-all ${new Date().toISOString()}`
  const body = JSON.stringify({ meetingId: 'm-pricing', action: 'reply', text, confirmed: true })
  const post = () =>
    fetch(`${BASE}/api/act`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }).then(async (r) => ({ status: r.status, text: await r.text() }))

  const first = await post()
  const parsed = (() => {
    try {
      return JSON.parse(first.text)
    } catch {
      return {}
    }
  })()
  record(
    'write reaches a provider',
    first.status === 200 && parsed.status === 'receipt_persisted' && Boolean(parsed.providerReference),
    `${first.status} ${parsed.status ?? ''} ${parsed.providerReference ?? ''}`,
  )

  const second = await post()
  record('retry returns the same receipt', second.text === first.text, second.text === first.text ? 'byte-identical' : 'DIFFERENT')

  const agenda = await fetch(`${BASE}/api/act`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ meetingId: 'm-pricing', action: 'agenda', confirmed: true }),
  }).then(async (r) => ({ status: r.status, text: await r.text() }))
  const agendaBody = (() => {
    try {
      return JSON.parse(agenda.text)
    } catch {
      return {}
    }
  })()
  record(
    'a read is refused as a write',
    agendaBody.ok === false && /read, not a write/.test(agendaBody.error ?? ''),
    agendaBody.error ?? agenda.status,
  )
}

// ── 5. manifest vs what the bundle requests ────────────────────────────────
{
  const app = JSON.parse(readFileSync('app.json', 'utf8'))
  const net = (app.permissions ?? []).find((p) => p.name === 'network')
  const whitelist = net?.whitelist ?? []
  const chunks = 'dist/_next/static/chunks'
  let baked = []
  try {
    const { readdirSync } = await import('node:fs')
    const origins = new Set()
    for (const file of readdirSync(chunks)) {
      const text = readFileSync(join(chunks, file), 'utf8')
      for (const m of text.matchAll(/https:\/\/[a-z0-9.-]+\.vercel\.app/g)) origins.add(m[0])
    }
    baked = [...origins]
  } catch {
    baked = []
  }
  const covered = baked.length === 0 || baked.every((o) => whitelist.includes(o))
  record('manifest whitelists the baked origin', covered, `${whitelist.join(',')} vs ${baked.join(',') || '(none)'}`)
  record(
    'manifest name rules',
    /^[A-Za-z0-9 '&.-]{1,20}$/.test(app.name ?? '') && !/even/i.test(app.name ?? ''),
    `${app.name} / ${app.package_id} / sdk ${app.min_sdk_version}`,
  )
}

// ── 6. secrets ─────────────────────────────────────────────────────────────
{
  const pattern = 'AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|vcp_[A-Za-z0-9]{20,}|npg_[A-Za-z0-9]{10,}|re_[A-Za-z0-9_]{20,}|postgres(ql)?://[^:\\s]+:[^@\\s]+@'
  const r = run('git', ['grep', '-nEI', pattern, 'HEAD', '--', '.', ':!*.lock'])
  const hits = (r.stdout ?? '').trim()
  record('no secrets in the public tree', hits.length === 0, hits ? hits.split('\n').length + ' matches' : 'clean')
}

// ── 7. browser passes ──────────────────────────────────────────────────────
if (!QUICK) {
  {
    const r = run('node', ['scripts/layout-check.mjs', `${BASE}/`, '390', '1440'])
    record('responsive layout sweep', r.status === 0, (r.stdout ?? '').trim().split('\n').pop() ?? 'no output')
  }
  {
    const r = run('node', ['scripts/plugin-e2e.mjs'])
    const out = (r.stdout ?? '').trim()
    record('packaged bundle reaches the API', r.status === 0 && /PASS API reachable/.test(out), out.split('\n').pop() ?? 'no output')
  }
}

// ── report ─────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok)
const now = new Date()
const lines = [
  '# VERIFICATION',
  '',
  `Generated by \`node scripts/verify-all.mjs\` on **${now.toISOString().slice(0, 16).replace('T', ' ')} UTC** against`,
  `<${BASE}> and the packaged bundle in \`dist/\`.`,
  '',
  failed.length === 0 ? '**All checks pass.**' : `**${failed.length} check(s) failed.**`,
  '',
  '| Check | Result | Evidence |',
  '|---|---|---|',
  ...results.map((r) => `| ${r.name} | ${r.ok ? 'pass' : '**FAIL**'} | ${r.evidence.replace(/\|/g, '\\|')} |`),
  '',
  '## What is not covered here',
  '',
  '- **Physical G2 hardware.** Everything above ran in the simulator and the browser mirror; the BLE write path',
  '  itself is only exercised by the SDK. The 5-minute locked-phone test needs the shipped beta build.',
  '- **A real Notion workspace.** The read path falls back to fixtures without a token, and those fixtures are',
  '  what the checks above see in `demo` mode.',
  '- **Concurrency.** Idempotency is verified for a retried request, not for two simultaneous ones.',
  '',
]

mkdirSync('docs', { recursive: true })
writeFileSync(join('docs', 'VERIFICATION.md'), lines.join('\n'))
console.log(`\n${failed.length === 0 ? 'ALL CHECKS PASS' : failed.length + ' CHECK(S) FAILED'} — wrote docs/VERIFICATION.md`)
process.exitCode = failed.length === 0 ? 0 : 1
