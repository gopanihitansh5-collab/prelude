// Action ranking and the state machine.
//
// The reducer is the whole app's behaviour in one pure function. The Even layer
// only translates gestures into Inputs and paints the result; every decision
// about what a tap means lives here, where it can be tested.
//
// Design rules encoded below:
//   â€¢ Reply leads when the meeting is imminent â€” that is the most common need.
//   â€¢ "Join now" only appears in the last five minutes.
//   â€¢ The agenda only appears when there is one.
//   â€¢ Double-tap is "back" everywhere except the root, where it must exit.
//   â€¢ Voice never commits on its own: REVIEW is a mandatory state.

import { nextMeeting, upcoming } from './brief.ts'
import { NOTE_PRESETS, REPLY_PRESETS } from './types.ts'
import type { Action, AppState, Meeting, Receipt } from './types.ts'
import { initialVoice, transitionVoice } from './voice.ts'
import type { VoiceState } from './voice.ts'

export type Input =
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'click' }
  | { type: 'double_click' }
  | { type: 'long_press' }
  | { type: 'long_press_release' }
  | { type: 'receipt'; receipt: Receipt }
  | { type: 'busy'; busy: boolean }
  | { type: 'tick'; now: number }
  | {
      type: 'voice'
      to: VoiceState
      transcript?: string
      proposal?: { action: 'reply' | 'note' | 'agenda' | 'join'; text: string }
      error?: string
    }
  | { type: 'memory'; query: string }

export interface Effect {
  /** What the controller should do after the reducer returns. */
  kind: 'none' | 'act' | 'listen' | 'exit' | 'refresh' | 'transcribe'
  action?: Action
  meetingId?: string
}

export interface ReduceResult {
  state: AppState
  effect: Effect
}

export function initialState(meetings: Meeting[], nowMs: number): AppState {
  return {
    screen: 'brief',
    meetings,
    meetingIndex: 0,
    actionIndex: 0,
    noteIndex: 0,
    agendaPage: 0,
    receipt: null,
    busy: false,
    now: nowMs,
    replyIndex: 0,
  }
}

export function currentMeeting(state: AppState): Meeting | null {
  return state.meetings[state.meetingIndex] ?? null
}

/**
 * Rank the actions for a meeting. The order is the product decision:
 * replying is the most common thing you need to do before a meeting, so it
 * leads; the agenda is the least urgent, so it trails.
 */
