// Turning raw calendar + thread + doc data into a Brief.
//
// A Brief is the one thing the lens shows: who, when, the last thread, the doc.
// Everything here is pure so the shape of the card can be tested without a
// display, a bridge, or a network.

import { relTime, truncate } from './format.ts'
import type { Meeting, Person, ThreadMessage } from './types.ts'

export interface Brief {
  meetingId: string
  /** "9m" / "now" / "2h" */
  when: string
  /** Primary attendee's display name. */
  who: string
  /** "Ada Lovelace · CTO" or just the name. */
  whoLine: string
  /** Meeting title, truncated to one line. */
  title: string
  /** The last message from them, one line. */
  lastThread: string
  /** Who sent that last message, for the "from" prefix. */
  lastFrom: string
  /** "Pricing v3 · 2d ago" or null when there is no doc. */
  docLine: string | null
  /** "3 items · 45m" */
  agendaLine: string
  /** How many attendees beyond the primary. */
  others: number
}

/** The person the brief is about: the first attendee that is not the user. */
export function primaryAttendee(meeting: Meeting, selfName?: string): Person {
  const others = meeting.attendees.filter((p) => p.name !== selfName)
  return others[0] ?? meeting.attendees[0] ?? { name: 'Someone' }
}

/** The newest message in the thread, or null when the thread is empty. */
export function lastMessage(meeting: Meeting): ThreadMessage | null {
  if (meeting.thread.length === 0) return null
  return [...meeting.thread].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0] ?? null
}

export function buildBrief(meeting: Meeting, nowMs: number, selfName?: string): Brief {
  const person = primaryAttendee(meeting, selfName)
  const last = lastMessage(meeting)

  const whoLine = person.role ? `${person.name} · ${person.role}` : person.name

  const docLine = meeting.doc
    ? `${truncate(meeting.doc.title, 26)} · ${relTime(meeting.doc.touchedAt, nowMs)}`
    : null

  const totalMinutes = meeting.agenda.reduce((sum, item) => sum + (item.minutes ?? 0), 0)
  const agendaLine =
    meeting.agenda.length === 0
      ? 'no agenda yet'
      : `${meeting.agenda.length} item${meeting.agenda.length === 1 ? '' : 's'}` +
        (totalMinutes > 0 ? ` · ${totalMinutes}m` : '')

  return {
    meetingId: meeting.id,
    when: relTime(meeting.startsAt, nowMs),
    who: person.name,
    whoLine,
    title: truncate(meeting.title, 40),
    lastThread: last ? truncate(last.text, 60) : 'no messages yet',
    lastFrom: last ? last.from : '',
    docLine,
    agendaLine,
    others: Math.max(0, meeting.attendees.length - 1),
  }
}

/** Meetings that have not ended yet, soonest first. */
export function upcoming(meetings: Meeting[], nowMs: number): Meeting[] {
  return meetings
    .filter((m) => Date.parse(m.endsAt) >= nowMs)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
}

/** The meeting that starts next, or the one in progress. */
export function nextMeeting(meetings: Meeting[], nowMs: number): Meeting | null {
  return upcoming(meetings, nowMs)[0] ?? null
}
