import { describe, expect, it } from 'vitest'
import { enrichMeeting, enrichMeetings, isThin } from '../src/lib/enrich.ts'
import type { Meeting } from '../src/core/types.ts'

const NOW = Date.parse('2026-11-25T14:00:00Z')

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    title: 'Intro call',
    startsAt: '2026-11-25T14:09:00Z',
    endsAt: '2026-11-25T14:39:00Z',
    attendees: [{ name: 'Ada Lovelace' }, { name: 'You' }],
    thread: [],
    agenda: [],
    channel: 'notion',
    ...overrides,
  }
}

describe('isThin', () => {
  it('is true with no thread and no doc', () => {
    expect(isThin(meeting())).toBe(true)
  })

  it('is false when there is a thread', () => {
    expect(isThin(meeting({ thread: [{ from: 'Ada', text: 'hi', at: '2026-11-25T13:00:00Z' }] }))).toBe(
      false,
    )
  })

  it('is false when there is a doc', () => {
    expect(isThin(meeting({ doc: { title: 'Deck', touchedAt: '2026-11-25T13:00:00Z' } }))).toBe(false)
  })
})

describe('enrichMeeting', () => {
  it('does nothing without an api key', async () => {
    const result = await enrichMeeting(meeting(), { apiKey: '', now: NOW })
    expect(result.enriched).toBe(false)
    expect(result.meeting.doc).toBeUndefined()
    expect(result.note).toContain('EXA_API_KEY')
  })

  it('does nothing when the meeting already has local context', async () => {
    const withThread = meeting({
      thread: [{ from: 'Ada', text: 'hi', at: '2026-11-25T13:00:00Z' }],
    })
    const result = await enrichMeeting(withThread, { apiKey: 'fake', now: NOW })
    expect(result.enriched).toBe(false)
    expect(result.note).toContain('already has local context')
  })

  it('does nothing when there is no attendee to look up', async () => {
    const solo = meeting({ attendees: [{ name: 'You' }] })
    const result = await enrichMeeting(solo, { apiKey: 'fake', now: NOW })
    expect(result.enriched).toBe(false)
    expect(result.note).toContain('no attendee')
  })

  it('never throws when the provider is unreachable', async () => {
    // Stub fetch: a real network call makes this test depend on DNS, latency
    // and the provider's rate limiter, which is why it was flaky.
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('network down')
    }) as typeof fetch

    try {
      const result = await enrichMeeting(meeting(), { apiKey: 'invalid-key', now: NOW })
      expect(result.enriched).toBe(false)
      expect(result.meeting.title).toBe('Intro call')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('never throws when the provider returns a non-ok status', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response('nope', { status: 401 })) as typeof fetch

    try {
      const result = await enrichMeeting(meeting(), { apiKey: 'invalid-key', now: NOW })
      expect(result.enriched).toBe(false)
      expect(result.meeting.title).toBe('Intro call')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('enrichMeetings', () => {
  it('returns the input unchanged when no key is set', async () => {
    const input = [meeting(), meeting({ id: 'm2' })]
    const result = await enrichMeetings(input, { apiKey: '', now: NOW })
    expect(result.meetings).toHaveLength(2)
    expect(result.enrichedCount).toBe(0)
    expect(result.notes.length).toBeGreaterThan(0)
  })

  it('preserves order and count', async () => {
    const input = [meeting({ id: 'a' }), meeting({ id: 'b' }), meeting({ id: 'c' })]
    const result = await enrichMeetings(input, { apiKey: '', now: NOW })
    expect(result.meetings.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })
})
