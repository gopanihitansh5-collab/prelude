// The host guard.
//
// `attach()` used to call createStartUpPageContainer unconditionally, which in a
// plain browser logged a red "createStartUpPageContainer failed: 1" on every
// load. The guard is only trustworthy if it keys off the same channel the SDK
// uses, so these tests pin that: no Flutter handler means no host.

import { afterEach, describe, expect, it } from 'vitest'
import { hasEvenHost } from '../src/even/bridge.ts'

const original = (globalThis as { window?: unknown }).window

afterEach(() => {
  if (original === undefined) {
    delete (globalThis as { window?: unknown }).window
  } else {
    ;(globalThis as { window?: unknown }).window = original
  }
})

function withWindow(value: unknown): void {
  ;(globalThis as { window?: unknown }).window = value
}

describe('hasEvenHost', () => {
  it('is false when there is no window at all (node)', () => {
    delete (globalThis as { window?: unknown }).window
    expect(hasEvenHost()).toBe(false)
  })

  it('is false in a browser with no Flutter handler', () => {
    withWindow({ location: { href: 'http://localhost:5173/lens' } })
    expect(hasEvenHost()).toBe(false)
  })

  it('is false when the handler exists but cannot post', () => {
    // A half-present object would make the SDK throw on postMessage instead of
    // failing cleanly, so it must not count as a host.
    withWindow({ flutter_inappwebview: {} })
    expect(hasEvenHost()).toBe(false)
  })

  it('is true inside the Even app WebView', () => {
    withWindow({ flutter_inappwebview: { callHandler: () => Promise.resolve() } })
    expect(hasEvenHost()).toBe(true)
  })
})
