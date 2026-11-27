// The action executor. This is the only place a write happens.
//
// The flow, and why each step exists:
//
//   1. createAction      — a record with a deterministic idempotency key
//   2. validateAction    — deterministic safety rules; no model can widen them
//   3. transition        — created → validated → awaiting_confirmation → authorized
//   4. adapter.execute   — the provider call
//   5. afterExecution    — confirmed / rejected / ambiguous
//   6. buildReceipt      — only from a provider-confirmed record
//
// The ambiguous branch is the one that protects the user: if the provider may
// have acted but we could not confirm, the action goes to `reconciling` and is
// never retried blindly. Otherwise a lost response sends a duplicate message.

import {
  afterExecution,
  buildReceipt,
  createAction,
  idempotencyKey,
  transition,
  validateAction,
} from '@/core/action-lifecycle'
import type { ActionKind, ActionRecord, Receipt } from '@/core/action-lifecycle'
import { createRegistry } from '@/lib/integrations'
import { getActionStore } from '@/lib/action-store'
import { getMeetings } from '@/lib/meetings'

export interface ExecuteRequest {
  meetingId: string
  action: ActionKind
  text?: string
  /** The user tapped to confirm. Required for any write. */
  confirmed?: boolean
}

function newId(): string {
  return `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export async function getAction(id: string): Promise<ActionRecord | null> {
  return getActionStore().get(id)
}

/**
 * Every action this process has executed, newest first.
 *
 * The dashboard's /actions page reads this. With DATABASE_URL set the store is
 * Postgres, so the history survives a restart; without it the store is in-memory
 * and the page says so.
 */
export async function listActions(limit = 50): Promise<ActionRecord[]> {
  return getActionStore().list(limit)
}

/** True when the store survives a restart. */
export function actionStoreIsDurable(): boolean {
  return getActionStore().durable
}

export async function executeAction(request: ExecuteRequest): Promise<Receipt> {
  const now = new Date().toISOString()
  // Resolve against the same meeting source the lens reads, so a live Notion
  // meeting can actually be acted on instead of only demo fixtures.
  const { meetings } = await getMeetings()
  const meeting = meetings.find((m) => m.id === request.meetingId)
  const channel = meeting?.channel ?? 'demo'
  // The channel the receipt reports is the adapter's own id, in every branch —
  // otherwise a failure on a Notion meeting reports "notion" while the success
  // for the same meeting reports "demo", and the receipt stops being evidence.
  const adapter = createRegistry().forChannel(channel)
  const text = request.text ?? defaultText(request.action)
  const store = getActionStore()

  // 1. Create, or reuse the record for an identical action.
  //
  // The lookup key MUST be the key the record is stored under. It was not: the
  // store was queried with the raw "meeting|kind|text" payload while the record
  // carried its FNV hash, so the lookup never matched, a second record was
  // created and the retry hit the UNIQUE(idempotency_key) constraint — a 500
  // with an empty body instead of the original receipt. In-memory it was worse:
  // no constraint, so the retry simply sent the message twice.
  const key = idempotencyKey(request.meetingId, request.action, text)
  const existing = await store.getByIdempotencyKey(key)

  if (existing) {
    // A retry of an action that already reached the provider must not send
    // again. Return the receipt we already have, with the same channel the
    // first call reported so the two responses agree.
    if (existing.status === 'provider_confirmed' || existing.status === 'receipt_persisted') {
      return buildReceipt(existing, adapter.id)
    }
    // An action stuck in `reconciling` must be reconciled, not retried.
    if (existing.status === 'reconciling') {
      return buildReceipt(existing, adapter.id)
    }
    // A failed action stays failed for this content: re-walking the machine
    // from a terminal state would be an illegal transition, and silently
    // re-sending is exactly what the retry rule forbids.
    if (existing.status === 'failed') {
      return buildReceipt(existing, adapter.id)
    }
  }

  let record =
    existing ??
    createAction({ id: newId(), kind: request.action, meetingId: request.meetingId, text, now })
  if (!existing) {
    await store.save(record)
  }

  // 2. Validate. Deterministic rules only.
  const validation = validateAction(record, {
    meetingExists: Boolean(meeting),
    userConfirmed: request.confirmed !== false,
  })
  if (!validation.ok) {
    const failed = transition(record, 'failed', now, { error: validation.reason })
    await store.save(failed.record)
    return buildReceipt(failed.record, adapter.id)
  }

  // 3. Walk the lifecycle. Each step is checked; an illegal transition is a bug.
  for (const step of ['validated', 'awaiting_confirmation', 'authorized', 'executing'] as const) {
    const result = transition(record, step, now)
    if (!result.ok) {
      const failed = transition(record, 'failed', now, { error: result.reason })
      await store.save(failed.record)
      return buildReceipt(failed.record, adapter.id)
    }
    record = result.record
    await store.save(record)
  }

  // 4. Execute through the adapter for this channel.
  const result = await adapter.execute({
    kind: request.action,
    text,
    idempotencyKey: record.idempotencyKey,
  })

  // 5. Decide the outcome. Ambiguity is a state, not an error.
  const outcome = result.ok
    ? ({ kind: 'confirmed', providerReference: result.providerReference ?? 'unknown' } as const)
    : result.ambiguous
      ? ({ kind: 'ambiguous', error: result.error ?? 'unconfirmed' } as const)
      : ({ kind: 'rejected', error: result.error ?? 'rejected' } as const)

  const settled = afterExecution(record, outcome, new Date().toISOString())
  record = settled.record

  if (record.status === 'provider_confirmed') {
    const persisted = transition(record, 'receipt_persisted', new Date().toISOString())
    record = persisted.record
  }
  await store.save(record)

  // 6. The receipt is built from the record, never from the model's proposal.
  return buildReceipt(record, adapter.id)
}

function defaultText(action: ActionKind): string {
  switch (action) {
    case 'reply':
      return 'running 5 late'
    case 'note':
      return 'prep note'
    case 'join':
      return 'join link opened'
    case 'agenda':
      return 'agenda'
  }
}
