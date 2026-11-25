// The Notion adapter. Real read and write, token held on the server only.
//
// Two operations matter for Prelude:
//   • search  — find the doc you last touched with this person
//   • execute — append a prep note to a page
//
// The adapter never throws on a provider error; it returns a typed result so the
// action lifecycle can decide between `failed` and `reconciling`.

import type {
  ActionRequest,
  ActionResult,
  Connection,
  IntegrationProvider,
  SearchQuery,
  SourceItem,
} from './types.ts'

const NOTION_VERSION = '2022-06-28'
const BASE = 'https://api.notion.com/v1'

export class NotionAdapter implements IntegrationProvider {
  readonly id = 'notion'
  readonly label = 'Notion'

  private readonly token: string
  private readonly pageId: string

  constructor(token: string, pageId: string) {
    this.token = token
    this.pageId = pageId
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    }
  }

  async connect(): Promise<Connection> {
    return this.getStatus()
  }

  async getStatus(): Promise<Connection> {
    const checkedAt = new Date().toISOString()
    try {
      const res = await fetch(`${BASE}/users/me`, { headers: this.headers() })
      if (res.status === 401) {
        return { provider: this.id, status: 'expired', checkedAt, error: 'token rejected' }
      }
      if (!res.ok) {
        return { provider: this.id, status: 'error', checkedAt, error: `HTTP ${res.status}` }
      }
      const body = (await res.json()) as { name?: string; bot?: { owner?: { workspace?: boolean } } }
      return {
        provider: this.id,
        status: 'connected',
        account: body.name ?? 'Notion workspace',
        checkedAt,
      }
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
    const res = await fetch(`${BASE}/search`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        query: query.text,
        page_size: query.limit ?? 5,
        filter: { property: 'object', value: 'page' },
      }),
    })
    if (!res.ok) return []

    const body = (await res.json()) as {
      results?: {
        id: string
        last_edited_time?: string
        properties?: Record<string, { title?: { plain_text?: string }[] }>
        url?: string
      }[]
    }

    return (body.results ?? []).map((page) => {
      const titleProp = Object.values(page.properties ?? {}).find((p) => p.title)
      const title = titleProp?.title?.map((t) => t.plain_text ?? '').join('') ?? 'Untitled'
      return {
        id: page.id,
        provider: this.id,
        kind: 'document' as const,
        title,
        body: '',
        at: page.last_edited_time ?? new Date().toISOString(),
        ...(page.url ? { url: page.url } : {}),
      }
    })
  }

  async getItem(id: string): Promise<SourceItem | null> {
    const res = await fetch(`${BASE}/pages/${id}`, { headers: this.headers() })
    if (!res.ok) return null
    const page = (await res.json()) as {
      id: string
      last_edited_time?: string
      url?: string
      properties?: Record<string, { title?: { plain_text?: string }[] }>
    }
    const titleProp = Object.values(page.properties ?? {}).find((p) => p.title)
    const title = titleProp?.title?.map((t) => t.plain_text ?? '').join('') ?? 'Untitled'
    return {
      id: page.id,
      provider: this.id,
      kind: 'document',
      title,
      body: '',
      at: page.last_edited_time ?? new Date().toISOString(),
      ...(page.url ? { url: page.url } : {}),
    }
  }

  /**
   * Append a prep note as a paragraph block.
   *
   * Notion does not accept an idempotency key, so a retry after a lost response
   * would duplicate the block. That is exactly the ambiguous case the lifecycle
   * models: the caller must reconcile before retrying.
   */
  async execute(action: ActionRequest): Promise<ActionResult> {
    if (action.kind !== 'note') {
      return { ok: false, delivered: action.text, error: `notion cannot ${action.kind}` }
    }
    if (!this.pageId) {
      return { ok: false, delivered: action.text, error: 'NOTION_PAGE_ID is not set' }
    }

    try {
      const res = await fetch(`${BASE}/blocks/${this.pageId}/children`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify({
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: { rich_text: [{ type: 'text', text: { content: action.text } }] },
            },
          ],
        }),
      })

      if (res.status >= 500) {
        // The provider may have written the block before failing.
        return { ok: false, delivered: action.text, error: `HTTP ${res.status}`, ambiguous: true }
      }
      if (!res.ok) {
        return { ok: false, delivered: action.text, error: `HTTP ${res.status}` }
      }

      const body = (await res.json()) as { results?: { id?: string }[] }
      return {
        ok: true,
        delivered: action.text,
        providerReference: body.results?.[0]?.id ?? 'notion-block',
      }
    } catch (err) {
      // A network error after the request left is ambiguous by definition.
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
