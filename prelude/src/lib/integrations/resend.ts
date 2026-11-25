// The Resend adapter. Email as a write target.
//
// Why this belongs in Prelude: "reply" is the most common action on the lens,
// and for an external attendee the reply is an email. Resend gives a real send
// with a real message id, which is exactly what the receipt needs.
//
// Idempotency: Resend accepts an `Idempotency-Key` header, so a retry after a
// lost response does not send twice. That makes this adapter safe to retry,
// unlike Notion.

import type {
  ActionRequest,
  ActionResult,
  Connection,
  IntegrationProvider,
  SearchQuery,
  SourceItem,
} from './types.ts'

const BASE = 'https://api.resend.com'
const TIMEOUT_MS = 10_000

export class ResendAdapter implements IntegrationProvider {
  readonly id = 'email'
  readonly label = 'Email (Resend)'

  private readonly apiKey: string
  private readonly from: string
  private readonly to: string

  constructor(apiKey: string, from: string, to: string) {
    this.apiKey = apiKey
    this.from = from
    this.to = to
  }

  private headers(idempotencyKey?: string): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    }
  }

  async connect(): Promise<Connection> {
    return this.getStatus()
  }

  /**
   * Resend has no read-only "who am I" endpoint, and a send-only key is a
   * perfectly valid key that 401s on every management route. So a 401 whose
   * body says `restricted_api_key` means the key is *good*, just scoped — not
   * expired. Only an unrecognised 401 is treated as a bad key.
   */
  async getStatus(): Promise<Connection> {
    const checkedAt = new Date().toISOString()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${BASE}/domains`, {
        headers: this.headers(),
        signal: controller.signal,
      })
      if (res.ok) {
        return { provider: this.id, status: 'connected', account: this.from || 'resend', checkedAt }
      }
      if (res.status === 401 || res.status === 403) {
        const body = (await res.json().catch(() => ({}))) as { name?: string }
        if (body.name === 'restricted_api_key') {
          return {
            provider: this.id,
            status: 'connected',
            account: this.from || 'resend',
            checkedAt,
          }
        }
        return { provider: this.id, status: 'expired', checkedAt, error: 'key rejected' }
      }
      return { provider: this.id, status: 'error', checkedAt, error: `HTTP ${res.status}` }
    } catch (err) {
      return {
        provider: this.id,
        status: 'error',
        checkedAt,
        error: err instanceof Error ? err.message : 'network error',
      }
    } finally {
      clearTimeout(timer)
    }
  }

  /** Resend has no search API. Return nothing rather than inventing results. */
  async search(_query: SearchQuery): Promise<SourceItem[]> {
    return []
  }

  async getItem(_id: string): Promise<SourceItem | null> {
    return null
  }

  async execute(action: ActionRequest): Promise<ActionResult> {
    if (action.kind !== 'reply') {
      return { ok: false, delivered: action.text, error: `email cannot ${action.kind}` }
    }
    if (!this.to) {
      return { ok: false, delivered: action.text, error: 'RESEND_TO is not set' }
    }
    if (!this.from) {
      return { ok: false, delivered: action.text, error: 'RESEND_FROM is not set' }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${BASE}/emails`, {
        method: 'POST',
        headers: this.headers(action.idempotencyKey),
        body: JSON.stringify({
          from: this.from,
          to: [this.to],
          subject: action.destination ?? 'Quick note',
          text: action.text,
        }),
        signal: controller.signal,
      })

      if (res.status >= 500) {
        // The provider may have accepted the message before failing.
        return { ok: false, delivered: action.text, error: `HTTP ${res.status}`, ambiguous: true }
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        return {
          ok: false,
          delivered: action.text,
          error: `HTTP ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`,
        }
      }

      const body = (await res.json()) as { id?: string }
      return {
        ok: true,
        delivered: action.text,
        providerReference: body.id ?? 'resend-email',
      }
    } catch (err) {
      return {
        ok: false,
        delivered: action.text,
        error: err instanceof Error ? err.message : 'network error',
        ambiguous: true,
      }
    } finally {
      clearTimeout(timer)
    }
  }

  async disconnect(): Promise<void> {
    // The key lives in the environment; there is nothing to revoke locally.
  }
}
