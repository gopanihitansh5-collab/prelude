// The action lifecycle. Pure, deterministic, and the safety boundary.
//
// The rule from the spec that matters most:
//
//   "Never let model selection change the safety rules."
//
// So this file knows nothing about LLMs. A model may *propose* an action; only
// this state machine may authorise and execute one. Every transition is a pure
// function, so every safety property is a test.
//
//   CREATED → VALIDATED → AWAITING_CONFIRMATION → AUTHORIZED
//           → EXECUTING → PROVIDER_CONFIRMED → RECEIPT_PERSISTED
//
// Failure is a first-class state, not an exception.

export type ActionStatus =
  | 'created'
  | 'validated'
  | 'awaiting_confirmation'
  | 'authorized'
  | 'executing'
  | 'provider_confirmed'
  | 'receipt_persisted'
  | 'failed'
  | 'reconciling'

export type ActionKind = 'reply' | 'note' | 'agenda' | 'join'

export interface ActionRecord {
  /** Stable id, e.g. act_<ulid-ish>. */
  id: string
  kind: ActionKind
  meetingId: string
  /** The exact text that will be delivered. */
  text: string
  status: ActionStatus
  /** Idempotency key: the same key must never execute twice. */
  idempotencyKey: string
  createdAt: string
  updatedAt: string
  /** Set once the provider answers. */
  providerReference?: string
  /** Set when status is failed. */
  error?: string
  /** How many execution attempts have been made. */
  attempts: number
}

/** The transitions the machine allows. Anything else is a bug, not a runtime error. */
const ALLOWED: Record<ActionStatus, ActionStatus[]> = {
  created: ['validated', 'failed'],
  validated: ['awaiting_confirmation', 'failed'],
  awaiting_confirmation: ['authorized', 'failed'],
  authorized: ['executing', 'failed'],
  executing: ['provider_confirmed', 'reconciling', 'failed'],
  // An ambiguous network failure: the provider may or may not have acted.
  reconciling: ['provider_confirmed', 'failed'],
  provider_confirmed: ['receipt_persisted'],
  receipt_persisted: [],
  failed: [],
}

export function canTransition(from: ActionStatus, to: ActionStatus): boolean {
  return ALLOWED[from].includes(to)
}

export function isTerminal(status: ActionStatus): boolean {
  return ALLOWED[status].length === 0
}

/** True when the action has actually reached the outside world. */
export function isDelivered(status: ActionStatus): boolean {
  return status === 'provider_confirmed' || status === 'receipt_persisted'
}

/**
 * A deterministic idempotency key.
 *
 * Two taps on the same action for the same meeting must not send twice. The key
 * is derived from the things that define "the same action", so a retry after a
 * lost response reuses it and the provider can dedupe.
 */
export function idempotencyKey(meetingId: string, kind: ActionKind, text: string): string {
  const payload = `${meetingId}|${kind}|${text.trim().toLowerCase()}`
  // FNV-1a, 32-bit. Not a security hash — a stable dedupe token.
  let hash = 0x811c9dc5
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `idem_${hash.toString(16).padStart(8, '0')}`
}

export interface CreateActionInput {
  id: string
  kind: ActionKind
  meetingId: string
  text: string
  now: string
}

export function createAction(input: CreateActionInput): ActionRecord {
  return {
    id: input.id,
    kind: input.kind,
    meetingId: input.meetingId,
    text: input.text,
    status: 'created',
    idempotencyKey: idempotencyKey(input.meetingId, input.kind, input.text),
    createdAt: input.now,
    updatedAt: input.now,
    attempts: 0,
  }
}

export interface TransitionResult {
  ok: boolean
  record: ActionRecord
  /** Present when ok === false. */
  reason?: string
}

/**
 * Move an action to a new status. Refuses illegal transitions instead of
 * silently accepting them — a state machine that accepts anything is not a
 * safety boundary.
 */
export function transition(
  record: ActionRecord,
  to: ActionStatus,
  now: string,
  patch: Partial<Pick<ActionRecord, 'providerReference' | 'error'>> = {},
): TransitionResult {
  if (!canTransition(record.status, to)) {
    return {
      ok: false,
      record,
      reason: `illegal transition ${record.status} → ${to}`,
    }
  }

  const next: ActionRecord = {
    ...record,
    status: to,
    updatedAt: now,
    attempts: to === 'executing' ? record.attempts + 1 : record.attempts,
    ...(patch.providerReference ? { providerReference: patch.providerReference } : {}),
    ...(patch.error ? { error: patch.error } : {}),
  }

  return { ok: true, record: next }
}

/**
 * Validate an action before it can be authorised.
 *
 * This is where the safety rules live, and they are deterministic: no model
 * output can widen them.
 */
export interface ValidationContext {
  /** The meeting the action belongs to, if it exists. */
  meetingExists: boolean
  /** True when the user has confirmed this exact action. */
  userConfirmed: boolean
  /** Max characters we will ever send. */
  maxTextLength?: number
}

export interface ValidationResult {
  ok: boolean
  reason?: string
}

export function validateAction(record: ActionRecord, ctx: ValidationContext): ValidationResult {
  const maxLen = ctx.maxTextLength ?? 280

  if (!ctx.meetingExists) return { ok: false, reason: 'unknown meeting' }
  if (!ctx.userConfirmed) return { ok: false, reason: 'not confirmed by the user' }
  if (record.text.trim().length === 0) return { ok: false, reason: 'empty text' }
  if (record.text.length > maxLen) return { ok: false, reason: `text exceeds ${maxLen} characters` }
  if (record.kind === 'agenda') return { ok: false, reason: 'agenda is a read, not a write' }

  return { ok: true }
}

/**
 * Decide what to do after an execution attempt.
 *
 * The ambiguous case is the dangerous one: the provider may have processed the
 * request but the response was lost. Retrying blindly sends a duplicate
 * message. So an ambiguous failure goes to `reconciling`, never straight back
 * to `executing`.
 */
export type ExecutionOutcome =
  | { kind: 'confirmed'; providerReference: string }
  | { kind: 'rejected'; error: string }
  | { kind: 'ambiguous'; error: string }

export function afterExecution(
  record: ActionRecord,
  outcome: ExecutionOutcome,
  now: string,
): TransitionResult {
  switch (outcome.kind) {
    case 'confirmed':
      return transition(record, 'provider_confirmed', now, {
        providerReference: outcome.providerReference,
      })
    case 'rejected':
      return transition(record, 'failed', now, { error: outcome.error })
    case 'ambiguous':
      return transition(record, 'reconciling', now, { error: outcome.error })
  }
}

/**
 * A receipt is only ever built from a provider-confirmed record. It carries the
 * provider's own reference, so the lens can show something a screenshot cannot
 * fake.
 */
export interface Receipt {
  ok: boolean
  actionId: string
  status: ActionStatus
  delivered: string
  channel: string
  at: string
  providerReference?: string
  error?: string
}

export function buildReceipt(record: ActionRecord, channel: string): Receipt {
  const delivered = isDelivered(record.status)
  return {
    ok: delivered,
    actionId: record.id,
    status: record.status,
    // The delivered string is the record's text, which is what the provider
    // was given. It is never re-derived from a model response.
    delivered: record.text,
    channel,
    at: record.updatedAt,
    ...(record.providerReference ? { providerReference: record.providerReference } : {}),
    ...(record.error ? { error: record.error } : {}),
  }
}
