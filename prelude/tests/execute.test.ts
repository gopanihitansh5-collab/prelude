// The retry contract, tested end to end against the real store and the real
// adapter registry.
//
// This exists because the bug it pins was invisible in the unit tests: the
// lifecycle computed one idempotency key while execute() looked the record up
// with a different one, so every retry created a second record. In-memory that
// sent the message twice; against Postgres the UNIQUE constraint turned it into
// a 500 with an empty body. The lookup key and the stored key must be the same
// string, and only execute() knows both.

import { beforeEach, describe, expect, it } from 'vitest'
import { executeAction, listActions } from '../src/lib/execute.ts'
import { resetActionStore } from '../src/lib/action-store.ts'
import { idempotencyKey } from '../src/core/action-lifecycle.ts'

const MEETING = 'm-pricing'

// Never point this suite at the real database: `.env.local` has a live Neon URL,
// and a test that writes to the production action store would be a footgun.
delete process.env.DATABASE_URL

beforeEach(() => {
  resetActionStore()
})

describe('executeAction idempotency', () => {
  it('delivers once and returns the same receipt on retry', async () => {
    const first = await executeAction({
      meetingId: MEETING,
      action: 'reply',
      text: 'retry probe alpha',
      confirmed: true,
    })
    expect(first.ok).toBe(true)
    expect(first.status).toBe('receipt_persisted')

    const second = await executeAction({
      meetingId: MEETING,
      action: 'reply',
      text: 'retry probe alpha',
      confirmed: true,
    })

    // Byte-identical, apart from nothing: the whole receipt object.
    expect(second).toEqual(first)
    expect(second.actionId).toBe(first.actionId)
    expect(second.providerReference).toBe(first.providerReference)

    // And only one record exists, so the provider was asked once.
    expect(await listActions()).toHaveLength(1)
  })

  it('looks the action up under the key the record is stored with', async () => {
    const receipt = await executeAction({
      meetingId: MEETING,
      action: 'reply',
      text: 'retry probe beta',
      confirmed: true,
    })
    const [stored] = await listActions()
    expect(stored?.id).toBe(receipt.actionId)
    expect(stored?.idempotencyKey).toBe(idempotencyKey(MEETING, 'reply', 'retry probe beta'))
  })

  it('treats differently-cased and padded text as the same action', async () => {
    const first = await executeAction({
      meetingId: MEETING,
      action: 'reply',
      text: '  Retry Probe Gamma ',
      confirmed: true,
    })
    const second = await executeAction({
      meetingId: MEETING,
      action: 'reply',
      text: 'retry probe gamma',
      confirmed: true,
    })
    expect(second.actionId).toBe(first.actionId)
    expect(await listActions()).toHaveLength(1)
  })

  it('keeps different text as different actions', async () => {
    await executeAction({ meetingId: MEETING, action: 'reply', text: 'one', confirmed: true })
    await executeAction({ meetingId: MEETING, action: 'reply', text: 'two', confirmed: true })
    expect(await listActions()).toHaveLength(2)
  })

  it('rejects an unconfirmed action without writing to the provider', async () => {
    const receipt = await executeAction({
      meetingId: MEETING,
      action: 'reply',
      text: 'should not send',
      confirmed: false,
    })
    expect(receipt.ok).toBe(false)
    expect(receipt.status).toBe('failed')
    expect(receipt.error).toBe('not confirmed by the user')
    expect(receipt.providerReference).toBeUndefined()
  })

  it('rejects agenda as a read, and keeps that reason on retry', async () => {
    const first = await executeAction({
      meetingId: MEETING,
      action: 'agenda',
      confirmed: true,
    })
    expect(first.ok).toBe(false)
    expect(first.error).toBe('agenda is a read, not a write')

    // The retry reports the same failure rather than an illegal transition.
    const second = await executeAction({
      meetingId: MEETING,
      action: 'agenda',
      confirmed: true,
    })
    expect(second.error).toBe('agenda is a read, not a write')
    expect(await listActions()).toHaveLength(1)
  })

  it('reports the same channel for a success and a rejection on one meeting', async () => {
    const sent = await executeAction({
      meetingId: MEETING,
      action: 'reply',
      text: 'channel probe',
      confirmed: true,
    })
    const rejected = await executeAction({
      meetingId: MEETING,
      action: 'agenda',
      confirmed: true,
    })
    expect(rejected.channel).toBe(sent.channel)
  })

  it('fails an unknown meeting instead of sending', async () => {
    const receipt = await executeAction({
      meetingId: 'no-such-meeting',
      action: 'reply',
      text: 'nowhere',
      confirmed: true,
    })
    expect(receipt.ok).toBe(false)
    expect(receipt.error).toBe('unknown meeting')
  })
})
