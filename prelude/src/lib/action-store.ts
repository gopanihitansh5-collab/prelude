// The action store.
//
// Two implementations behind one interface:
//
//   • Postgres (Neon) when DATABASE_URL is set. This is the real one: an action
//     survives a restart, and the history page shows what actually happened.
//   • In-memory otherwise. A local demo must work with zero setup, and a Map has
//     the same shape as the table, so the swap is contained.
//
// The rule that does not change: a receipt is built from the stored record, never
// from a model's proposal. Persisting the record is what makes that provable.

import type { ActionRecord, ActionStatus } from '@/core/action-lifecycle'

export interface ActionStore {
  /** Insert or replace one record. */
  save: (record: ActionRecord) => Promise<void>
  /** Look up by action id. */
  get: (id: string) => Promise<ActionRecord | null>
  /** Look up by idempotency key, so a retry finds the original. */
  getByIdempotencyKey: (key: string) => Promise<ActionRecord | null>
  /** Newest first, capped. */
  list: (limit?: number) => Promise<ActionRecord[]>
  /** True when this store survives a restart. */
  readonly durable: boolean
}

// ── in-memory ───────────────────────────────────────────────────────────────

interface MemoryState {
  byId: Map<string, ActionRecord>
  byKey: Map<string, string>
}

const globalForStore = globalThis as unknown as { __preludeActionStore?: MemoryState }

const memory: MemoryState =
  globalForStore.__preludeActionStore ??
  (globalForStore.__preludeActionStore = { byId: new Map(), byKey: new Map() })

const MAX_ACTIONS = 500

export class MemoryActionStore implements ActionStore {
  readonly durable = false

  async save(record: ActionRecord): Promise<void> {
    memory.byId.set(record.id, record)
    memory.byKey.set(record.idempotencyKey, record.id)

    // Evict the oldest so a long-running process cannot grow without bound.
    while (memory.byId.size > MAX_ACTIONS) {
      const oldest = memory.byId.keys().next()
      if (oldest.done) break
      const evicted = memory.byId.get(oldest.value)
      memory.byId.delete(oldest.value)
      if (evicted) memory.byKey.delete(evicted.idempotencyKey)
    }
  }

  async get(id: string): Promise<ActionRecord | null> {
    return memory.byId.get(id) ?? null
  }

  async getByIdempotencyKey(key: string): Promise<ActionRecord | null> {
    const id = memory.byKey.get(key)
    return id ? (memory.byId.get(id) ?? null) : null
  }

  async list(limit = 50): Promise<ActionRecord[]> {
    return [...memory.byId.values()]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit)
  }
}

// ── Postgres (Neon) ─────────────────────────────────────────────────────────

interface Row {
  id: string
  kind: string
  meeting_id: string
  text: string
  status: string
  idempotency_key: string
  created_at: string
  updated_at: string
  provider_reference: string | null
  error: string | null
  attempts: number
}

function toRecord(row: Row): ActionRecord {
  return {
    id: row.id,
    kind: row.kind as ActionRecord['kind'],
    meetingId: row.meeting_id,
    text: row.text,
    status: row.status as ActionStatus,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attempts: row.attempts ?? 0,
    ...(row.provider_reference ? { providerReference: row.provider_reference } : {}),
    ...(row.error ? { error: row.error } : {}),
  }
}

/**
 * The Neon-backed store.
 *
 * The driver is imported lazily so a deployment without DATABASE_URL never pays
 * for it, and so the in-memory path stays testable in plain Node.
 */
export class PostgresActionStore implements ActionStore {
  readonly durable = true

  constructor(private readonly connectionString: string) {}

  private async sql() {
    const { neon } = await import('@neondatabase/serverless')
    return neon(this.connectionString)
  }

  /** Create the table on first use. Idempotent, so it is safe on every boot. */
  private async ensureSchema(): Promise<void> {
    const sql = await this.sql()
    await sql`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        meeting_id TEXT NOT NULL,
        text TEXT NOT NULL,
        status TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        provider_reference TEXT,
        error TEXT,
        attempts INTEGER NOT NULL DEFAULT 0
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS actions_created_at_idx ON actions (created_at DESC)`
  }

  async save(record: ActionRecord): Promise<void> {
    await this.ensureSchema()
    const sql = await this.sql()
    await sql`
      INSERT INTO actions (
        id, kind, meeting_id, text, status, idempotency_key,
        created_at, updated_at, provider_reference, error, attempts
      ) VALUES (
        ${record.id}, ${record.kind}, ${record.meetingId}, ${record.text},
        ${record.status}, ${record.idempotencyKey}, ${record.createdAt},
        ${record.updatedAt}, ${record.providerReference ?? null}, ${record.error ?? null},
        ${record.attempts}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at,
        provider_reference = EXCLUDED.provider_reference,
        error = EXCLUDED.error,
        attempts = EXCLUDED.attempts
    `
  }

  async get(id: string): Promise<ActionRecord | null> {
    await this.ensureSchema()
    const sql = await this.sql()
    const rows = (await sql`SELECT * FROM actions WHERE id = ${id} LIMIT 1`) as Row[]
    return rows[0] ? toRecord(rows[0]) : null
  }

  async getByIdempotencyKey(key: string): Promise<ActionRecord | null> {
    await this.ensureSchema()
    const sql = await this.sql()
    const rows = (await sql`SELECT * FROM actions WHERE idempotency_key = ${key} LIMIT 1`) as Row[]
    return rows[0] ? toRecord(rows[0]) : null
  }

  async list(limit = 50): Promise<ActionRecord[]> {
    await this.ensureSchema()
    const sql = await this.sql()
    const rows = (await sql`
      SELECT * FROM actions ORDER BY created_at DESC LIMIT ${limit}
    `) as Row[]
    return rows.map(toRecord)
  }
}

// ── selection ───────────────────────────────────────────────────────────────

let cached: ActionStore | null = null

/**
 * The store for this process.
 *
 * Postgres when DATABASE_URL is present, in-memory otherwise. Cached so the
 * schema check runs once rather than on every request.
 */
export function getActionStore(env: Record<string, string | undefined> = process.env): ActionStore {
  if (cached) return cached
  const url = env.DATABASE_URL
  cached = url ? new PostgresActionStore(url) : new MemoryActionStore()
  return cached
}

/** Test hook: forget the cached store. */
export function resetActionStore(): void {
  cached = null
  memory.byId.clear()
  memory.byKey.clear()
}
