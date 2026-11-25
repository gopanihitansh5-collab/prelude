import { describe, expect, it } from 'vitest'
import { memoryLines, recall, scoreItem, shortDate } from '../src/core/memory.ts'
import type { SourceItem } from '../src/lib/integrations/types.ts'

const NOW = Date.parse('2026-11-25T14:00:00Z')

function item(overrides: Partial<SourceItem> = {}): SourceItem {
  return {
    id: 'i1',
    provider: 'notion',
    kind: 'document',
    title: 'Pricing v3',
    body: 'Enterprise tier ceiling and annual split.',
    at: '2026-11-22T10:00:00Z',
    ...overrides,
  }
}

describe('scoreItem', () => {
  it('scores a title match higher than a body match', () => {
    const titleHit = scoreItem(item({ title: 'pricing', body: 'nothing' }), ['pricing'], NOW)
    const bodyHit = scoreItem(item({ title: 'nothing', body: 'pricing' }), ['pricing'], NOW)
    expect(titleHit!.score).toBeGreaterThan(bodyHit!.score)
  })

  it('returns null when nothing matches', () => {
    expect(scoreItem(item(), ['kubernetes'], NOW)).toBeNull()
  })

  it('reports which field matched', () => {
    expect(scoreItem(item({ title: 'pricing' }), ['pricing'], NOW)?.matchedOn).toBe('title')
    expect(scoreItem(item({ title: 'x', body: 'pricing' }), ['pricing'], NOW)?.matchedOn).toBe('body')
  })

  it('gives a recency bonus to newer items', () => {
    const recent = scoreItem(item({ at: '2026-11-25T10:00:00Z' }), ['pricing'], NOW)!
    const old = scoreItem(item({ at: '2026-09-01T10:00:00Z' }), ['pricing'], NOW)!
    expect(recent.score).toBeGreaterThan(old.score)
  })
})

describe('recall', () => {
  const index = [
    item({ id: 'a', title: 'Pricing v3', body: 'Enterprise discount 15%', at: '2026-11-22T10:00:00Z' }),
    item({ id: 'b', title: 'Pricing v2', body: 'Older pricing', at: '2026-10-01T10:00:00Z' }),
    item({ id: 'c', title: 'Hiring plan', body: 'Nothing relevant', at: '2026-11-20T10:00:00Z' }),
  ]

  it('finds matches across the index', () => {
    const answer = recall(index, 'enterprise pricing', NOW)
    expect(answer.empty).toBe(false)
    expect(answer.hits.length).toBeGreaterThan(0)
  })

  it('reports the count in the headline', () => {
    const answer = recall(index, 'pricing', NOW)
    expect(answer.headline).toMatch(/^YES · \d+ match/)
  })

  it('returns the most recent hit as latest', () => {
    const answer = recall(index, 'pricing', NOW)
    expect(answer.latest?.item.id).toBe('a')
  })

  it('says NO when nothing matches', () => {
    const answer = recall(index, 'kubernetes', NOW)
    expect(answer.empty).toBe(true)
    expect(answer.headline).toMatch(/^NO/)
  })

  it('handles an empty query', () => {
    expect(recall(index, '', NOW).empty).toBe(true)
  })

  it('respects the limit', () => {
    expect(recall(index, 'pricing', NOW, 1).hits).toHaveLength(1)
  })

  it('ignores short words that carry no signal', () => {
    const answer = recall(index, 'a of to', NOW)
    expect(answer.empty).toBe(true)
  })
})

describe('shortDate', () => {
  it('formats as Mon D', () => {
    expect(shortDate('2026-11-22T10:00:00Z')).toMatch(/^Nov \d{1,2}$/)
  })

  it('survives an invalid date', () => {
    expect(shortDate('nope')).toBe('--')
  })
})

describe('memoryLines', () => {
  it('returns the headline when empty', () => {
    expect(memoryLines({ headline: 'NO · nothing found', latest: null, hits: [], empty: true })).toEqual([
      'NO · nothing found',
    ])
  })

  it('includes the date and title of the latest hit', () => {
    const answer = recall([item()], 'pricing', NOW)
    const lines = memoryLines(answer)
    expect(lines[0]).toMatch(/^YES/)
    expect(lines.some((l) => l.startsWith('Last: '))).toBe(true)
  })

  it('never returns more lines than asked', () => {
    const answer = recall([item()], 'pricing', NOW)
    expect(memoryLines(answer, 2).length).toBeLessThanOrEqual(2)
  })
})
