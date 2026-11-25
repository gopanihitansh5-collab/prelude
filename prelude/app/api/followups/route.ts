import { NextResponse } from 'next/server'
import { detectCommitments, openCommitments } from '@/core/commitments'
import { demoMeetings } from '@/core/fixtures'

export const dynamic = 'force-dynamic'

/**
 * The follow-up radar: every commitment the user owes, across all meetings.
 *
 * This is what makes Prelude useful *between* meetings, not only nine minutes
 * before one. The spec calls it one of the highest-value features, and it costs
 * nothing extra: the detector already runs for the brief screen.
 */
export async function GET() {
  const now = Date.now()
  const meetings = demoMeetings()

  const all = meetings.flatMap((meeting) =>
    detectCommitments(meeting.thread, 'You', now).map((commitment) => ({
      ...commitment,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
    })),
  )

  const open = openCommitments(all)

  return NextResponse.json({
    ok: true,
    count: open.length,
    overdue: open.filter((c) => c.status === 'overdue').length,
    commitments: open,
  })
}
