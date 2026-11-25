import Link from 'next/link'
import { getMeetings } from '@/lib/meetings'
import { buildBrief } from '@/core/brief'
import { rankActions } from '@/core/actions'

export const dynamic = 'force-dynamic'

/**
 * The companion dashboard. This is the part a phone or a laptop sees — the
 * place where a user connects Notion, picks which calendars matter, and reads
 * the same briefs the glasses show. It is deliberately not a second product:
 * it renders the same Brief objects the lens renders.
 */
export default async function DashboardPage() {
  const { meetings, mode } = await getMeetings()
  const now = Date.now()

  return (
    <main className="shell">
      <div className="topbar">
        <h1 className="brand">
          Prelude <span>dashboard</span>
        </h1>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/lens">Lens</Link>
        </nav>
      </div>

      <div className="grid">
        <div>
          <div className="card">
            <h2>Upcoming briefs</h2>
            {meetings.map((meeting) => {
              const brief = buildBrief(meeting, now)
              const actions = rankActions(meeting, now)
              return (
                <div key={meeting.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                  <div className="row" style={{ border: 0, padding: 0 }}>
                    <div>
                      <div className="row-title">{brief.title}</div>
                      <div className="row-sub">{brief.whoLine}</div>
                    </div>
                    <span className="pill">{brief.when}</span>
                  </div>
                  <div className="row-sub" style={{ marginTop: 8 }}>
                    {brief.lastFrom ? `${brief.lastFrom}: ` : ''}
                    {brief.lastThread}
                  </div>
                  <div className="row-sub" style={{ marginTop: 6 }}>
                    {brief.docLine ? `doc ${brief.docLine} · ` : ''}
                    {brief.agendaLine}
                  </div>
                  <div className="controls" style={{ marginTop: 10 }}>
                    {actions.map((action) => (
                      <span className="pill" key={action.kind}>
                        {action.label}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="card">
            <h2>Connections</h2>
            <div className="row">
              <span className="row-sub">Notion</span>
              <span className={`pill ${process.env.NOTION_TOKEN ? 'live' : ''}`}>
                {process.env.NOTION_TOKEN ? 'connected' : 'not connected'}
              </span>
            </div>
            <div className="row">
              <span className="row-sub">Slack</span>
              <span className={`pill ${process.env.SLACK_TOKEN ? 'live' : ''}`}>
                {process.env.SLACK_TOKEN ? 'connected' : 'not connected'}
              </span>
            </div>
            <div className="row">
              <span className="row-sub">Speech to text</span>
              <span className={`pill ${process.env.STT_API_KEY ? 'live' : ''}`}>
                {process.env.STT_API_KEY ? 'connected' : 'demo transcript'}
              </span>
            </div>
            <div className="row">
              <span className="row-sub">LLM routing</span>
              <span className={`pill ${process.env.OPENROUTER_API_KEY ? 'live' : ''}`}>
                {process.env.OPENROUTER_API_KEY ? 'OpenRouter' : 'keyword rules'}
              </span>
            </div>
          </div>

          <div className="card">
            <h2>How the write path works</h2>
            <p className="row-sub" style={{ margin: 0 }}>
              A tap on the lens calls <code>POST /api/act</code>. The server performs the action and
              returns the exact string it delivered. The lens renders that string verbatim, so the
              receipt cannot disagree with what was sent.
            </p>
            <p className="row-sub" style={{ marginTop: 10 }}>
              Mode: <span className={`pill ${mode === 'live' ? 'live' : ''}`}>{mode}</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
