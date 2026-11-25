import { describe, expect, it } from 'vitest'
import {
  clockTime,
  fitFields,
  initials,
  MAX_CONTAINER_BYTES,
  progressBar,
  relTime,
  truncate,
  utf8Bytes,
  wrapText,
} from '../src/core/format.ts'

describe('utf8Bytes', () => {
  it('counts ASCII as one byte', () => {
    expect(utf8Bytes('abc')).toBe(3)
  })

  it('counts two-byte characters', () => {
    expect(utf8Bytes('é')).toBe(2)
  })

  it('counts three-byte characters', () => {
    expect(utf8Bytes('→')).toBe(3)
  })

  it('counts a surrogate pair as four bytes, not six', () => {
    expect(utf8Bytes('😀')).toBe(4)
  })

  it('agrees with TextEncoder', () => {
    const samples = ['hello', 'café', '→ arrow', '😀 emoji', 'mixed é→😀 text']
    for (const sample of samples) {
      expect(utf8Bytes(sample)).toBe(new TextEncoder().encode(sample).length)
    }
  })
})

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('abc', 10)).toBe('abc')
  })

  it('appends an ellipsis when it cuts', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…')
  })

  it('handles a budget of one', () => {
    expect(truncate('abc', 1)).toBe('…')
  })

  it('handles a budget of zero', () => {
    expect(truncate('abc', 0)).toBe('')
  })
})

describe('wrapText', () => {
  it('wraps on spaces', () => {
    expect(wrapText('one two three four', 9, 3)).toEqual(['one two', 'three', 'four'])
  })

  it('respects the line budget', () => {
    const lines = wrapText('a b c d e f g h i j', 3, 2)
    expect(lines.length).toBeLessThanOrEqual(2)
  })

  it('hard-splits a word longer than the budget', () => {
    const lines = wrapText('supercalifragilistic', 6, 5)
    expect(lines.every((l) => l.length <= 6)).toBe(true)
  })

  it('never returns more lines than asked', () => {
    const lines = wrapText('x '.repeat(200), 10, 4)
    expect(lines.length).toBeLessThanOrEqual(4)
  })
})

describe('fitFields', () => {
  it('keeps everything that fits', () => {
    expect(fitFields(['a', 'b'], ' · ', 100)).toEqual({ text: 'a · b', dropped: 0 })
  })

  it('drops whole fields rather than cutting one', () => {
    const result = fitFields(['aaaa', 'bbbb', 'cccc'], ' · ', 12)
    expect(result.text).toBe('aaaa · bbbb')
    expect(result.dropped).toBe(1)
  })

  it('never returns a partial field', () => {
    const result = fitFields(['abcdefghij', 'klm'], ' · ', 5)
    expect(result.text).toBe('')
    expect(result.dropped).toBe(2)
  })
})

describe('relTime', () => {
  const now = Date.parse('2026-11-25T14:00:00Z')

  it('reads "now" inside a minute', () => {
    expect(relTime('2026-11-25T14:00:20Z', now)).toBe('now')
  })

  it('reads minutes ahead', () => {
    expect(relTime('2026-11-25T14:09:00Z', now)).toBe('9m')
  })

  it('reads minutes behind', () => {
    expect(relTime('2026-11-25T13:51:00Z', now)).toBe('9m ago')
  })

  it('reads hours with minutes', () => {
    expect(relTime('2026-11-25T16:30:00Z', now)).toBe('2h30m')
  })

  it('reads whole hours without a trailing 0m', () => {
    expect(relTime('2026-11-25T16:00:00Z', now)).toBe('2h')
  })

  it('survives an invalid date', () => {
    expect(relTime('not-a-date', now)).toBe('--')
  })
})

describe('clockTime', () => {
  it('formats as HH:MM', () => {
    expect(clockTime('2026-11-25T12:04:00Z')).toMatch(/^\d{2}:\d{2}$/)
  })

  it('survives an invalid date', () => {
    expect(clockTime('nope')).toBe('--:--')
  })
})

describe('initials', () => {
  it('takes first and last', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
  })

  it('takes two letters from a single name', () => {
    expect(initials('Ada')).toBe('AD')
  })

  it('survives an empty name', () => {
    expect(initials('   ')).toBe('?')
  })
})

describe('progressBar', () => {
  it('fills the requested share', () => {
    expect(progressBar(1, 3)).toBe('━──')
  })

  it('clamps out-of-range input', () => {
    expect(progressBar(9, 3)).toBe('━━━')
    expect(progressBar(-2, 3)).toBe('───')
  })

  it('never divides by zero', () => {
    expect(progressBar(0, 0)).toBe('─')
  })
})

describe('container byte budget', () => {
  it('is the firmware limit', () => {
    expect(MAX_CONTAINER_BYTES).toBe(999)
  })
})
