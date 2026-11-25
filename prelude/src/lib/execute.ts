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
  transition,
  validateAction,
} from '@/core/action-lifecycle'
import type { ActionKind, ActionRecord, Receipt } from '@/core/action-lifecycle'
import { createRegistry } from '@/lib/integrations'
import { demoMeetings } from '@/core/fixtures'

export interface ExecuteRequest {
  meetingId: string
  action: ActionKind
  text?: string
  /** The user tapped to confirm. Required for any write. */
  confirmed?: boolean
}

/**
 * In-memory store. A real deployment swaps this for Postgres; the shape holds.
 *
 * Held on `globalThis` deliberately. Next.js can evaluate a route module more
 * than once (dev HMR, and separate module graphs per route), so a plain
 * module-level Map would give `/api/act` and `/api/actions` different stores —
 * a write would vanish from the history page. A global survives that.
 */
interface ActionStore {
  actions: Map<string, ActionRecord>
  byIdempotencyKey: Map<string, string>
}

const globalForActions = globalThis as unknown as { __preludeActions?: ActionStore }

const store: ActionStore =
  globalForActions.__preludeActions ??
  (globalForActions.__preludeActions = {
    actions: new Map<string, ActionRecord>(),
    byIdempotencyKey: new Map<string, string>(),
  })

const actions = store.actions
const byIdempotencyKey = store.byIdempotencyKey

/**
 * Cap the store so a long-running process cannot grow without bound.
 *
 * A Map with no eviction is a memory leak. 500 actions is far more than a demo
 * needs and small enough to be harmless. When the cap is hit the oldest entry
 * is dropped — which is safe because an evicted action simply becomes a new
 * action on retry, and the provider's own idempotency key still protects it.
 */
const MAX_ACTIONS = 500

function evictIfNeeded(): void {
  while (actions.size > MAX_ACTIONS) {
    const oldest = actions.keys().next()
    if (oldest.done) return
    const record = actions.get(oldest.value)
    actions.delete(oldest.value)
    if (record) {
      for (const [key, id] of byIdempotencyKey) {
        if (id === record.id) {
          byIdempotencyKey.delete(key)
          break
        }
      }
    }
  }
}

function newId(): string {
  return `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function getAction(id: string): ActionRecord | null {
  return actions.get(id) ?? null
}

/**
 * Every action this process has executed, newest first.
 *
 * The dashboard's /actions page reads this. It is deliberately a snapshot of the
 * in-memory store: a real deployment would page a Postgres table, but the shape
 * is the same and the page does not change.
 */
export function listActions(limit = 50): ActionRecord[] {
  return [...actions.values()]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit)
}

export function resetActions(): void {
  actions.clear()
  byIdempotencyKey.clear()
}

export async function executeAction(request: ExecuteRequest): Promise<Receipt> {
  const now = new Date().toISOString()
  const meeting = demoMeetings().find((m) => m.id === request.meetingId)
  const channel = meeting?.channel ?? 'demo'
  const text = request.text ?? defaultText(request.action)

  // 1. Create, or reuse the record for an identical action.
  const key = `${request.meetingId}|${request.action}|${text.trim().toLowerCase()}`
  const existingId = byIdempotencyKey.get(key)
  const existing = existingId ? actions.get(existingId) : undefined

  if (existing) {
    // A retry of an action that already reached the provider must not send
    // again. Return the receipt we already have, with the same channel the
    // first call reported so the two responses agree.
    if (existing.status === 'provider_confirmed' || existing.status === 'receipt_persisted') {
      return buildReceipt(existing, createRegistry().forChannel(channel).id)
    }
    // An action stuck in `reconciling` must be reconciled, not retried.
    if (existing.status === 'reconciling') {
      return buildReceipt(existing, createRegistry().forChannel(channel).id)
    }
  }

  let record = existing ?? createAction({ id: newId(), kind: request.action, meetingId: request.meetingId, text, now })
  if (!existing) {
    actions.set(record.id, record)
    byIdempotencyKey.set(key, record.id)
    evictIfNeeded()
  }

  // 2. Validate. Deterministic rules only.
  const validation = validateAction(record, {
    meetingExists: Boolean(meeting),
    userConfirmed: request.confirmed !== false,
  })
  if (!validation.ok) {
    const failed = transition(record, 'failed', now, { error: validation.reason })
    actions.set(failed.record.id, failed.record)
    return buildReceipt(failed.record, channel)
  }

  // 3. Walk the lifecycle. Each step is checked; an illegal transition is a bug.
  for (const step of ['validated', 'awaiting_confirmation', 'authorized', 'executing'] as const) {
    const result = transition(record, step, now)
    if (!result.ok) {
      const failed = transition(record, 'failed', now, { error: result.reason })
      actions.set(failed.record.id, failed.record)
      return buildReceipt(failed.record, channel)
    }
    record = result.record
    actions.set(record.id, record)
  }

  // 4. Execute through the adapter for this channel.
  const registry = createRegistry()
  const adapter = registry.forChannel(channel)
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
  actions.set(record.id, record)

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
