import { describe, expect, it } from 'vitest'
import { renderPanel } from '../src/core/panel.ts'
import { initialState } from '../src/core/actions.ts'
import type { Meeting } from '../src/core/types.ts'

const NOW = Date.parse('2026-11-26T09:41:00Z')

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    title: 'Pricing v3 — final call',
    startsAt: '2026-11-26T09:50:00Z',
    endsAt: '2026-11-26T10:20:00Z',
    attendees: [
      { name: 'Ada Lovelace', role: 'CTO' },
      { name: 'You', role: 'Founder' },
    ],
    thread: [{ from: 'Ada', text: 'One question on the enterprise tier.', at: '2026-11-26T09:00:00Z' }],
    doc: { title: 'Pricing v3', touchedAt: '2026-11-26T06:00:00Z' },
    agenda: [{ title: 'Enterprise tier ceiling', minutes: 15 }],
    channel: 'notion',
    ...overrides,
  }
}

describe('renderPanel', () => {
  it('splits the clock into hours and minutes', () => {
    const layout = renderPanel(initialState([meeting()], NOW))
    expect(layout.clock.hours).toMatch(/^\d{2}$/)
    expect(layout.clock.minutes).toMatch(/^\d{2}$/)
  })

  it('formats the date as "Wed 11/26"', () => {
    const layout = renderPanel(initialState([meeting()], NOW))
    expect(layout.date).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{2}\/\d{2}$/)
  })

  it('shows the brief rows on the brief screen', () => {
    const layout = renderPanel(initialState([meeting()], NOW))
    expect(layout.panel.title).toBe('BRIEF')
    const text = layout.panel.rows.map((r) => r.text).join(' ')
    expect(text).toContain('Ada Lovelace')
    expect(text).toContain('Pricing v3')
  })

  it('surfaces an open commitment instead of the last message', () => {
    const withPromise = meeting({
      thread: [
        { from: 'You', text: "I'll send the revised pricing by Wednesday.", at: '2026-11-26T08:00:00Z' },
      ],
    })
    const layout = renderPanel(initialState([withPromise], NOW))
    const text = layout.panel.rows.map((r) => r.text).join(' ')
    expect(text).toMatch(/OPEN|OVERDUE/)
  })

  it('says so plainly when there is no meeting', () => {
    const layout = renderPanel(initialState([], NOW))
    expect(layout.panel.rows[0]?.text).toContain('No meetings')
  })

  it('renders the actions screen with a cursor row', () => {
    const state = { ...initialState([meeting()], NOW), screen: 'actions' as const }
    const layout = renderPanel(state)
    expect(layout.panel.title).toBe('ACTIONS')
    expect(layout.panel.rows.length).toBeGreaterThan(0)
  })

  it('renders the agenda screen with minutes', () => {
    const state = { ...initialState([meeting()], NOW), screen: 'agenda' as const }
    const layout = renderPanel(state)
    expect(layout.panel.title).toBe('AGENDA')
    expect(layout.panel.rows[0]?.meta).toBe('15m')
  })

  it('renders a receipt with the delivered string', () => {
    const state = {
      ...initialState([meeting()], NOW),
      screen: 'receipt' as const,
      receipt: {
        ok: true,
        delivered: 'running 5 late',
        at: '2026-11-26T09:41:00Z',
        channel: 'demo',
        providerReference: 'demo_idem_abc',
      },
    }
    const layout = renderPanel(state)
    expect(layout.panel.title).toBe('SENT')
    expect(layout.panel.rows[0]?.text).toBe('running 5 late')
  })

  it('marks a failed receipt as FAILED', () => {
    const state = {
      ...initialState([meeting()], NOW),
      screen: 'receipt' as const,
      receipt: { ok: false, delivered: 'x', at: '2026-11-26T09:41:00Z', channel: 'demo', error: 'nope' },
    }
    expect(renderPanel(state).panel.title).toBe('FAILED')
  })

  it('shows the listening status only while listening', () => {
    const base = initialState([meeting()], NOW)
    const listening = renderPanel({
      ...base,
      screen: 'voice',
      voice: { state: 'listening' } as never,
    })
    expect(listening.status).toBe('Even AI Listening')

    const idle = renderPanel({ ...base, screen: 'voice', voice: { state: 'idle' } as never })
    expect(idle.status).toBeUndefined()
  })

  it('never exceeds the panel width in characters', () => {
    const long = meeting({ title: 'A'.repeat(200) })
    const layout = renderPanel(initialState([long], NOW))
    for (const row of layout.panel.rows) {
      expect(row.text.length).toBeLessThanOrEqual(26)
    }
  })
})
