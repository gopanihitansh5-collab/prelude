import { describe, expect, it } from 'vitest'
import {
  commitmentLine,
  detectCommitments,
  openCommitments,
  topCommitment,
} from '../src/core/commitments.ts'
import type { ThreadMessage } from '../src/core/types.ts'

const NOW = Date.parse('2026-11-25T14:00:00Z')

function msg(from: string, text: string, at = '2026-11-24T10:00:00Z'): ThreadMessage {
  return { from, text, at }
}

describe('detectCommitments', () => {
  it('detects a promise the user made', () => {
    const found = detectCommitments([msg('You', "I'll send the revised pricing by Wednesday.")], 'You', NOW)
    expect(found).toHaveLength(1)
    expect(found[0]?.owner).toBe('me')
  })

  it('detects a request from the other person', () => {
    const found = detectCommitments([msg('Ada', 'Can you send the enterprise pricing?')], 'You', NOW)
    expect(found).toHaveLength(1)
    expect(found[0]?.owner).toBe('them')
  })

  it('ignores ordinary conversation', () => {
    const found = detectCommitments([msg('Ada', 'Numbers look right. Nice work.')], 'You', NOW)
    expect(found).toHaveLength(0)
  })

  it('splits a message into sentences so one promise does not swallow the rest', () => {
    const found = detectCommitments(
      [msg('You', "I'll send the deck. The weather is nice. I will confirm the date.")],
      'You',
      NOW,
    )
    expect(found).toHaveLength(2)
  })

  it('extracts a short label that fits one line', () => {
    const found = detectCommitments([msg('You', "I'll send the revised enterprise pricing tomorrow.")], 'You', NOW)
    expect(found[0]?.label.length).toBeLessThanOrEqual(40)
    expect(found[0]?.label).not.toMatch(/i'll/i)
  })

  it('detects a deadline and marks it overdue when it has passed', () => {
    const found = detectCommitments(
      [msg('You', "I'll send the pricing tomorrow.", '2026-11-20T10:00:00Z')],
      'You',
      NOW,
    )
    expect(found[0]?.dueAt).toBeTruthy()
    expect(found[0]?.status).toBe('overdue')
  })

  it('leaves a future deadline open', () => {
    const found = detectCommitments(
      [msg('You', "I'll send the pricing next week.", '2026-11-24T10:00:00Z')],
      'You',
      NOW,
    )
    expect(found[0]?.status).toBe('open')
  })

  it('keeps the source sentence for the memory screen', () => {
    const sentence = "I'll send the revised pricing by Wednesday."
    const found = detectCommitments([msg('You', sentence)], 'You', NOW)
    expect(found[0]?.source).toBe(sentence)
  })

  it('survives an invalid timestamp', () => {
    expect(detectCommitments([msg('You', "I'll send it.", 'not-a-date')], 'You', NOW)).toHaveLength(0)
  })
})

describe('openCommitments', () => {
  it('keeps only what the user owes', () => {
    const all = detectCommitments(
      [msg('You', "I'll send the deck."), msg('Ada', 'Can you confirm the date?')],
      'You',
      NOW,
    )
    expect(openCommitments(all).every((c) => c.owner === 'me')).toBe(true)
  })

  it('puts overdue first', () => {
    const all = detectCommitments(
      [
        msg('You', "I'll send the deck next week.", '2026-11-24T10:00:00Z'),
        msg('You', "I'll send the pricing tomorrow.", '2026-11-20T10:00:00Z'),
      ],
      'You',
      NOW,
    )
    expect(openCommitments(all)[0]?.status).toBe('overdue')
  })

  it('drops completed commitments', () => {
    const all = detectCommitments([msg('You', "I'll send the deck.")], 'You', NOW)
    const done = all.map((c) => ({ ...c, status: 'done' as const }))
    expect(openCommitments(done)).toHaveLength(0)
  })
})

describe('topCommitment', () => {
  it('returns the most urgent open commitment', () => {
    const all = detectCommitments(
      [
        msg('You', "I'll send the deck next week.", '2026-11-24T10:00:00Z'),
        msg('You', "I'll send the pricing tomorrow.", '2026-11-20T10:00:00Z'),
      ],
      'You',
      NOW,
    )
    expect(topCommitment(all)?.status).toBe('overdue')
  })

  it('returns null when nothing is open', () => {
    expect(topCommitment([])).toBeNull()
  })
})

describe('commitmentLine', () => {
  it('reads OPEN for an open commitment', () => {
    const c = detectCommitments([msg('You', "I'll send the deck next week.")], 'You', NOW)[0]!
    expect(commitmentLine(c)).toMatch(/^OPEN: /)
  })

  it('reads OVERDUE for an overdue one', () => {
    const c = detectCommitments(
      [msg('You', "I'll send the pricing tomorrow.", '2026-11-20T10:00:00Z')],
      'You',
      NOW,
    )[0]!
    expect(commitmentLine(c)).toMatch(/^OVERDUE: /)
  })
})
