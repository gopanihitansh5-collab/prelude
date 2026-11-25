/**
 * Build the plugin bundle: a static export of just the lens, written to dist/.
 *
 * Why a script instead of `next build` directly: the plugin build must not
 * include the dashboard or the API routes, and it must set NEXT_PLUGIN=1 so
 * next.config.mjs switches pageExtensions to *.plugin.tsx. Doing it here keeps
 * the two targets one command each and makes the difference explicit.
 */
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

await rm(join(root, 'dist'), { recursive: true, force: true })
await rm(join(root, '.next'), { recursive: true, force: true })

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NEXT_PLUGIN: '1' },
  shell: process.platform === 'win32',
})

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\nplugin bundle written to dist/')
    console.log('next: evenhub pack app.json dist -o prelude.ehpk --sdk-ver 0.0.16')
  }
  process.exit(code ?? 1)
})
