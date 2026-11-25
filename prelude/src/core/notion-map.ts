// Notion page → Meeting.
//
// Pure by design: this file takes the JSON shape Notion returns and produces the
// domain type the rest of the app already understands. No fetch, no token, no
// SDK — so the mapping is testable in plain Node and the network seam stays in
// `src/lib/meetings.ts`.
//
// The mapping is deliberately tolerant. A Notion database is user-authored, so
// property names vary ("Attendees" vs "People", "Agenda" vs "Topics"). We match
// on property *type* first and fall back to name heuristics, and we return null
// rather than inventing a meeting when the two required fields (title, date) are
// missing.

import type { AgendaItem, Meeting, Person } from './types.ts'

export interface NotionRichText {
  plain_text?: string
}

export interface NotionProperty {
  type?: string
  title?: NotionRichText[]
  rich_text?: NotionRichText[]
  date?: { start?: string | null; end?: string | null } | null
  people?: { name?: string; id?: string }[]
  select?: { name?: string } | null
  multi_select?: { name?: string }[]
  url?: string | null
}

export interface NotionPage {
  id: string
  url?: string
  last_edited_time?: string
  properties?: Record<string, NotionProperty>
}

const DEFAULT_DURATION_MIN = 30

function plain(richText?: NotionRichText[]): string {
  return (richText ?? [])
    .map((t) => t.plain_text ?? '')
    .join('')
    .trim()
}

function entries(props: Record<string, NotionProperty>): [string, NotionProperty][] {
  return Object.entries(props)
}

/** First property matching a predicate, as [name, property]. */
function findProp(
  props: Record<string, NotionProperty>,
  predicate: (name: string, prop: NotionProperty) => boolean,
): [string, NotionProperty] | null {
  for (const entry of entries(props)) {
    if (predicate(entry[0], entry[1])) return entry
  }
  return null
}

function titleOf(props: Record<string, NotionProperty>): string {
  const byType = findProp(props, (_name, prop) => prop.type === 'title' || Boolean(prop.title))
  if (byType) return plain(byType[1].title)
  const byName = findProp(props, (name) => /^(name|title)$/i.test(name))
  return byName ? plain(byName[1].title) : ''
}

function dateOf(props: Record<string, NotionProperty>): { start: string; end?: string } | null {
  // Notion databases routinely carry several date properties ("Due date",
  // "Follow-up", "Meeting date"). Take the first one that actually has a start,
  // not merely the first date-typed one — an empty earlier property must not
  // shadow a valid later one.
  const candidates = entries(props)
    .filter(([, prop]) => prop.type === 'date' || Boolean(prop.date))
    .map(([, prop]) => prop)

  for (const prop of candidates) {
    const start = prop.date?.start
    if (start) {
      const end = prop.date?.end
      return end ? { start, end } : { start }
    }
  }

  const byName = findProp(props, (name) => /date|when|time/i.test(name))?.[1]
  const start = byName?.date?.start
  if (!start) return null
  const end = byName?.date?.end
  return end ? { start, end } : { start }
}

function attendeesOf(props: Record<string, NotionProperty>): Person[] {
  // Same first-match-wins hazard as dateOf: an empty people property must not
  // hide a populated one.
  const peopleProps = entries(props)
    .filter(([, prop]) => prop.type === 'people' || Boolean(prop.people))
    .map(([, prop]) => prop)

  for (const prop of peopleProps) {
    const people = (prop.people ?? [])
      .map((p) => ({ name: (p.name ?? p.id ?? '').trim() }))
      .filter((p) => p.name.length > 0)
    if (people.length > 0) return people
  }

  const textProp = findProp(props, (name, prop) =>
    /attendee|people|participant|who/i.test(name) && Boolean(prop.rich_text),
  )
  if (!textProp) return []
  return plain(textProp[1].rich_text)
    .split(/[,;\n]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name }))
}

/** "Enterprise tier ceiling 15m" → { title, minutes: 15 } */
function parseAgendaLine(line: string): AgendaItem {
  const match = /^(.*?)\s*[·\-–:]?\s*(\d+)\s*m(?:in(?:ute)?s?)?$/i.exec(line)
  const title = match?.[1]?.trim()
  const minutes = match?.[2] ? Number(match[2]) : undefined
  if (title && minutes !== undefined && Number.isFinite(minutes)) return { title, minutes }
  return { title: line }
}

function agendaOf(props: Record<string, NotionProperty>): AgendaItem[] {
  const prop = findProp(props, (name, p) => /agenda|topic|item/i.test(name) && Boolean(p.rich_text))
  if (!prop) return []
  return plain(prop[1].rich_text)
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseAgendaLine)
}

function docOf(
  props: Record<string, NotionProperty>,
  page: NotionPage,
): Meeting['doc'] | undefined {
  const prop = findProp(props, (name, p) => /doc|note|prep|brief/i.test(name) && Boolean(p.rich_text))
  const title = prop ? plain(prop[1].rich_text) : ''
  if (!title) return undefined
  return { title, touchedAt: page.last_edited_time ?? new Date().toISOString() }
}

/**
 * Map one Notion page to a Meeting, or null when it cannot be one.
 *
 * Required: a title and a start date. Everything else degrades gracefully —
 * a page with no attendees still yields a meeting, because the brief engine
 * already handles an empty attendee list.
 */
export function mapNotionPage(page: NotionPage): Meeting | null {
  const props = page.properties ?? {}
  const title = titleOf(props)
  const date = dateOf(props)
  if (!title || !date) return null

  const startsAt = date.start
  const startMs = Date.parse(startsAt)
  // A present-but-malformed date must not throw out of a total function: one bad
  // page would otherwise 500 the whole briefs route.
  if (Number.isNaN(startMs)) return null

  const endsAt = date.end ?? new Date(startMs + DEFAULT_DURATION_MIN * 60_000).toISOString()

  return {
    id: page.id,
    title,
    startsAt,
    endsAt,
    attendees: attendeesOf(props),
    // Notion pages carry no conversation thread; the brief shows "no messages
    // yet" rather than a fabricated one.
    thread: [],
    ...(docOf(props, page) ? { doc: docOf(props, page) } : {}),
    agenda: agendaOf(props),
    channel: 'notion',
  }
}

/** Map a query result, dropping pages that cannot be meetings. */
export function meetingsFromNotionPages(pages: NotionPage[]): Meeting[] {
  return pages
    .map(mapNotionPage)
    .filter((meeting): meeting is Meeting => meeting !== null)
}
