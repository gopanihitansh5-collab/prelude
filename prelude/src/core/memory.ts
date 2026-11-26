// The memory engine: cross-source recall with sources and timestamps.
//
// The spec's example:
//   "Have we discussed the enterprise pricing before?"
//   → YES · 2 discussions / Last: Nov 22 / Decision: 15% discount / OPEN: approval
//
// The architectural rule: maintain a normalized context model rather than
// making four independent API calls per question. So this file works on a
// single normalized index, and the adapters feed it.

import type { SourceItem } from './types.ts'
import { truncate } from './format.ts'

export interface MemoryHit {
  item: SourceItem
  /** Why it matched, for the "source and timestamp" requirement. */
  matchedOn: 'title' | 'body' | 'author'
  /** 0..1, higher is better. Deterministic, not a model score. */
  score: number
}

export interface MemoryAnswer {
  /** "YES · 2 discussions" or "NO · nothing found". */
  headline: string
  /** The most recent hit, when there is one. */
  latest: MemoryHit | null
  /** Up to three supporting hits. */
  hits: MemoryHit[]
  /** True when nothing matched. */
  empty: boolean
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

/**
 * Score one item against a query.
 *
 * Deterministic term overlap, weighted by field. A title match is worth more
 * than a body match, and a recency bonus breaks ties. No embeddings, no model —
 * so the answer is reproducible and testable.
 */
export function scoreItem(item: SourceItem, queryTerms: string[], nowMs: number): MemoryHit | null {
  const title = item.title.toLowerCase()
  const body = item.body.toLowerCase()
  const author = (item.author ?? '').toLowerCase()

  let score = 0
  let matchedOn: MemoryHit['matchedOn'] = 'body'

  for (const term of queryTerms) {
    if (title.includes(term)) {
      score += 3
      matchedOn = 'title'
    } else if (body.includes(term)) {
      score += 2
    } else if (author.includes(term)) {
      score += 1
      matchedOn = 'author'
    }
  }

  if (score === 0) return null

  // Recency bonus: up to +2 for something from today, decaying over 30 days.
  const ageDays = Math.max(0, (nowMs - Date.parse(item.at)) / 86_400_000)
  const recency = Math.max(0, 2 - (ageDays / 30) * 2)

  return { item, matchedOn, score: score + recency }
}

/** Search the normalized index. */
export function recall(index: SourceItem[], query: string, nowMs: number, limit = 3): MemoryAnswer {
  const terms = tokenize(query)
  if (terms.length === 0) {
    return { headline: 'NO · ask a question', latest: null, hits: [], empty: true }
  }

  const hits = index
    .map((item) => scoreItem(item, terms, nowMs))
    .filter((hit): hit is MemoryHit => hit !== null)
    .sort((a, b) => b.score - a.score)

  if (hits.length === 0) {
    return { headline: 'NO · nothing found', latest: null, hits: [], empty: true }
  }

  const latest = [...hits].sort((a, b) => Date.parse(b.item.at) - Date.parse(a.item.at))[0] ?? null
  const count = hits.length
  const headline = `YES · ${count} ${count === 1 ? 'match' : 'matches'}`

  return { headline, latest, hits: hits.slice(0, limit), empty: false }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * "Nov 22" — short enough for the lens.
 *
 * Deliberately not `toLocaleDateString`: that depends on the host's ICU data and
 * locale, so the same input can render differently in a test worker than in the
 * browser. A fixed month table makes this a pure function.
 */
export function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  const month = MONTHS[d.getUTCMonth()] ?? '???'
  return `${month} ${d.getUTCDate()}`
}

/**
 * The memory screen, as lines that fit the display.
 * Returns at most `maxLines` lines, dropping whole fields rather than cutting.
 *
 * Uses `truncate` rather than `slice` so a multi-byte character is never split
 * in half — the same rule the rest of the display follows.
 */
export function memoryLines(answer: MemoryAnswer, maxLines = 6): string[] {
  if (answer.empty) return [answer.headline]

  const lines: string[] = [answer.headline]
  if (answer.latest) {
    lines.push(`Last: ${shortDate(answer.latest.item.at)}`)
    lines.push(truncate(answer.latest.item.title, 40))
    if (answer.latest.item.body) {
      lines.push(truncate(answer.latest.item.body, 40))
    }
  }
  return lines.slice(0, maxLines)
}
