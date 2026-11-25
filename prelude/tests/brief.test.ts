import { describe, expect, it } from 'vitest'
import { buildBrief, lastMessage, nextMeeting, primaryAttendee, upcoming } from '../src/core/brief.ts'
import type { Meeting } from '../src/core/types.ts'

const NOW = Date.parse('2026-11-25T14:00:00Z')

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    title: 'Pricing v3',
    startsAt: '2026-11-25T14:09:00Z',
    endsAt: '2026-11-25T14:39:00Z',
    attendees: [
      { name: 'Ada Lovelace', role: 'CTO' },
      { name: 'You', role: 'Founder' },
    ],
    thread: [{ from: 'Ada', text: 'One question on the enterprise tier.', at: '2026-11-25T13:18:00Z' }],
    doc: { title: 'Pricing v3', touchedAt: '2026-11-25T11:00:00Z' },
    agenda: [
      { title: 'Ceiling', minutes: 15 },
      { title: 'Split', minutes: 10 },
    ],
    channel: 'notion',
    ...overrides,
  }
}

describe('primaryAttendee', () => {
  it('skips the user', () => {
    expect(primaryAttendee(meeting(), 'You').name).toBe('Ada Lovelace')
  })

  it('falls back to the first attendee when the user is not listed', () => {
    expect(primaryAttendee(meeting(), 'Nobody').name).toBe('Ada Lovelace')
  })

  it('survives an empty attendee list', () => {
    expect(primaryAttendee(meeting({ attendees: [] })).name).toBe('Someone')
  })
})

describe('lastMessage', () => {
  it('returns the newest message regardless of array order', () => {
    const m = meeting({
      thread: [
        { from: 'Ada', text: 'older', at: '2026-11-25T10:00:00Z' },
        { from: 'Ada', text: 'newer', at: '2026-11-25T13:00:00Z' },
      ],
    })
    expect(lastMessage(m)?.text).toBe('newer')
  })

  it('returns null for an empty thread', () => {
    expect(lastMessage(meeting({ thread: [] }))).toBeNull()
  })
})

describe('buildBrief', () => {
  it('reads the time until the meeting', () => {
    expect(buildBrief(meeting(), NOW).when).toBe('9m')
  })

  it('joins name and role', () => {
    expect(buildBrief(meeting(), NOW).whoLine).toBe('Ada Lovelace · CTO')
  })

  it('omits the role separator when there is no role', () => {
    const m = meeting({ attendees: [{ name: 'Ada' }] })
    expect(buildBrief(m, NOW).whoLine).toBe('Ada')
  })

  it('summarises the agenda with a total', () => {
    expect(buildBrief(meeting(), NOW).agendaLine).toBe('2 items · 25m')
  })

  it('says so when there is no agenda', () => {
    expect(buildBrief(meeting({ agenda: [] }), NOW).agendaLine).toBe('no agenda yet')
  })

  it('uses the singular for one item', () => {
    expect(buildBrief(meeting({ agenda: [{ title: 'x', minutes: 5 }] }), NOW).agendaLine).toBe('1 item · 5m')
  })

  it('includes the doc with how long ago it was touched', () => {
    expect(buildBrief(meeting(), NOW).docLine).toBe('Pricing v3 · 3h ago')
  })

  it('has no doc line when there is no doc', () => {
    expect(buildBrief(meeting({ doc: undefined }), NOW).docLine).toBeNull()
  })

  it('says so when the thread is empty', () => {
    expect(buildBrief(meeting({ thread: [] }), NOW).lastThread).toBe('no messages yet')
  })

  it('counts the other attendees', () => {
    const m = meeting({
      attendees: [{ name: 'Ada' }, { name: 'You' }, { name: 'Grace' }],
    })
    expect(buildBrief(m, NOW).others).toBe(2)
  })
})

describe('upcoming / nextMeeting', () => {
  const past = meeting({ id: 'past', startsAt: '2026-11-25T10:00:00Z', endsAt: '2026-11-25T10:30:00Z' })
  const soon = meeting({ id: 'soon', startsAt: '2026-11-25T14:09:00Z', endsAt: '2026-11-25T14:39:00Z' })
  const later = meeting({ id: 'later', startsAt: '2026-11-25T17:00:00Z', endsAt: '2026-11-25T17:30:00Z' })

  it('drops meetings that already ended', () => {
    expect(upcoming([past, soon, later], NOW).map((m) => m.id)).toEqual(['soon', 'later'])
  })

  it('sorts by start time', () => {
    expect(upcoming([later, soon], NOW).map((m) => m.id)).toEqual(['soon', 'later'])
  })

  it('keeps a meeting that is in progress', () => {
    const inProgress = meeting({ id: 'now', startsAt: '2026-11-25T13:50:00Z', endsAt: '2026-11-25T14:20:00Z' })
    expect(upcoming([inProgress], NOW).map((m) => m.id)).toEqual(['now'])
  })

  it('returns the soonest meeting', () => {
    expect(nextMeeting([later, soon], NOW)?.id).toBe('soon')
  })

  it('returns null when nothing is left', () => {
    expect(nextMeeting([past], NOW)).toBeNull()
  })
})
