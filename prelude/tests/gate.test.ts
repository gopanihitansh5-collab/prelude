import { describe, expect, it } from 'vitest'
import { createGate, SWIPE_GATE_MS, TAP_GATE_MS } from '../src/even/gate.ts'

describe('createGate', () => {
  it('lets the first event through', () => {
    const gate = createGate(700)
    expect(gate(1000)).toBe(true)
  })

  it('blocks events inside the window', () => {
    const gate = createGate(700)
    gate(1000)
    expect(gate(1100)).toBe(false)
    expect(gate(1699)).toBe(false)
  })

  it('lets an event through once the window has passed', () => {
    const gate = createGate(700)
    gate(1000)
    expect(gate(1700)).toBe(true)
  })

  it('restarts the window on each accepted event', () => {
    const gate = createGate(700)
    expect(gate(0)).toBe(true)
    expect(gate(800)).toBe(true)
    expect(gate(1400)).toBe(false)
    expect(gate(1500)).toBe(true)
  })

  it('collapses a burst of scroll events into one', () => {
    // H12: one long swipe can arrive as several scroll events.
    const gate = createGate(SWIPE_GATE_MS)
    const burst = [0, 40, 90, 150, 220, 300, 380]
    const accepted = burst.filter((t) => gate(t))
    expect(accepted).toEqual([0])
  })

  it('collapses a fast double-tap into one tap', () => {
    // H11: quick repeated taps are read as a double tap, which exits on root.
    const gate = createGate(TAP_GATE_MS)
    const taps = [0, 120, 240]
    const accepted = taps.filter((t) => gate(t))
    expect(accepted).toEqual([0])
  })

  it('uses the documented windows', () => {
    expect(SWIPE_GATE_MS).toBe(700)
    expect(TAP_GATE_MS).toBe(350)
  })
})
