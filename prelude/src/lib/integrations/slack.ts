// The Slack adapter. Real read and write, token held on the server only.
//
// Slack is the one provider here that supports an idempotency signal: posting
// with the same `client_msg_id` twice does not create two messages. That makes
// the ambiguous-failure case recoverable, which is why the adapter passes the
// lifecycle's key straight through.

import type {
  ActionRequest,
  ActionResult,
  Connection,
  IntegrationProvider,
  SearchQuery,
  SourceItem,
} from './types.ts'

const BASE = 'https://slack.com/api'

export class SlackAdapter implements IntegrationProvider {
  readonly id = 'slack'
  readonly label = 'Slack'

  private readonly token: string
  private readonly channel: string

  constructor(token: string, channel: string) {
    this.token = token
    this.channel = channel
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json; charset=utf-8',
    }
  }

  async connect(): Promise<Connection> {
    return this.getStatus()
  }

  async getStatus(): Promise<Connection> {
    const checkedAt = new Date().toISOString()
    try {
      const res = await fetch(`${BASE}/auth.test`, { headers: this.headers() })
      const body = (await res.json()) as { ok: boolean; team?: string; error?: string }
      if (!body.ok) {
        const expired = body.error === 'invalid_auth' || body.error === 'token_expired'
        return {
          provider: this.id,
          status: expired ? 'expired' : 'error',
          checkedAt,
          error: body.error ?? 'slack error',
        }
      }
      return { provider: this.id, status: 'connected', account: body.team, checkedAt }
    } catch (err) {
      return {
        provider: this.id,
        status: 'error',
        checkedAt,
        error: err instanceof Error ? err.message : 'network error',
      }
    }
  }

  async search(query: SearchQuery): Promise<SourceItem[]> {
    const res = await fetch(`${BASE}/search.messages?query=${encodeURIComponent(query.text)}&count=${query.limit ?? 5}`, {
      headers: this.headers(),
    })
    if (!res.ok) return []
    const body = (await res.json()) as {
      ok: boolean
      messages?: { matches?: { ts?: string; text?: string; username?: string; permalink?: string }[] }
    }
    if (!body.ok) return []
    return (body.messages?.matches ?? []).map((m) => ({
      id: m.ts ?? '',
      provider: this.id,
      kind: 'message' as const,
      title: m.username ?? 'Slack message',
      body: m.text ?? '',
      at: m.ts ? new Date(Number(m.ts) * 1000).toISOString() : new Date().toISOString(),
      ...(m.permalink ? { url: m.permalink } : {}),
      ...(m.username ? { author: m.username } : {}),
    }))
  }

  async getItem(id: string): Promise<SourceItem | null> {
    const items = await this.search({ text: id, limit: 1 })
    return items[0] ?? null
  }

  async execute(action: ActionRequest): Promise<ActionResult> {
    if (action.kind !== 'reply') {
      return { ok: false, delivered: action.text, error: `slack cannot ${action.kind}` }
    }
    if (!this.channel) {
      return { ok: false, delivered: action.text, error: 'SLACK_CHANNEL is not set' }
    }

    try {
      const res = await fetch(`${BASE}/chat.postMessage`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          channel: this.channel,
          text: action.text,
          // Slack dedupes on this, so a retry after a lost response is safe.
          client_msg_id: action.idempotencyKey,
        }),
      })

      if (res.status >= 500) {
        return { ok: false, delivered: action.text, error: `HTTP ${res.status}`, ambiguous: true }
      }

      const body = (await res.json()) as { ok: boolean; ts?: string; error?: string }
      if (!body.ok) {
        return { ok: false, delivered: action.text, error: body.error ?? 'slack error' }
      }
      return {
        ok: true,
        delivered: action.text,
        providerReference: body.ts ?? 'slack-message',
      }
    } catch (err) {
      return {
        ok: false,
        delivered: action.text,
        error: err instanceof Error ? err.message : 'network error',
        ambiguous: true,
      }
    }
  }

  async disconnect(): Promise<void> {
    // Tokens are held in the environment; there is nothing to revoke locally.
  }
}
