import { describe, expect, it } from 'vitest'
import { initialState, rankActions, reduce } from '../src/core/actions.ts'
import { render } from '../src/core/layout.ts'
import { utf8Bytes } from '../src/core/format.ts'
import type { AppState, Meeting } from '../src/core/types.ts'

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

function state(overrides: Partial<AppState> = {}): AppState {
  return { ...initialState([meeting()], NOW), ...overrides }
}

describe('rankActions', () => {
  it('leads with reply when the meeting is imminent', () => {
    expect(rankActions(meeting(), NOW)[0]?.kind).toBe('reply')
  })

  it('offers join only in the last five minutes', () => {
    const soon = meeting({ startsAt: '2026-11-25T14:03:00Z', endsAt: '2026-11-25T14:33:00Z' })
    expect(rankActions(soon, NOW).some((a) => a.kind === 'join')).toBe(true)
    expect(rankActions(meeting(), NOW).some((a) => a.kind === 'join')).toBe(false)
  })

  it('offers the agenda only when there is one', () => {
    expect(rankActions(meeting(), NOW).some((a) => a.kind === 'agenda')).toBe(true)
    expect(rankActions(meeting({ agenda: [] }), NOW).some((a) => a.kind === 'agenda')).toBe(false)
  })

  it('always offers a prep note', () => {
    expect(rankActions(meeting(), NOW).some((a) => a.kind === 'note')).toBe(true)
  })

  it('returns actions in descending score order', () => {
    const scores = rankActions(meeting(), NOW).map((a) => a.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })
})

describe('reduce — navigation', () => {
  it('opens actions on tap from the brief', () => {
    const { state: next } = reduce(state(), { type: 'click' })
    expect(next.screen).toBe('actions')
  })

  it('moves the action cursor and clamps at the ends', () => {
    let s = state({ screen: 'actions' })
    s = reduce(s, { type: 'up' }).state
    expect(s.actionIndex).toBe(0)
    s = reduce(s, { type: 'down' }).state
    expect(s.actionIndex).toBe(1)
  })

  it('goes back on double-tap from a sub-screen', () => {
    const { state: next } = reduce(state({ screen: 'actions' }), { type: 'double_click' })
    expect(next.screen).toBe('brief')
  })

  it('asks to exit on double-tap from the root', () => {
    const { effect } = reduce(state(), { type: 'double_click' })
    expect(effect.kind).toBe('exit')
  })

  it('moves to the next meeting on swipe from the brief', () => {
    const two = [meeting(), meeting({ id: 'm2', startsAt: '2026-11-25T17:00:00Z', endsAt: '2026-11-25T17:30:00Z' })]
    const s = initialState(two, NOW)
    const { state: next } = reduce(s, { type: 'down' })
    expect(next.meetingIndex).toBe(1)
  })

  it('does not move past the last meeting', () => {
    const s = initialState([meeting()], NOW)
    const { state: next } = reduce(s, { type: 'down' })
    expect(next.meetingIndex).toBe(0)
  })

  it('opens the agenda without performing a write', () => {
    const s = state({ screen: 'actions', actionIndex: 0 })
    const actions = rankActions(meeting(), NOW)
    const agendaIdx = actions.findIndex((a) => a.kind === 'agenda')
    const { state: next, effect } = reduce({ ...s, actionIndex: agendaIdx }, { type: 'click' })
    expect(next.screen).toBe('agenda')
    expect(effect.kind).toBe('none')
  })

  it('performs a write on reply', () => {
    const actions = rankActions(meeting(), NOW)
    const replyIdx = actions.findIndex((a) => a.kind === 'reply')
    const { state: next, effect } = reduce(state({ screen: 'actions', actionIndex: replyIdx }), {
      type: 'click',
    })
    expect(effect.kind).toBe('act')
    expect(effect.action?.kind).toBe('reply')
    expect(next.busy).toBe(true)
  })

  it('performs a write on a note preset', () => {
    const { effect } = reduce(state({ screen: 'note', noteIndex: 1 }), { type: 'click' })
    expect(effect.kind).toBe('act')
    expect(effect.action?.kind).toBe('note')
    expect(effect.action?.payload).toBeTruthy()
  })

  it('shows the receipt and clears busy', () => {
    const receipt = { ok: true, delivered: 'running 5 late', at: '2026-11-25T14:04:00Z', channel: 'notion' }
    const { state: next } = reduce(state({ busy: true }), { type: 'receipt', receipt })
    expect(next.screen).toBe('receipt')
    expect(next.busy).toBe(false)
    expect(next.receipt?.delivered).toBe('running 5 late')
  })

  it('advances to the next meeting from the receipt', () => {
    const two = [meeting(), meeting({ id: 'm2', startsAt: '2026-11-25T17:00:00Z', endsAt: '2026-11-25T17:30:00Z' })]
    const s = initialState(two, NOW)
    const withReceipt = reduce(s, {
      type: 'receipt',
      receipt: { ok: true, delivered: 'x', at: '2026-11-25T14:04:00Z', channel: 'notion' },
    }).state
    const { state: next } = reduce(withReceipt, { type: 'click' })
    expect(next.screen).toBe('brief')
    expect(next.meetingIndex).toBe(1)
  })

  it('signals listen on long press from the brief', () => {
    const { effect } = reduce(state(), { type: 'long_press' })
    expect(effect.kind).toBe('listen')
  })

  it('ignores long press on screens that cannot speak', () => {
    const { effect } = reduce(state({ screen: 'agenda' }), { type: 'long_press' })
    expect(effect.kind).toBe('none')
  })
})

describe('render', () => {
  it('produces three non-empty bands on the brief', () => {
    const bands = render(state())
    expect(bands.header.length).toBeGreaterThan(0)
    expect(bands.body.length).toBeGreaterThan(0)
    expect(bands.status.length).toBeGreaterThan(0)
  })

  it('keeps every band under the 999-byte firmware limit', () => {
    const screens: AppState['screen'][] = ['brief', 'actions', 'agenda', 'note', 'receipt']
    for (const screen of screens) {
      const bands = render(
        state({
          screen,
          receipt: { ok: true, delivered: 'x'.repeat(400), at: '2026-11-25T14:04:00Z', channel: 'notion' },
        }),
      )
      expect(utf8Bytes(bands.header)).toBeLessThanOrEqual(999)
      expect(utf8Bytes(bands.body)).toBeLessThanOrEqual(999)
      expect(utf8Bytes(bands.status)).toBeLessThanOrEqual(999)
    }
  })

  it('shows the time until the meeting in the header', () => {
    expect(render(state()).header).toContain('9m')
  })

  it('marks the screen in the header', () => {
    expect(render(state({ screen: 'actions' })).header).toContain('ACT')
  })

  it('puts a cursor on the selected action', () => {
    const body = render(state({ screen: 'actions', actionIndex: 0 })).body
    expect(body.split('\n')[0]?.startsWith('>')).toBe(true)
  })

  it('shows the delivered string verbatim on the receipt', () => {
    const delivered = 'running 5 late'
    const body = render(
      state({
        screen: 'receipt',
        receipt: { ok: true, delivered, at: '2026-11-25T14:04:00Z', channel: 'notion' },
      }),
    ).body
    expect(body).toContain(delivered)
  })

  it('says SENT on a successful receipt and FAILED on a failed one', () => {
    const ok = render(
      state({ screen: 'receipt', receipt: { ok: true, delivered: 'x', at: '2026-11-25T14:04:00Z', channel: 'n' } }),
    ).body
    const bad = render(
      state({
        screen: 'receipt',
        receipt: { ok: false, delivered: 'x', at: '2026-11-25T14:04:00Z', channel: 'n', error: 'HTTP 500' },
      }),
    ).body
    expect(ok).toContain('SENT')
    expect(bad).toContain('FAILED')
  })

  it('handles an empty meeting list without crashing', () => {
    const bands = render(initialState([], NOW))
    expect(bands.body).toContain('No meetings')
  })

  it('shows a working line while busy', () => {
    expect(render(state({ busy: true })).status).toBe('working…')
  })
})
