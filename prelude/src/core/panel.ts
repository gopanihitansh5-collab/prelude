// The panel renderer.
//
// The real G2 display is not three text bands. It is a panel layout: a date and
// battery in the header, a large dithered clock on the left, and a bordered list
// panel on the right with an icon per row. The product photography shows this
// clearly, and matching it is what makes a mirror look like the hardware rather
// than a terminal.
//
// This module produces a *structured* layout, not a string. Two consumers:
//   • the 3D scene, which paints it into a canvas texture
//   • the lens mirror, which renders it as DOM
//
// It is pure: no SDK, no DOM, no fetch. The three-band `render()` in layout.ts
// stays the source of truth for what the SDK containers actually receive — this
// is the visual layer on top, and it is derived from the same AppState so the
// two can never disagree about the facts.

import { buildBrief } from './brief.ts'
import { currentMeeting, rankActions } from './actions.ts'
import { commitmentLine, detectCommitments, topCommitment } from './commitments.ts'
import { clockTime, truncate } from './format.ts'
import type { AppState } from './types.ts'

export type PanelIcon = 'calendar' | 'clock' | 'location' | 'person' | 'doc' | 'check' | 'alert'

export interface PanelRow {
  icon: PanelIcon
  text: string
  /** Right-aligned secondary text, e.g. a time. */
  meta?: string
}

export interface PanelLayout {
  /** "Wed 11/12" */
  date: string
  /** 0..1, for the battery glyph. */
  battery: number
  /** Split so the renderer can stack them, as the hardware does. */
  clock: { hours: string; minutes: string }
  /** "21°C" — omitted when unknown. */
  weather?: string
  /** Notification count, shown as a bell glyph. */
  notifications?: number
  /** The bordered list panel on the right. */
  panel: {
    /** Optional heading inside the panel. */
    title?: string
    rows: PanelRow[]
  }
  /** A status strip at the foot, e.g. "Even AI Listening". */
  status?: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateLine(nowMs: number): string {
  const d = new Date(nowMs)
  const weekday = WEEKDAYS[d.getDay()] ?? 'Mon'
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${weekday} ${month}/${day}`
}

function clockParts(nowMs: number): { hours: string; minutes: string } {
  const text = clockTime(new Date(nowMs).toISOString())
  const [hours = '00', minutes = '00'] = text.split(':')
  return { hours, minutes }
}

/** The brief screen: who, what, the open commitment, the doc, the agenda. */
function briefPanel(state: AppState): PanelLayout['panel'] {
  const meeting = currentMeeting(state)
  if (!meeting) {
    return { rows: [{ icon: 'calendar', text: 'No meetings left today' }] }
  }

  const brief = buildBrief(meeting, state.now)
  const rows: PanelRow[] = []

  rows.push({ icon: 'person', text: truncate(brief.whoLine, 26) })
  rows.push({ icon: 'calendar', text: truncate(brief.title, 26), meta: brief.when })

  const top = topCommitment(detectCommitments(meeting.thread, 'You', state.now))
  if (top) {
    rows.push({ icon: 'alert', text: truncate(commitmentLine(top), 26) })
  } else if (brief.lastThread) {
    rows.push({ icon: 'doc', text: truncate(brief.lastThread, 26) })
  }

  if (brief.docLine) rows.push({ icon: 'doc', text: truncate(brief.docLine, 26) })
  if (meeting.agenda.length > 0) {
    rows.push({ icon: 'check', text: truncate(brief.agendaLine, 26) })
  }

  return { title: 'BRIEF', rows }
}

function actionsPanel(state: AppState): PanelLayout['panel'] {
  const meeting = currentMeeting(state)
  if (!meeting) return { rows: [{ icon: 'calendar', text: 'Nothing to act on' }] }

  const actions = rankActions(meeting, state.now)
  return {
    title: 'ACTIONS',
    rows: actions.slice(0, 5).map((action, index) => ({
      icon: index === state.actionIndex ? 'check' : 'doc',
      text: truncate(action.label, 26),
    })),
  }
}

function agendaPanel(state: AppState): PanelLayout['panel'] {
  const meeting = currentMeeting(state)
  if (!meeting || meeting.agenda.length === 0) {
    return { title: 'AGENDA', rows: [{ icon: 'calendar', text: 'No agenda items' }] }
  }

  const perPage = 4
  const start = state.agendaPage * perPage
  return {
    title: 'AGENDA',
    rows: meeting.agenda.slice(start, start + perPage).map((item, index) => ({
      icon: 'check',
      text: truncate(`${start + index + 1}. ${item.title}`, 24),
      ...(item.minutes ? { meta: `${item.minutes}m` } : {}),
    })),
  }
}

function receiptPanel(state: AppState): PanelLayout['panel'] {
  const receipt = state.receipt
  if (!receipt) {
    return { title: 'RECEIPT', rows: [{ icon: 'doc', text: 'No action yet' }] }
  }
  return {
    title: receipt.ok ? 'SENT' : 'FAILED',
    rows: [
      { icon: receipt.ok ? 'check' : 'alert', text: truncate(receipt.delivered, 26) },
      { icon: 'clock', text: clockTime(receipt.at) },
      ...(receipt.providerReference
        ? [{ icon: 'doc' as const, text: truncate(receipt.providerReference, 26) }]
        : []),
    ],
  }
}

/**
 * Build the panel layout for the current screen.
 *
 * The clock and date always come from `state.now`, so the mirror shows the same
 * time the glasses would.
 */
export function renderPanel(state: AppState): PanelLayout {
  let panel: PanelLayout['panel']

  switch (state.screen) {
    case 'actions':
      panel = actionsPanel(state)
      break
    case 'agenda':
      panel = agendaPanel(state)
      break
    case 'receipt':
      panel = receiptPanel(state)
      break
    case 'note':
      panel = {
        title: 'NOTE',
        rows: [{ icon: 'doc', text: 'Pick a prep note' }],
      }
      break
    case 'memory':
      panel = {
        title: 'MEMORY',
        rows: [{ icon: 'doc', text: truncate(state.memoryQuery ?? 'Ask a question', 26) }],
      }
      break
    case 'followup':
      panel = { title: 'FOLLOW-UP', rows: [{ icon: 'alert', text: 'Open commitments' }] }
      break
    case 'voice':
      panel = {
        title: 'VOICE',
        rows: [{ icon: 'person', text: state.voice?.state ?? 'idle' }],
      }
      break
    case 'brief':
    default:
      panel = briefPanel(state)
      break
  }

  const status =
    state.screen === 'voice' && state.voice?.state === 'listening'
      ? 'Even AI Listening'
      : state.busy
        ? 'Working…'
        : undefined

  return {
    date: dateLine(state.now),
    battery: 0.78,
    clock: clockParts(state.now),
    weather: '21°C',
    notifications: 20,
    panel,
    ...(status ? { status } : {}),
  }
}
