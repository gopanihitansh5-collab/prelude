// The voice state machine.
//
// The spec is explicit: the microphone must have explicit states, and a
// cancellation path must exist at every stage.
//
//   IDLE → LISTENING → TRANSCRIBING → REVIEW → CONFIRMED → EXECUTING → RECEIPT
//
// The critical safety property: an LLM never executes from an unvalidated
// transcript. REVIEW is a mandatory state — the user sees the parsed action and
// taps to confirm. There is no path from TRANSCRIBING straight to EXECUTING.

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'review'
  | 'confirmed'
  | 'executing'
  | 'receipt'
  | 'cancelled'
  | 'error'

export interface VoiceSession {
  state: VoiceState
  /** The raw transcript, once STT returns. */
  transcript?: string
  /** The parsed action, once intent extraction returns. */
  proposal?: {
    action: 'reply' | 'note' | 'agenda' | 'join'
    text: string
  }
  error?: string
}

const ALLOWED: Record<VoiceState, VoiceState[]> = {
  idle: ['listening'],
  listening: ['transcribing', 'cancelled', 'error'],
  transcribing: ['review', 'cancelled', 'error'],
  // REVIEW is mandatory. There is no edge from transcribing to confirmed.
  review: ['confirmed', 'cancelled', 'error'],
  confirmed: ['executing', 'cancelled'],
  executing: ['receipt', 'error'],
  receipt: ['idle'],
  cancelled: ['idle'],
  error: ['idle'],
}

export function canTransitionVoice(from: VoiceState, to: VoiceState): boolean {
  return ALLOWED[from].includes(to)
}

export function initialVoice(): VoiceSession {
  return { state: 'idle' }
}

export interface VoiceTransition {
  ok: boolean
  session: VoiceSession
  reason?: string
}

export function transitionVoice(
  session: VoiceSession,
  to: VoiceState,
  patch: Partial<Pick<VoiceSession, 'transcript' | 'proposal' | 'error'>> = {},
): VoiceTransition {
  if (!canTransitionVoice(session.state, to)) {
    return { ok: false, session, reason: `illegal voice transition ${session.state} → ${to}` }
  }
  return {
    ok: true,
    session: {
      ...session,
      state: to,
      ...(patch.transcript !== undefined ? { transcript: patch.transcript } : {}),
      ...(patch.proposal !== undefined ? { proposal: patch.proposal } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
    },
  }
}

/**
 * The safety invariant, as a testable predicate.
 *
 * An action may only be executed when the session reached `confirmed` through
 * `review`. This is the rule that stops a misheard transcript from sending a
 * message.
 */
export function mayExecute(session: VoiceSession): boolean {
  return session.state === 'confirmed' && session.proposal !== undefined
}

/** True when the user can back out without side effects. */
export function canCancel(session: VoiceSession): boolean {
  return canTransitionVoice(session.state, 'cancelled')
}

/** One line for the lens, so the state is never invisible. */
export function voiceLine(session: VoiceSession): string {
  switch (session.state) {
    case 'idle':
      return 'tap to speak'
    case 'listening':
      return 'listening… tap to stop'
    case 'transcribing':
      return 'transcribing…'
    case 'review':
      return 'tap to confirm · double to cancel'
    case 'confirmed':
      return 'confirmed'
    case 'executing':
      return 'sending…'
    case 'receipt':
      return 'done'
    case 'cancelled':
      return 'cancelled'
    case 'error':
      return session.error ?? 'voice error'
  }
}
