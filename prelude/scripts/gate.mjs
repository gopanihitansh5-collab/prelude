/**
 * The gate. One command that proves the claims in the README.
 *
 *   node scripts/gate.mjs
 *
 * Stages:
 *   1. typecheck   — tsc --noEmit
 *   2. test        — vitest run
 *   3. build       — next build (the deployable app)
 *   4. plugin      — NEXT_PLUGIN=1 next build (the .ehpk bundle)
 *   5. manifest    — validate app.json against the documented rules
 *
 * Every stage prints PASS or FAIL and the gate exits non-zero on the first
 * failure, so CI and a human get the same answer.
 */
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const isWindows = process.platform === 'win32'

function run(command, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(isWindows ? `${command}.cmd` : command, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...env },
      shell: isWindows,
    })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

const results = []

async function stage(name, fn) {
  process.stdout.write(`\n── ${name} ${'─'.repeat(Math.max(0, 56 - name.length))}\n`)
  const started = Date.now()
  const code = await fn()
  const ms = Date.now() - started
  results.push({ name, ok: code === 0, ms })
  console.log(`${code === 0 ? 'PASS' : 'FAIL'}  ${name}  (${ms} ms)`)
  return code === 0
}

// ── 5. manifest validation ──────────────────────────────────────────────────
// The rules are from the Even Hub packaging docs. A manifest that violates one
// is rejected at review, so it is cheaper to fail here.

async function validateManifest() {
  const raw = await readFile(join(root, 'app.json'), 'utf8')
  const manifest = JSON.parse(raw)
  const errors = []

  const id = manifest.package_id ?? ''
  if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(id)) {
    errors.push(`package_id "${id}" must be reverse-domain, lowercase, no hyphens, ≥2 segments`)
  }
  if (manifest.edition !== '202601') errors.push(`edition must be "202601", got "${manifest.edition}"`)
  if (!manifest.name || manifest.name.length > 20) errors.push('name must be ≤20 characters')
  if (/even/i.test(manifest.name ?? '')) errors.push('name must not contain "Even"')
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? '')) errors.push('version must be x.y.z')
  if (!manifest.min_sdk_version) errors.push('min_sdk_version is required')
  if (!manifest.entrypoint) errors.push('entrypoint is required')
  if (!Array.isArray(manifest.permissions)) errors.push('permissions must be an array of objects')

  for (const permission of manifest.permissions ?? []) {
    if (!permission.name) errors.push('every permission needs a name')
    if (!permission.desc || permission.desc.length < 1 || permission.desc.length > 300) {
      errors.push(`permission "${permission.name}" needs a desc of 1–300 characters`)
    }
    if (permission.name === 'network') {
      if (!Array.isArray(permission.whitelist) || permission.whitelist.length === 0) {
        errors.push('network permission needs a non-empty whitelist')
      }
      for (const origin of permission.whitelist ?? []) {
        if (!/^https?:\/\/[^/*]+$/.test(origin)) {
          errors.push(`whitelist entry "${origin}" must be a full origin, no wildcards`)
        }
      }
    }
  }

  const langs = manifest.supported_languages ?? []
  const allowed = ['en', 'de', 'fr', 'es', 'it', 'zh', 'ja', 'ko']
  for (const lang of langs) {
    if (!allowed.includes(lang)) errors.push(`unsupported language "${lang}"`)
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`  ✗ ${error}`)
    return 1
  }
  console.log(`  ✓ ${id} v${manifest.version} — ${manifest.permissions.length} permissions`)
  return 0
}

// ── run ────────────────────────────────────────────────────────────────────

const ok =
  (await stage('typecheck', () => run('npx', ['tsc', '--noEmit']))) &&
  (await stage('test', () => run('npx', ['vitest', 'run']))) &&
  (await stage('manifest', validateManifest)) &&
  // The plugin build runs FIRST and writes only to dist/. Running it after the
  // app build would leave .next/ holding a static export, and `next start`
  // would then serve a site with no API routes.
  (await stage('build (plugin)', () => run('npx', ['next', 'build'], { NEXT_PLUGIN: '1' }))) &&
  (await stage('build (app)', () => run('npx', ['next', 'build'])))

console.log('\n' + '═'.repeat(62))
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(20)} ${String(r.ms).padStart(6)} ms`)
}
console.log('═'.repeat(62))
console.log(ok ? 'GATE PASS' : 'GATE FAIL')
process.exit(ok ? 0 : 1)
