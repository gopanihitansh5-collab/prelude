import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The architecture test.
 *
 * ARCHITECTURE.md states one rule above all others: `src/core/` imports nothing
 * from `src/even/`, `src/lib/`, or `app/`. That rule is what makes the core
 * testable in plain Node and what makes the display budget provable.
 *
 * A rule that is only written down is a rule that will be broken. This test
 * reads the actual source and fails if the arrow ever points outward.
 */

const ROOT = join(process.cwd(), 'src')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full)
  }
  return out
}

/** Every import specifier in a file, from `import ... from '...'` and `import('...')`. */
function importsOf(source: string): string[] {
  const specifiers: string[] = []
  const staticImport = /(?:^|\n)\s*import\s+(?:type\s+)?[^'"]*from\s+['"]([^'"]+)['"]/g
  const dynamicImport = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const re of [staticImport, dynamicImport]) {
    let match: RegExpExecArray | null
    while ((match = re.exec(source)) !== null) {
      if (match[1]) specifiers.push(match[1])
    }
  }
  return specifiers
}

describe('architecture: src/core imports nothing outward', () => {
  const coreFiles = walk(join(ROOT, 'core'))

  it('finds the core files', () => {
    expect(coreFiles.length).toBeGreaterThan(5)
  })

  it('never imports from src/even, src/lib, src/ui, or app', () => {
    const violations: string[] = []

    for (const file of coreFiles) {
      const source = readFileSync(file, 'utf8')
      for (const specifier of importsOf(source)) {
        const outward =
          specifier.includes('/even/') ||
          specifier.includes('/lib/') ||
          specifier.includes('/ui/') ||
          specifier.startsWith('@/even') ||
          specifier.startsWith('@/lib') ||
          specifier.startsWith('@/ui') ||
          specifier.startsWith('@/app') ||
          specifier.startsWith('next/') ||
          specifier.startsWith('react')

        if (outward) {
          violations.push(`${file.replace(ROOT, 'src')} imports "${specifier}"`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('never imports the Even Hub SDK', () => {
    const violations: string[] = []
    for (const file of coreFiles) {
      const source = readFileSync(file, 'utf8')
      for (const specifier of importsOf(source)) {
        if (specifier.includes('@evenrealities')) {
          violations.push(`${file.replace(ROOT, 'src')} imports "${specifier}"`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('never touches the DOM or the network', () => {
    const violations: string[] = []
    for (const file of coreFiles) {
      const source = readFileSync(file, 'utf8')
      // `fetch(` and `document.` are the two things that would make the core
      // untestable in plain Node.
      if (/\bfetch\s*\(/.test(source)) violations.push(`${file.replace(ROOT, 'src')} calls fetch()`)
      if (/\bdocument\./.test(source)) violations.push(`${file.replace(ROOT, 'src')} uses document`)
      if (/\bwindow\./.test(source)) violations.push(`${file.replace(ROOT, 'src')} uses window`)
    }
    expect(violations).toEqual([])
  })
})

describe('architecture: only src/even imports the SDK', () => {
  it('confines @evenrealities to src/even', () => {
    const allFiles = walk(ROOT)
    const violations: string[] = []

    for (const file of allFiles) {
      if (file.includes(join('src', 'even'))) continue
      const source = readFileSync(file, 'utf8')
      for (const specifier of importsOf(source)) {
        if (specifier.includes('@evenrealities')) {
          violations.push(`${file.replace(ROOT, 'src')} imports "${specifier}"`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
