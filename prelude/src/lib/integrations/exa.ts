// The Exa adapter. Web search as a source of truth.
//
// Why this belongs in Prelude: the brief answers "who am I meeting". For a
// person you have never met, the answer is not in your thread — it is on the
// web. Exa turns a name into a one-line, citable fact that fits the lens.
//
// Read-only by design. Exa is a search provider, not a write target, so
// `execute` refuses every action rather than pretending to send something.

import type {
  ActionRequest,
  ActionResult,
  Connection,
  IntegrationProvider,
  SearchQuery,
  SourceItem,
} from './types.ts'

const BASE = 'https://api.exa.ai'
const TIMEOUT_MS = 8000

interface ExaResult {
  id?: string
  title?: string | null
  url?: string
  publishedDate?: string | null
  author?: string | null
  text?: string
  highlights?: string[]
}

export class ExaAdapter implements IntegrationProvider {
  readonly id = 'exa'
  readonly label = 'Web (Exa)'

  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private headers(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  async connect(): Promise<Connection> {
    return this.getStatus()
  }

  /**
   * Exa has no cheap "who am I" endpoint, so status is a real search with a
   * one-result cap. A 401 means the key is bad; anything else that answers is
   * a working key.
   */
  async getStatus(): Promise<Connection> {
    const checkedAt = new Date().toISOString()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${BASE}/search`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ query: 'prelude', numResults: 1 }),
        signal: controller.signal,
      })
      if (res.status === 401 || res.status === 403) {
        return { provider: this.id, status: 'expired', checkedAt, error: 'key rejected' }
      }
      if (!res.ok) {
        return { provider: this.id, status: 'error', checkedAt, error: `HTTP ${res.status}` }
      }
      return { provider: this.id, status: 'connected', account: 'Exa web search', checkedAt }
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

  async search(query: SearchQuery): Promise<SourceItem[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${BASE}/search`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          query: query.person ? `${query.person} ${query.text}`.trim() : query.text,
          numResults: query.limit ?? 3,
          // Highlights give a quotable sentence without paying for full text.
          contents: { highlights: { numSentences: 2, highlightsPerUrl: 1 } },
          type: 'auto',
        }),
        signal: controller.signal,
      })
      if (!res.ok) return []

      const body = (await res.json()) as { results?: ExaResult[] }
      return (body.results ?? []).map((result, index) => ({
        id: result.id ?? result.url ?? `exa-${index}`,
        provider: this.id,
        kind: 'document' as const,
        title: result.title ?? result.url ?? 'Web result',
        body: result.highlights?.[0] ?? result.text?.slice(0, 400) ?? '',
        at: result.publishedDate ?? new Date().toISOString(),
        ...(result.url ? { url: result.url } : {}),
        ...(result.author ? { author: result.author } : {}),
      }))
    } catch {
      return []
    } finally {
      clearTimeout(timer)
    }
  }

  async getItem(id: string): Promise<SourceItem | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${BASE}/contents`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ ids: [id], text: { maxCharacters: 800 } }),
        signal: controller.signal,
      })
      if (!res.ok) return null
      const body = (await res.json()) as { results?: ExaResult[] }
      const result = body.results?.[0]
      if (!result) return null
      return {
        id: result.id ?? id,
        provider: this.id,
        kind: 'document',
        title: result.title ?? result.url ?? 'Web result',
        body: result.text?.slice(0, 800) ?? '',
        at: result.publishedDate ?? new Date().toISOString(),
        ...(result.url ? { url: result.url } : {}),
        ...(result.author ? { author: result.author } : {}),
      }
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  /** Exa is read-only. Refuse rather than silently succeed. */
  async execute(action: ActionRequest): Promise<ActionResult> {
    return {
      ok: false,
      delivered: action.text,
      error: 'exa is a read-only source; it cannot deliver an action',
    }
  }

  async disconnect(): Promise<void> {
    // The key lives in the environment; there is nothing to revoke locally.
  }
}
