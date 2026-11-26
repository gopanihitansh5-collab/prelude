import { beforeEach, describe, expect, it } from 'vitest'
import {
  MemoryActionStore,
  PostgresActionStore,
  getActionStore,
  resetActionStore,
} from '../src/lib/action-store.ts'
import { createAction } from '../src/core/action-lifecycle.ts'
import type { ActionRecord } from '../src/core/action-lifecycle.ts'

const NOW = '2026-11-26T09:00:00Z'

function record(overrides: Partial<ActionRecord> = {}): ActionRecord {
  return {
    ...createAction({ id: 'act_1', kind: 'reply', meetingId: 'm1', text: 'running 5 late', now: NOW }),
    ...overrides,
  }
}

beforeEach(() => {
  resetActionStore()
})

describe('MemoryActionStore', () => {
  it('round-trips a record by id', async () => {
    const store = new MemoryActionStore()
    await store.save(record())
    const found = await store.get('act_1')
    expect(found?.text).toBe('running 5 late')
    expect(store.durable).toBe(false)
  })

  it('looks a record up by its idempotency key', async () => {
    const store = new MemoryActionStore()
    const saved = record()
    await store.save(saved)
    const found = await store.getByIdempotencyKey(saved.idempotencyKey)
    expect(found?.id).toBe('act_1')
  })

  it('replaces a record with the same id', async () => {
    const store = new MemoryActionStore()
    await store.save(record())
    await store.save(record({ status: 'receipt_persisted' }))
    expect((await store.get('act_1'))?.status).toBe('receipt_persisted')
    expect(await store.list()).toHaveLength(1)
  })

  it('lists newest first and honours the limit', async () => {
    const store = new MemoryActionStore()
    await store.save(record({ id: 'old', createdAt: '2026-11-26T08:00:00Z' }))
    await store.save(record({ id: 'new', createdAt: '2026-11-26T10:00:00Z' }))
    const list = await store.list(10)
    expect(list.map((r) => r.id)).toEqual(['new', 'old'])
    expect((await store.list(1)).map((r) => r.id)).toEqual(['new'])
  })

  it('evicts the oldest beyond the cap', async () => {
    const store = new MemoryActionStore()
    for (let i = 0; i < 501; i++) {
      await store.save(record({ id: `act_${i}`, text: `msg ${i}` }))
    }
    expect((await store.list(1000)).length).toBe(500)
    expect(await store.get('act_0')).toBeNull()
    expect(await store.get('act_500')).not.toBeNull()
  })
})

describe('getActionStore', () => {
  it('defaults to the in-memory store when DATABASE_URL is absent', () => {
    const store = getActionStore({})
    expect(store).toBeInstanceOf(MemoryActionStore)
    expect(store.durable).toBe(false)
  })

  it('uses the Postgres store when DATABASE_URL is set', () => {
    const store = getActionStore({ DATABASE_URL: 'postgres://user:pass@host/db' })
    expect(store).toBeInstanceOf(PostgresActionStore)
    expect(store.durable).toBe(true)
  })

  it('caches the chosen store, and resetActionStore clears it', () => {
    const first = getActionStore({})
    const second = getActionStore({ DATABASE_URL: 'postgres://user:pass@host/db' })
    expect(second).toBe(first)

    resetActionStore()
    const after = getActionStore({ DATABASE_URL: 'postgres://user:pass@host/db' })
    expect(after).not.toBe(first)
    expect(after).toBeInstanceOf(PostgresActionStore)
  })
})
