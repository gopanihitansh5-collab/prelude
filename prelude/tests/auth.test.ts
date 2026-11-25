import { describe, expect, it } from 'vitest'
import { isConfirmed, requireActKey } from '../src/lib/auth.ts'

/**
 * The write endpoint's two safety rules.
 *
 * These are the rules that stop a caller from sending a message the user did
 * not confirm. They are pure functions so they can be tested without a server.
 */

function headers(values: Record<string, string> = {}): Headers {
  return new Headers(values)
}

describe('requireActKey', () => {
  it('allows everything when no key is configured', () => {
    // A local demo must work with zero setup.
    expect(requireActKey(headers(), {}).ok).toBe(true)
  })

  it('rejects a missing header when a key is configured', () => {
    const result = requireActKey(headers(), { PRELUDE_ACT_KEY: 'secret' })
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('missing')
  })

  it('rejects a wrong key', () => {
    const result = requireActKey(headers({ 'x-prelude-key': 'wrong' }), { PRELUDE_ACT_KEY: 'secret' })
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('invalid')
  })

  it('accepts the right key', () => {
    const result = requireActKey(headers({ 'x-prelude-key': 'secret' }), { PRELUDE_ACT_KEY: 'secret' })
    expect(result.ok).toBe(true)
  })

  it('treats a blank configured key as unset', () => {
    expect(requireActKey(headers(), { PRELUDE_ACT_KEY: '   ' }).ok).toBe(true)
  })
})

describe('isConfirmed', () => {
  it('accepts only literal true', () => {
    expect(isConfirmed(true)).toBe(true)
  })

  it('rejects an omitted field', () => {
    // The previous rule was `confirmed !== false`, which treated an omitted
    // field as confirmation. That contradicts the safety framing.
    expect(isConfirmed(undefined)).toBe(false)
  })

  it('rejects false', () => {
    expect(isConfirmed(false)).toBe(false)
  })

  it('rejects truthy non-booleans', () => {
    expect(isConfirmed('true')).toBe(false)
    expect(isConfirmed(1)).toBe(false)
    expect(isConfirmed({})).toBe(false)
  })
})
