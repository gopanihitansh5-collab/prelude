// Enrichment: the fallback mechanism.
//
// The brief is only as good as what the app already knows. When the thread is
// empty and there is no doc — a first meeting with a stranger — the card has
// nothing to say. That is the gap this fills.
//
// The rule, in order:
//   1. If the meeting already has a thread or a doc, do nothing. Local facts
//      always beat web facts, and a search costs latency and money.
//   2. Otherwise ask the configured source (Exa) for one citable line about the
//      person, and attach it as a `doc` so the existing brief renders it.
//   3. If the search fails, returns nothing, or no key is set, return the
//      meeting unchanged. Enrichment is never allowed to break the brief.
//
// This is a *fallback*, not a dependency: with no EXA_API_KEY the app behaves
// exactly as before.

import type { Meeting } from '@/core/types'
import { ExaAdapter } from './integrations/exa.ts'

export interface EnrichmentResult {
  meeting: Meeting
  /** True when a web fact was attached. */
  enriched: boolean
  /** Why it was skipped or failed, for the dashboard. Never a token. */
  note?: string
}

/** A meeting is "thin" when the lens would have nothing specific to show. */
export function isThin(meeting: Meeting): boolean {
  return meeting.thread.length === 0 && !meeting.doc
}

/** The person the enrichment is about: the first attendee that is not the user. */
function subjectOf(meeting: Meeting, selfName: string): string | null {
  const other = meeting.attendees.find((p) => p.name !== selfName && p.name !== 'You')
  return other?.name ?? null
}

/**
 * Attach one web fact to a thin meeting.
 *
 * The fact becomes `meeting.doc`, so `buildBrief` renders it as
 * "Title · just now" with no change to the layout engine. That is deliberate:
 * enrichment must not add a new field the display budget has not accounted for.
 */
export async function enrichMeeting(
  meeting: Meeting,
  options: { selfName?: string; apiKey?: string; now?: number } = {},
): Promise<EnrichmentResult> {
  const apiKey = options.apiKey ?? process.env.EXA_API_KEY
  if (!apiKey) return { meeting, enriched: false, note: 'EXA_API_KEY is not set' }

  if (!isThin(meeting)) {
    return { meeting, enriched: false, note: 'meeting already has local context' }
  }

  const subject = subjectOf(meeting, options.selfName ?? 'You')
  if (!subject) return { meeting, enriched: false, note: 'no attendee to look up' }

  const adapter = new ExaAdapter(apiKey)
  const results = await adapter.search({
    text: `professional background and current role of ${subject}`,
    person: subject,
    limit: 1,
  })

  const top = results[0]
  if (!top) return { meeting, enriched: false, note: `no web result for ${subject}` }

  // Keep the line short enough for the doc slot: the brief truncates at 26
  // characters, so a long title would be cut mid-word. Prefer the highlight.
  const fact = (top.body || top.title).replace(/\s+/g, ' ').trim()
  if (!fact) return { meeting, enriched: false, note: 'web result had no text' }

  return {
    meeting: {
      ...meeting,
      doc: { title: fact.slice(0, 60), touchedAt: new Date(options.now ?? Date.now()).toISOString() },
    },
    enriched: true,
  }
}

/** Enrich every thin meeting, in parallel, never throwing. */
export async function enrichMeetings(
  meetings: Meeting[],
  options: { selfName?: string; apiKey?: string; now?: number } = {},
): Promise<{ meetings: Meeting[]; enrichedCount: number; notes: string[] }> {
  const results = await Promise.all(
    meetings.map((meeting) =>
      enrichMeeting(meeting, options).catch(() => ({
        meeting,
        enriched: false,
        note: 'enrichment failed',
      })),
    ),
  )

  return {
    meetings: results.map((r) => r.meeting),
    enrichedCount: results.filter((r) => r.enriched).length,
    notes: results.map((r) => r.note).filter((n): n is string => Boolean(n)),
  }
}