export function rankActions(meeting: Meeting, nowMs: number, replyIndex = 0): Action[] {
  const startsIn = (Date.parse(meeting.startsAt) - nowMs) / 60000
  const actions: Action[] = []

  const replyScore = startsIn <= 15 ? 100 : startsIn <= 60 ? 70 : 40
  const preset = REPLY_PRESETS[replyIndex % REPLY_PRESETS.length] ?? REPLY_PRESETS[0]
  actions.push({
    kind: 'reply',
    label: `Reply: ${preset}`,
    payload: preset,
    score: replyScore,
  })

  actions.push({ kind: 'note', label: 'Add prep note', score: 80 })

  if (meeting.agenda.length > 0) {
    actions.push({
      kind: 'agenda',
      label: `Open agenda (${meeting.agenda.length})`,
      score: 60,
    })
  }

  if (startsIn <= 5 && startsIn >= -60) {
    actions.push({ kind: 'join', label: 'Join now', score: 90 })
  }

  return actions.sort((a, b) => b.score - a.score)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function moveMeeting(state: AppState, delta: number): AppState {
  const list = upcoming(state.meetings, state.now)
  if (list.length === 0) return state
  const current = currentMeeting(state)
  const currentIdx = current ? list.findIndex((m) => m.id === current.id) : -1
  const nextIdx = clamp((currentIdx === -1 ? 0 : currentIdx) + delta, 0, list.length - 1)
  const target = list[nextIdx]
  if (!target) return state
  const absolute = state.meetings.findIndex((m) => m.id === target.id)
  if (absolute === -1) return state
  return { ...state, meetingIndex: absolute, actionIndex: 0, agendaPage: 0, noteIndex: 0 }
}

export function reduce(state: AppState, input: Input): ReduceResult {
  const noEffect: Effect = { kind: 'none' }

  switch (input.type) {
    case 'tick':
      return { state: { ...state, now: input.now }, effect: noEffect }

    case 'busy':
      return { state: { ...state, busy: input.busy }, effect: noEffect }

    case 'memory':
      return { state: { ...state, screen: 'memory', memoryQuery: input.query }, effect: noEffect }

    case 'voice': {
      const session = state.voice ?? initialVoice()
      const result = transitionVoice(session, input.to, {
        ...(input.transcript !== undefined ? { transcript: input.transcript } : {}),
        ...(input.proposal !== undefined ? { proposal: input.proposal } : {}),
        ...(input.error !== undefined ? { error: input.error } : {}),
      })
      if (!result.ok) return { state, effect: noEffect }
      return { state: { ...state, voice: result.session, screen: 'voice' }, effect: noEffect }
    }

    case 'receipt':
      return {
        state: { ...state, receipt: input.receipt, busy: false, screen: 'receipt' },
        effect: noEffect,
      }

    case 'double_click':
      // Root page must raise the system exit dialog. From any other screen,
      // double-tap is "back" â€” the same gesture the OS uses for back.
      if (state.screen === 'brief') return { state, effect: { kind: 'exit' } }
      return { state: { ...state, screen: 'brief', busy: false }, effect: noEffect }

    case 'long_press':
      // Hold means "speak". Only meaningful on the brief screen.
      if (state.screen === 'brief') return { state, effect: { kind: 'listen' } }
      return { state, effect: noEffect }

    case 'long_press_release':
      return { state, effect: noEffect }

    case 'up':
    case 'down': {
      const delta = input.type === 'down' ? 1 : -1
      switch (state.screen) {
        case 'brief':
          return { state: moveMeeting(state, delta), effect: noEffect }
        case 'actions': {
          const meeting = currentMeeting(state)
          if (!meeting) return { state, effect: noEffect }
          const actions = rankActions(meeting, state.now, state.replyIndex)
          const actionIndex = clamp(state.actionIndex + delta, 0, Math.max(0, actions.length - 1))
          return { state: { ...state, actionIndex }, effect: noEffect }
        }
        case 'note': {
          const noteIndex = clamp(state.noteIndex + delta, 0, NOTE_PRESETS.length - 1)
          return { state: { ...state, noteIndex }, effect: noEffect }
        }
        case 'agenda': {
          const meeting = currentMeeting(state)
          if (!meeting) return { state, effect: noEffect }
          const pages = Math.max(1, Math.ceil(meeting.agenda.length / 4))
          const agendaPage = clamp(state.agendaPage + delta, 0, pages - 1)
          return { state: { ...state, agendaPage }, effect: noEffect }
        }
        default:
          return { state, effect: noEffect }
      }
    }

    case 'click': {
      const meeting = currentMeeting(state)
      switch (state.screen) {
        case 'brief':
          if (!meeting) return { state, effect: noEffect }
          return { state: { ...state, screen: 'actions', actionIndex: 0 }, effect: noEffect }

        case 'actions': {
          if (!meeting) return { state, effect: noEffect }
          const actions = rankActions(meeting, state.now, state.replyIndex)
          const action = actions[state.actionIndex]
          if (!action) return { state, effect: noEffect }

          if (action.kind === 'agenda') {
            return { state: { ...state, screen: 'agenda', agendaPage: 0 }, effect: noEffect }
          }
          if (action.kind === 'note') {
            return { state: { ...state, screen: 'note', noteIndex: 0 }, effect: noEffect }
          }
          return {
            state: { ...state, busy: true },
            effect: { kind: 'act', action, meetingId: meeting.id },
          }
        }

        case 'note': {
          if (!meeting) return { state, effect: noEffect }
          const text = NOTE_PRESETS[state.noteIndex] ?? NOTE_PRESETS[0]
          const action: Action = { kind: 'note', label: `Note: ${text}`, payload: text, score: 80 }
          return {
            state: { ...state, busy: true },
            effect: { kind: 'act', action, meetingId: meeting.id },
          }
        }

        case 'agenda':
        case 'memory':
        case 'followup':
          return { state: { ...state, screen: 'brief' }, effect: noEffect }

        case 'voice': {
          // The voice screen's tap is the confirmation step. It may only
          // execute from `confirmed`, which is only reachable through `review`.
          const session = state.voice
          if (!session) return { state, effect: noEffect }
          if (session.state === 'review' && session.proposal) {
            const confirmed = transitionVoice(session, 'confirmed').session
            const action: Action = {
              kind: session.proposal.action,
              label: session.proposal.text,
              payload: session.proposal.text,
              score: 100,
            }
            return {
              state: { ...state, voice: confirmed, busy: true },
              effect: { kind: 'act', action, meetingId: meeting?.id ?? '' },
            }
          }
          if (session.state === 'idle') {
            const listening = transitionVoice(session, 'listening').session
            return { state: { ...state, voice: listening }, effect: { kind: 'listen' } }
          }
          return { state, effect: noEffect }
        }

        case 'receipt':
          return { state: moveMeeting({ ...state, screen: 'brief', receipt: null }, 1), effect: noEffect }

        default:
          return { state, effect: noEffect }
      }
    }
  }
}

/** Convenience for the controller: the meeting the lens is currently about. */
export function meetingFor(state: AppState): Meeting | null {
  return currentMeeting(state) ?? nextMeeting(state.meetings, state.now)
}

