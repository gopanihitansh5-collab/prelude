// The demo adapter. Implements the full contract with no credentials, so the
// app is demonstrable end to end and the receipt is still honest: it reports
// exactly what a real provider would have been given.
//
// This is the adapter that makes "no token → demo mode" a first-class path
// rather than a special case scattered through the routes.

import type {
  ActionRequest,
  ActionResult,
  Connection,
  IntegrationProvider,
  SearchQuery,
  SourceItem,
} from './types.ts'

export class DemoAdapter implements IntegrationProvider {
  readonly id = 'demo'
  readonly label = 'Demo workspace'

  private connected = true

  async connect(): Promise<Connection> {
    this.connected = true
    return this.getStatus()
  }

  async getStatus(): Promise<Connection> {
    return {
      provider: this.id,
      status: this.connected ? 'connected' : 'disconnected',
      account: 'demo@prelude.local',
      checkedAt: new Date().toISOString(),
    }
  }

  async search(query: SearchQuery): Promise<SourceItem[]> {
    const limit = query.limit ?? 5
    const items: SourceItem[] = [
      {
        id: 'demo-msg-1',
        provider: this.id,
        kind: 'message',
        title: 'Enterprise tier question',
        body: 'Numbers look right. One question on the enterprise tier before we lock it.',
        at: new Date(Date.now() - 42 * 60_000).toISOString(),
        author: 'Ada Lovelace',
      },
      {
        id: 'demo-doc-1',
        provider: this.id,
        kind: 'document',
        title: 'Pricing v3',
        body: 'Enterprise ceiling, annual vs monthly split, launch date.',
        at: new Date(Date.now() - 180 * 60_000).toISOString(),
      },
    ]
    const needle = query.text.toLowerCase()
    return items
      .filter((item) => !needle || `${item.title} ${item.body}`.toLowerCase().includes(needle))
      .slice(0, limit)
  }

  async getItem(id: string): Promise<SourceItem | null> {
    const all = await this.search({ text: '', limit: 50 })
    return all.find((item) => item.id === id) ?? null
  }

  /**
   * Demo execution. The delivered string is the request's text, unchanged —
   * which is exactly what a real provider would receive. The providerReference
   * is synthetic but stable per idempotency key, so a retry looks like a dedupe
   * rather than a second send.
   */
  async execute(action: ActionRequest): Promise<ActionResult> {
    if (action.kind === 'agenda') {
      return { ok: false, delivered: action.text, error: 'agenda is a read, not a write' }
    }
    if (action.text.trim().length === 0) {
      return { ok: false, delivered: action.text, error: 'empty text' }
    }
    return {
      ok: true,
      delivered: action.text,
      providerReference: `demo_${action.idempotencyKey}`,
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }
}
