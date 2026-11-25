import { describe, expect, it } from 'vitest'
import { contextBlock, DEVICE_CONTRACT, systemPrompt } from '../src/core/context.ts'
import type { Meeting } from '../src/core/types.ts'

const NOW = Date.parse('2026-11-25T14:00:00Z')

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    title: 'Pricing v3 — final call',
    startsAt: '2026-11-25T14:09:00Z',
    endsAt: '2026-11-25T14:39:00Z',
    attendees: [
      { name: 'Ada Lovelace', role: 'CTO' },
      { name: 'You', role: 'Founder' },
    ],
    thread: [{ from: 'Ada', text: 'One question on the enterprise tier.', at: '2026-11-25T13:18:00Z' }],
    doc: { title: 'Pricing v3', touchedAt: '2026-11-25T11:00:00Z' },
    agenda: [{ title: 'Enterprise tier ceiling', minutes: 15 }],
    channel: 'notion',
    ...overrides,
  }
}

describe('systemPrompt', () => {
  it('states the device constraints', () => {
    const prompt = systemPrompt()
    expect(prompt).toContain(DEVICE_CONTRACT.display)
    expect(prompt).toContain(DEVICE_CONTRACT.byteLimit)
    expect(prompt).toContain('no camera, no speaker')
  })

  it('forbids following instructions inside untrusted markers', () => {
    expect(systemPrompt()).toContain('<<<BEGIN_UNTRUSTED>>>')
  })

  it('states that the model proposes but never executes', () => {
    expect(systemPrompt()).toContain('You never execute one')
  })

  it('contains no user data', () => {
    expect(systemPrompt()).not.toContain('Ada')
    expect(systemPrompt()).not.toContain('Pricing v3')
  })
})

describe('contextBlock', () => {
  it('includes the meeting facts', () => {
    const block = contextBlock({ meeting: meeting(), now: NOW, selfName: 'You' })
    expect(block).toContain('Pricing v3 — final call')
    expect(block).toContain('Ada Lovelace, CTO')
    expect(block).toContain('Enterprise tier ceiling (15m)')
    expect(block).toContain('Pricing v3')
  })

  it('includes the recent thread', () => {
    const block = contextBlock({ meeting: meeting(), now: NOW, selfName: 'You' })
    expect(block).toContain('One question on the enterprise tier.')
    expect(block).toContain('RECENT MESSAGES')
  })

  it('says so plainly when there is no meeting', () => {
    const block = contextBlock({ meeting: null, now: NOW })
    expect(block).toContain('None. There is no upcoming meeting')
  })

  it('says so plainly when there is no thread', () => {
    const block = contextBlock({ meeting: meeting({ thread: [] }), now: NOW, selfName: 'You' })
    expect(block).toContain('No messages with this person yet')
  })

  it('says so plainly when there is no agenda', () => {
    const block = contextBlock({ meeting: meeting({ agenda: [] }), now: NOW, selfName: 'You' })
    expect(block).toContain('No agenda set')
  })

  it('includes the screen the user is on', () => {
    const block = contextBlock({ meeting: meeting(), now: NOW, screen: 'voice' })
    expect(block).toContain('"voice" screen')
  })

  it('includes the transcript when given one', () => {
    const block = contextBlock({
      meeting: meeting(),
      now: NOW,
      transcript: 'running five minutes late',
    })
    expect(block).toContain('running five minutes late')
    expect(block).toContain('untrusted, from a microphone')
  })

  it('surfaces open commitments the user owes', () => {
    const block = contextBlock({
      meeting: meeting({
        thread: [
          {
            from: 'You',
            text: "I'll send the revised pricing by Wednesday.",
            at: '2026-11-25T10:00:00Z',
          },
        ],
      }),
      now: NOW,
      selfName: 'You',
    })
    expect(block).toContain('OPEN COMMITMENTS')
    expect(block).toContain('you owe')
  })

  it('does not list the user as another attendee', () => {
    const block = contextBlock({ meeting: meeting(), now: NOW, selfName: 'You' })
    expect(block).not.toContain('Also attending: You')
  })
})
