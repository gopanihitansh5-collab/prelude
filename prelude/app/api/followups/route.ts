import { NextResponse } from 'next/server'
import { detectCommitments, openCommitments } from '@/core/commitments'
import { getMeetings } from '@/lib/meetings'

export const dynamic = 'force-dynamic'

/**
 * The follow-up radar: every commitment the user owes, across all meetings.
 *
 * This is what makes Prelude useful *between* meetings, not only nine minutes
 * before one. The spec calls it one of the highest-value features, and it costs
 * nothing extra: the detector already runs for the brief screen.
 *
 * Reads the same meetings the lens does — live when a provider is configured.
 */
export async function GET() {
  const now = Date.now()
  // `getMeetings`, not `getBriefedMeetings`: this route only reads threads, so
  // running web enrichment here would fire one Exa search per thin meeting for
  // data that is then discarded.
  const { meetings, mode } = await getMeetings()

  const all = meetings.flatMap((meeting) =>
    detectCommitments(meeting.thread, 'You', now, `${meeting.id}:`).map((commitment) => ({
      ...commitment,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
    })),
  )

  const open = openCommitments(all)

  return NextResponse.json({
    ok: true,
    mode,
    count: open.length,
    overdue: open.filter((c) => c.status === 'overdue').length,
    commitments: open,
  })
}
