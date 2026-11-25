// Commitment detection — the feature that separates Prelude from a summary app.
//
// A summary tells you what was said. A commitment tells you what you owe.
//
//   "Pricing v3 · 3h ago"          ← a summary
//   "OPEN: Enterprise pricing promised"  ← a commitment
//
// This is pure and deterministic on purpose. An LLM may *propose* a commitment,
// but the rules that decide whether one is open, overdue, or done are code, so
// they can be tested and cannot drift with a model change.

import type { ThreadMessage } from './types.ts'

export type CommitmentStatus = 'open' | 'overdue' | 'done'

export interface Commitment {
  id: string
  /** Who owes it. "me" when the user promised; otherwise the other person. */
  owner: 'me' | 'them'
  /** The person the commitment is with. */
  person: string
  /** Short label for the lens, e.g. "Enterprise pricing". */
  label: string
  /** The sentence it was detected in, for the memory screen. */
  source: string
  /** ISO 8601 — when it was promised. */
  promisedAt: string
  /** ISO 8601 — when it is due, when the text names one. */
  dueAt?: string
  status: CommitmentStatus
}

/** Phrases that indicate the speaker is taking on an obligation. */
const PROMISE_PATTERNS = [
  /\bi(?:'ll| will)\s+(?:send|share|get|check|confirm|review|prepare|update|follow up|look into|come back)\b/i,
  /\bi(?:'m| am)\s+going to\s+(?:send|share|get|check|confirm|review|prepare|update)\b/i,
  /\blet me\s+(?:send|share|check|confirm|review|prepare|update)\b/i,
  /\bi owe you\b/i,
]

/** Phrases that indicate the other person is asking for something. */
const REQUEST_PATTERNS = [
  /\bcan you\s+(?:send|share|get|check|confirm|review|prepare|update)\b/i,
  /\bcould you\s+(?:send|share|get|check|confirm|review|prepare|update)\b/i,
  /\bplease\s+(?:send|share|confirm|review|update)\b/i,
  /\bneed(?:ed)?\s+(?:the|your|a)\b/i,
]

/** Words that name a deadline. */
const DEADLINE_PATTERNS: { pattern: RegExp; days: number }[] = [
  { pattern: /\btoday\b/i, days: 0 },
  { pattern: /\btomorrow\b/i, days: 1 },
  { pattern: /\bby (?:monday|tuesday|wednesday|thursday|friday)\b/i, days: 3 },
  { pattern: /\bthis week\b/i, days: 4 },
  { pattern: /\bnext week\b/i, days: 7 },
  { pattern: /\bby (?:end of|eod)\b/i, days: 1 },
]

/** The noun phrase a commitment is about, e.g. "enterprise pricing". */
function extractLabel(sentence: string): string {
  const cleaned = sentence
    .replace(/^(?:hi|hey|hello)[, ]+/i, '')
    .replace(/\b(?:i'll|i will|i'm going to|let me|can you|could you|please)\b/gi, '')
    .replace(/\b(?:send|share|get|check|confirm|review|prepare|update|follow up on|look into)\b/gi, '')
    .replace(/\b(?:the|a|an|your|my|me|you|it|that|this)\b/gi, '')
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length === 0) return 'follow-up'
  // Keep it to a few words so it fits one line on the lens.
  const words = cleaned.split(' ').slice(0, 4)
  return words.join(' ')
}

function detectDeadline(sentence: string, promisedAtMs: number): string | undefined {
  for (const { pattern, days } of DEADLINE_PATTERNS) {
    if (pattern.test(sentence)) {
      return new Date(promisedAtMs + days * 86_400_000).toISOString()
    }
  }
  return undefined
}

/** Split a message into sentences so one promise does not swallow the whole text. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Detect commitments in a thread.
 *
 * `selfName` is how the user appears in `from`. A message from the user creates
 * a commitment they owe; a message from anyone else creates one they are owed.
 */
export function detectCommitments(
  thread: ThreadMessage[],
  selfName: string,
  nowMs: number,
): Commitment[] {
  const found: Commitment[] = []

  for (const message of thread) {
    const fromMe = message.from === selfName || message.from === 'You'
    const promisedAtMs = Date.parse(message.at)
    if (Number.isNaN(promisedAtMs)) continue

    for (const sentence of sentences(message.text)) {
      const isPromise = PROMISE_PATTERNS.some((p) => p.test(sentence))
      const isRequest = REQUEST_PATTERNS.some((p) => p.test(sentence))
      if (!isPromise && !isRequest) continue

      const dueAt = detectDeadline(sentence, promisedAtMs)
      const overdue = dueAt ? Date.parse(dueAt) < nowMs : false

      found.push({
        id: `c_${found.length}_${promisedAtMs}`,
        owner: fromMe ? 'me' : 'them',
        person: fromMe ? 'you' : message.from,
        label: extractLabel(sentence),
        source: sentence,
        promisedAt: message.at,
        ...(dueAt ? { dueAt } : {}),
        status: overdue ? 'overdue' : 'open',
      })
    }
  }

  return found
}

/** Commitments the user owes, most urgent first. */
export function openCommitments(commitments: Commitment[]): Commitment[] {
  return commitments
    .filter((c) => c.owner === 'me' && c.status !== 'done')
    .sort((a, b) => {
      // Overdue first, then by due date, then oldest promise.
      if (a.status !== b.status) return a.status === 'overdue' ? -1 : 1
      const aDue = a.dueAt ? Date.parse(a.dueAt) : Infinity
      const bDue = b.dueAt ? Date.parse(b.dueAt) : Infinity
      if (aDue !== bDue) return aDue - bDue
      return Date.parse(a.promisedAt) - Date.parse(b.promisedAt)
    })
}

/** The single most important open commitment, for the brief screen. */
export function topCommitment(commitments: Commitment[]): Commitment | null {
  return openCommitments(commitments)[0] ?? null
}

/** One line for the lens: "OPEN: Enterprise pricing promised". */
export function commitmentLine(commitment: Commitment): string {
  const tag = commitment.status === 'overdue' ? 'OVERDUE' : 'OPEN'
  return `${tag}: ${commitment.label}`
}
