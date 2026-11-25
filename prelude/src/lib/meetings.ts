import { demoMeetings } from '@/core/fixtures'
import { meetingsFromNotionPages, type NotionPage } from '@/core/notion-map'
import type { Meeting } from '@/core/types'

const NOTION_VERSION = '2022-06-28'
const NOTION_BASE = 'https://api.notion.com/v1'
const QUERY_TIMEOUT_MS = 4000

export interface MeetingsResult {
  meetings: Meeting[]
  mode: 'demo' | 'live'
  /** Why the live path fell back, when it did. Never a token. */
  note?: string
}

/**
 * Query a Notion database for pages that look like meetings.
 *
 * Returns an error rather than throwing so the caller can fall back to the demo
 * set without the lens ever showing a half-loaded screen.
 */
async function queryNotion(
  token: string,
  databaseId: string,
): Promise<{ pages: NotionPage[] } | { error: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)
  try {
    const res = await fetch(`${NOTION_BASE}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 25,
        sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      }),
      signal: controller.signal,
    })

    if (res.status === 401) return { error: 'notion token rejected' }
    if (res.status === 404) {
      return { error: 'notion database not found or not shared with the integration' }
    }
    if (!res.ok) return { error: `notion HTTP ${res.status}` }

    const body = (await res.json()) as { results?: NotionPage[] }
    return { pages: body.results ?? [] }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return { error: 'notion query timed out' }
    return { error: err instanceof Error ? err.message : 'notion network error' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The one place the app reads meetings from.
 *
 * Live when NOTION_TOKEN and NOTION_DATABASE_ID are both set and the query
 * succeeds. Otherwise fixtures, with `mode: 'demo'` and a `note` explaining the
 * fallback — the same honesty rule the rest of the app follows. Nothing above
 * this function changes: the lens only ever sees Meeting[].
 */
export async function getMeetings(): Promise<MeetingsResult> {
  const token = process.env.NOTION_TOKEN
  const databaseId = process.env.NOTION_DATABASE_ID

  if (!token || !databaseId) {
    return { meetings: demoMeetings(), mode: 'demo' }
  }

  const result = await queryNotion(token, databaseId)
  if ('error' in result) {
    return { meetings: demoMeetings(), mode: 'demo', note: result.error }
  }

  const meetings = meetingsFromNotionPages(result.pages)
  if (meetings.length === 0) {
    return {
      meetings: demoMeetings(),
      mode: 'demo',
      note: 'notion returned no pages with a title and a date',
    }
  }

  return { meetings, mode: 'live' }
}
