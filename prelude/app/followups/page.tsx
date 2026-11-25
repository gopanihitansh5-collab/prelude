import { Shell } from '../components/shell'
import { detectCommitments, openCommitments, type Commitment } from '@/core/commitments'
import { getBriefedMeetings } from '@/lib/meetings'
import { relTime } from '@/core/format'

export const dynamic = 'force-dynamic'

/**
 * Follow-up radar.
 *
 * The spec calls this one of the highest-value features, and it is the one that
 * makes Prelude useful *between* meetings rather than only nine minutes before
 * one. It costs nothing extra: the detector already runs for the brief screen.
 *
 * Detection is deterministic. An LLM may propose a commitment, but the rules
 * that decide whether one is open, overdue or done are code — so they can be
 * tested and cannot drift with a model change.
 */
export default async function FollowupsPage() {
  const now = Date.now()
  const { meetings, mode } = await getBriefedMeetings()

  // Attach the meeting title at detection time, and prefix the id with the
  // meeting id so two meetings cannot produce colliding commitment ids.
  const all = meetings.flatMap((meeting) =>
    detectCommitments(meeting.thread, 'You', now, `${meeting.id}:`).map((commitment) => ({
      ...commitment,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
    })),
  )

  const open = openCommitments(all) as (Commitment & { meetingTitle: string })[]
  const overdue = open.filter((c) => c.status === 'overdue')

  return (
    <Shell
      title="follow-ups"
      active="followups"
      subtitle="Every promise the user made, across every meeting. Detection is deterministic — the rules that decide whether a commitment is open are code, not a model."
    >
      <div className="card">
        <h2>
          {open.length} open {open.length === 1 ? 'commitment' : 'commitments'}
          {overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}
        </h2>

        {open.length === 0 ? (
          <p className="row-sub" style={{ margin: 0 }}>
            Nothing open. With a live provider configured, this list grows from those threads.
          </p>
        ) : (
          open.map((commitment) => (
            <div
              key={commitment.id}
              style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}
            >
              <div className="row" style={{ border: 0, padding: 0 }}>
                <div>
                  <div className="row-title">{commitment.label}</div>
                  <div className="row-sub">{commitment.meetingTitle}</div>
                </div>
                <span
                  className="pill"
                  style={commitment.status === 'overdue' ? { color: '#ff9d9d' } : undefined}
                >
                  {commitment.status}
                </span>
              </div>
              <div className="row-sub" style={{ marginTop: 8 }}>
                “{commitment.source}”
              </div>
              <div className="row-sub" style={{ marginTop: 6 }}>
                promised {relTime(commitment.promisedAt, now)}
                {commitment.dueAt ? ` · due ${relTime(commitment.dueAt, now)}` : ''}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Source</h2>
        <p className="row-sub" style={{ margin: 0 }}>
          Reading {meetings.length} meetings · mode <span className="pill">{mode}</span>. The
          detector matches promise and request patterns, then extracts a deadline from phrases like
          “by Wednesday” or “next week”.
        </p>
      </div>
    </Shell>
  )
}
