import { describe, expect, it } from 'vitest'
import {
  canCancel,
  canTransitionVoice,
  initialVoice,
  mayExecute,
  transitionVoice,
  voiceLine,
} from '../src/core/voice.ts'

describe('the voice state machine', () => {
  it('starts idle', () => {
    expect(initialVoice().state).toBe('idle')
  })

  it('walks the happy path', () => {
    let s = initialVoice()
    for (const step of ['listening', 'transcribing', 'review', 'confirmed', 'executing', 'receipt'] as const) {
      const result = transitionVoice(s, step)
      expect(result.ok).toBe(true)
      s = result.session
    }
    expect(s.state).toBe('receipt')
  })

  it('requires REVIEW before CONFIRMED', () => {
    // The safety invariant: an LLM never executes from an unvalidated transcript.
    expect(canTransitionVoice('transcribing', 'confirmed')).toBe(false)
    expect(canTransitionVoice('transcribing', 'executing')).toBe(false)
  })

  it('never allows executing straight from listening', () => {
    expect(canTransitionVoice('listening', 'executing')).toBe(false)
  })

  it('allows cancellation from every in-flight state', () => {
    for (const state of ['listening', 'transcribing', 'review', 'confirmed'] as const) {
      expect(canTransitionVoice(state, 'cancelled')).toBe(true)
    }
  })

  it('reports whether the user can back out', () => {
    expect(canCancel({ state: 'review' })).toBe(true)
    expect(canCancel({ state: 'receipt' })).toBe(false)
  })

  it('refuses to execute without a proposal', () => {
    expect(mayExecute({ state: 'confirmed' })).toBe(false)
  })

  it('allows execution only when confirmed with a proposal', () => {
    expect(mayExecute({ state: 'confirmed', proposal: { action: 'reply', text: 'x' } })).toBe(true)
  })

  it('refuses execution from review', () => {
    expect(mayExecute({ state: 'review', proposal: { action: 'reply', text: 'x' } })).toBe(false)
  })

  it('carries the transcript and proposal through', () => {
    let s = transitionVoice(initialVoice(), 'listening').session
    s = transitionVoice(s, 'transcribing').session
    s = transitionVoice(s, 'review', {
      transcript: 'running five minutes late',
      proposal: { action: 'reply', text: 'running 5 late' },
    }).session
    expect(s.transcript).toBe('running five minutes late')
    expect(s.proposal?.action).toBe('reply')
  })

  it('records an error', () => {
    const s = transitionVoice(initialVoice(), 'listening').session
    const failed = transitionVoice(s, 'error', { error: 'mic unavailable' })
    expect(failed.session.error).toBe('mic unavailable')
  })

  it('refuses an illegal transition with a reason', () => {
    const result = transitionVoice(initialVoice(), 'executing')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('illegal voice transition')
  })
})

describe('voiceLine', () => {
  it('gives every state a visible line', () => {
    const states = [
      'idle',
      'listening',
      'transcribing',
      'review',
      'confirmed',
      'executing',
      'receipt',
      'cancelled',
      'error',
    ] as const
    for (const state of states) {
      expect(voiceLine({ state }).length).toBeGreaterThan(0)
    }
  })

  it('shows the error text when there is one', () => {
    expect(voiceLine({ state: 'error', error: 'mic unavailable' })).toBe('mic unavailable')
  })
})
