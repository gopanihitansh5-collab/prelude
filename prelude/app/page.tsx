import Link from 'next/link'
import { getMeetings } from '@/lib/meetings'
import { buildBrief } from '@/core/brief'
import { relTime } from '@/core/format'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { meetings, mode } = await getMeetings()
  const now = Date.now()

  return (
    <main className="shell">
      <div className="topbar">
        <h1 className="brand">
          Prelude <span>the brief before your next meeting</span>
        </h1>
        <nav className="nav">
          <Link href="/lens">Lens</Link>
          <Link href="/dashboard">Dashboard</Link>
          <a href="/api/health">API</a>
        </nav>
      </div>

      <p className="lede">
        One card before your next meeting on Even Realities G2: <strong>who</strong>, the last thread,
        the doc you last touched — and <strong>one tap to act</strong>. The tap performs a real side
        effect and the lens shows the exact string that was delivered.
      </p>

      <div className="grid">
        <div>
          <div className="card">
            <h2>Today</h2>
            {meetings.map((meeting) => {
              const brief = buildBrief(meeting, now)
              return (
                <div className="row" key={meeting.id}>
                  <div>
                    <div className="row-title">{brief.title}</div>
                    <div className="row-sub">
                      {brief.whoLine} · {brief.agendaLine}
                    </div>
                  </div>
                  <span className="pill">{relTime(meeting.startsAt, now)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="card">
            <h2>Status</h2>
            <div className="row">
              <span className="row-sub">Data source</span>
              <span className={`pill ${mode === 'live' ? 'live' : ''}`}>{mode}</span>
            </div>
            <div className="row">
              <span className="row-sub">Meetings</span>
              <span className="pill">{meetings.length}</span>
            </div>
            <div className="row">
              <span className="row-sub">Track</span>
              <span className="pill">04 · AI Assistants &amp; Work</span>
            </div>
          </div>

          <div className="card">
            <h2>Try it</h2>
            <p className="row-sub" style={{ margin: 0 }}>
              Open the <Link href="/lens">lens</Link> at exactly 576×288 and drive it with the same
              four gestures the glasses send.
            </p>
            <div className="controls">
              <Link href="/lens">
                <button>Open lens →</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
