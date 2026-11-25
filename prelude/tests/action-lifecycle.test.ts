import { describe, expect, it } from 'vitest'
import {
  afterExecution,
  buildReceipt,
  canTransition,
  createAction,
  idempotencyKey,
  isDelivered,
  isTerminal,
  transition,
  validateAction,
} from '../src/core/action-lifecycle.ts'
import type { ActionRecord } from '../src/core/action-lifecycle.ts'

const NOW = '2026-11-25T14:00:00Z'

function record(overrides: Partial<ActionRecord> = {}): ActionRecord {
  return {
    ...createAction({ id: 'act_1', kind: 'reply', meetingId: 'm1', text: 'running 5 late', now: NOW }),
    ...overrides,
  }
}

describe('idempotencyKey', () => {
  it('is stable for the same action', () => {
    expect(idempotencyKey('m1', 'reply', 'running 5 late')).toBe(
      idempotencyKey('m1', 'reply', 'running 5 late'),
    )
  })

  it('ignores case and surrounding whitespace', () => {
    expect(idempotencyKey('m1', 'reply', '  Running 5 Late ')).toBe(
      idempotencyKey('m1', 'reply', 'running 5 late'),
    )
  })

  it('differs across meetings, kinds and text', () => {
    const base = idempotencyKey('m1', 'reply', 'x')
    expect(idempotencyKey('m2', 'reply', 'x')).not.toBe(base)
    expect(idempotencyKey('m1', 'note', 'x')).not.toBe(base)
    expect(idempotencyKey('m1', 'reply', 'y')).not.toBe(base)
  })
})

describe('the lifecycle', () => {
  it('starts in created', () => {
    expect(record().status).toBe('created')
  })

  it('walks the happy path in order', () => {
    let r = record()
    for (const step of ['validated', 'awaiting_confirmation', 'authorized', 'executing'] as const) {
      const result = transition(r, step, NOW)
      expect(result.ok).toBe(true)
      r = result.record
    }
    expect(r.status).toBe('executing')
    expect(r.attempts).toBe(1)
  })

  it('refuses to skip validation', () => {
    const result = transition(record(), 'executing', NOW)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('illegal transition')
  })

  it('refuses to execute without authorisation', () => {
    const validated = transition(record(), 'validated', NOW).record
    expect(transition(validated, 'executing', NOW).ok).toBe(false)
  })

  it('treats failure as a reachable state from anywhere in flight', () => {
    for (const from of ['created', 'validated', 'awaiting_confirmation', 'authorized', 'executing'] as const) {
      expect(canTransition(from, 'failed')).toBe(true)
    }
  })

  it('marks terminal states', () => {
    expect(isTerminal('receipt_persisted')).toBe(true)
    expect(isTerminal('failed')).toBe(true)
    expect(isTerminal('executing')).toBe(false)
  })

  it('counts only delivered states as delivered', () => {
    expect(isDelivered('provider_confirmed')).toBe(true)
    expect(isDelivered('receipt_persisted')).toBe(true)
    expect(isDelivered('executing')).toBe(false)
    expect(isDelivered('failed')).toBe(false)
  })
})

describe('validateAction', () => {
  const ok = { meetingExists: true, userConfirmed: true }

  it('accepts a confirmed reply for a real meeting', () => {
    expect(validateAction(record(), ok).ok).toBe(true)
  })

  it('rejects an unknown meeting', () => {
    expect(validateAction(record(), { ...ok, meetingExists: false }).ok).toBe(false)
  })

  it('rejects an unconfirmed action', () => {
    // The safety rule: nothing executes without the user's confirmation.
    expect(validateAction(record(), { ...ok, userConfirmed: false }).ok).toBe(false)
  })

  it('rejects empty text', () => {
    expect(validateAction(record({ text: '   ' }), ok).ok).toBe(false)
  })

  it('rejects text over the limit', () => {
    expect(validateAction(record({ text: 'x'.repeat(400) }), ok).ok).toBe(false)
  })

  it('rejects the agenda as a write', () => {
    expect(validateAction(record({ kind: 'agenda' }), ok).ok).toBe(false)
  })
})

describe('afterExecution', () => {
  const executing = transition(
    transition(
      transition(transition(record(), 'validated', NOW).record, 'awaiting_confirmation', NOW).record,
      'authorized',
      NOW,
    ).record,
    'executing',
    NOW,
  ).record

  it('confirms on success and records the provider reference', () => {
    const result = afterExecution(executing, { kind: 'confirmed', providerReference: 'msg_456' }, NOW)
    expect(result.record.status).toBe('provider_confirmed')
    expect(result.record.providerReference).toBe('msg_456')
  })

  it('fails on a rejection', () => {
    const result = afterExecution(executing, { kind: 'rejected', error: 'HTTP 400' }, NOW)
    expect(result.record.status).toBe('failed')
    expect(result.record.error).toBe('HTTP 400')
  })

  it('reconciles on an ambiguous failure instead of retrying', () => {
    // The dangerous case: the provider may have acted. Retrying blindly would
    // send a duplicate message.
    const result = afterExecution(executing, { kind: 'ambiguous', error: 'timeout' }, NOW)
    expect(result.record.status).toBe('reconciling')
  })

  it('never goes from reconciling straight back to executing', () => {
    // A blind retry after an ambiguous failure would send a duplicate message.
    expect(canTransition('reconciling', 'executing')).toBe(false)
  })
})

describe('buildReceipt', () => {
  it('reports ok only when the provider confirmed', () => {
    const confirmed = record({ status: 'provider_confirmed', providerReference: 'msg_1' })
    expect(buildReceipt(confirmed, 'slack').ok).toBe(true)
  })

  it('reports not ok while still executing', () => {
    expect(buildReceipt(record({ status: 'executing' }), 'slack').ok).toBe(false)
  })

  it('carries the exact text that was sent', () => {
    const confirmed = record({ status: 'provider_confirmed', text: 'running 5 late' })
    expect(buildReceipt(confirmed, 'slack').delivered).toBe('running 5 late')
  })

  it('carries the provider reference', () => {
    const confirmed = record({ status: 'provider_confirmed', providerReference: 'msg_456' })
    expect(buildReceipt(confirmed, 'slack').providerReference).toBe('msg_456')
  })

  it('carries the error on failure', () => {
    const failed = record({ status: 'failed', error: 'HTTP 500' })
    expect(buildReceipt(failed, 'slack').error).toBe('HTTP 500')
  })
})
