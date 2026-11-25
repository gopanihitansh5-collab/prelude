// Pure domain types. Nothing in this file imports the SDK, the DOM, or fetch.
// That is deliberate: src/core/ must stay testable in plain Node.

import type { VoiceSession } from './voice.ts'

export type Screen =
  | 'brief'
  | 'actions'
  | 'agenda'
  | 'note'
  | 'memory'
  | 'followup'
  | 'voice'
  | 'receipt'

export interface Person {
  name: string
  handle?: string
  role?: string
}

export interface ThreadMessage {
  from: string
  text: string
  /** ISO 8601 */
  at: string
}

export interface DocRef {
  title: string
  /** ISO 8601 — when the user last touched it */
  touchedAt: string
}

export interface AgendaItem {
  title: string
  minutes?: number
}

export interface Meeting {
  id: string
  title: string
  /** ISO 8601 start time */
  startsAt: string
  /** ISO 8601 end time */
  endsAt: string
  attendees: Person[]
  /** Most recent messages with the primary attendee, newest first. */
  thread: ThreadMessage[]
  doc?: DocRef
  agenda: AgendaItem[]
  /** Where the meeting lives, for the receipt. */
  channel: 'notion' | 'slack' | 'email' | 'demo'
}

export type ActionKind = 'reply' | 'note' | 'agenda' | 'join'

export interface Action {
  kind: ActionKind
  /** Short label rendered on the lens, e.g. "Reply: running 5 late" */
  label: string
  /** The exact string that will be delivered, when the action sends text. */
  payload?: string
  /** Ranking weight; higher is more useful right now. */
  score: number
}

export interface Receipt {
  ok: boolean
  /** The exact string the server delivered. Never re-derived on the client. */
  delivered: string
  /** ISO 8601 */
  at: string
  channel: string
  /** Present when ok === false. */
  error?: string
  /** The provider's own reference, when it gave one. */
  providerReference?: string
  /** The lifecycle status the server reached. */
  status?: string
}

export interface AppState {
  screen: Screen
  meetings: Meeting[]
  /** Index into meetings. */
  meetingIndex: number
  /** Cursor inside the actions screen. */
  actionIndex: number
  /** Cursor inside the note screen's preset chips. */
  noteIndex: number
  /** Page inside the agenda screen. */
  agendaPage: number
  /** Last receipt, shown on the receipt screen. */
  receipt: Receipt | null
  /** True while a request is in flight — the lens shows a pending line. */
  busy: boolean
  /** Injected clock so tests are deterministic. */
  now: number
  /** The query the memory screen is answering. */
  memoryQuery?: string
  /** The voice session, when one is in progress. */
  voice?: VoiceSession
  /** Which reply preset the actions screen is offering. Cycles on swipe. */
  replyIndex: number
}

export const NOTE_PRESETS = [
  'Ask about the Q4 numbers',
  'Bring the pricing doc',
  'Decide: ship or slip',
] as const

export const REPLY_PRESETS = [
  'running 5 late',
  'can we do 15 min?',
  'sending the doc now',
] as const

// ── integration types ───────────────────────────────────────────────────────
// These live in core so `src/core/` never imports from `src/lib/`. The
// integration layer re-exports them; the dependency arrow points inward only.

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error'

export interface Connection {
  provider: string
  status: ConnectionStatus
  /** Human label, e.g. the workspace name. Never a token. */
  account?: string
  /** ISO 8601 */
  checkedAt: string
  error?: string
}

export interface SearchQuery {
  text: string
  /** Restrict to one person, when the brief is about them. */
  person?: string
  limit?: number
}

export interface SourceItem {
  id: string
  provider: string
  kind: 'message' | 'document' | 'event' | 'task'
  title: string
  /** Plain text, already stripped of markup. */
  body: string
  /** ISO 8601 */
  at: string
  /** Deep link, when the provider gives one. */
  url?: string
  author?: string
}

export interface ActionRequest {
  kind: ActionKind
  /** The exact text to deliver. */
  text: string
  /** Where it goes, when the caller knows. */
  destination?: string
  /** Dedupe token. The same key must never execute twice. */
  idempotencyKey: string
}

export interface ActionResult {
  ok: boolean
  /** The provider's own reference for the thing it created. */
  providerReference?: string
  /** The exact text the provider accepted. */
  delivered: string
  error?: string
  /** True when the provider may have acted but we could not confirm. */
  ambiguous?: boolean
}
