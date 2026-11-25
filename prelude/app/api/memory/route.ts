import { NextResponse } from 'next/server'
import { recall } from '@/core/memory'
import { getBriefedMeetings } from '@/lib/meetings'
import type { SourceItem } from '@/lib/integrations/types'

export const dynamic = 'force-dynamic'

/**
 * Cross-source recall.
 *
 * The spec's example: "Have we discussed the enterprise pricing before?"
 * → YES · 2 discussions / Last: Nov 22 / ...
 *
 * The index is built from the meetings the app actually has — live Notion pages
 * when a database is configured, fixtures otherwise. When the adapters are wired
 * to real providers, this route feeds their `search()` results into the same
 * `recall()` function; the answer shape does not change.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? ''
  if (!query) {
    return NextResponse.json({ ok: false, error: 'q is required' }, { status: 400 })
  }

  const { meetings, mode } = await getBriefedMeetings()

  const index: SourceItem[] = meetings.flatMap((meeting) =>
    meeting.thread.map((message, i) => ({
      id: `${meeting.id}-${i}`,
      provider: meeting.channel,
      kind: 'message' as const,
      title: `${message.from} · ${meeting.title}`,
      body: message.text,
      at: message.at,
      author: message.from,
    })),
  )

  const answer = recall(index, query, Date.now())
  return NextResponse.json({ ok: true, query, mode, ...answer })
}
