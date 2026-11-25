import { Shell } from '../components/shell'
import { createRegistry } from '@/lib/integrations'
import { llmConfigured } from '@/lib/llm'

export const dynamic = 'force-dynamic'

/**
 * Connections.
 *
 * The rule this page exists to enforce: never claim an integration is live when
 * it is not. Each row is derived from the environment, and the three states are
 * visually distinct:
 *
 *   live    - a key is present and the adapter is registered
 *   ready   - the adapter is built but has no key
 *   planned - not built at all
 *
 * The status call is real: it asks the provider whether it accepts the key.
 */
export default async function ConnectionsPage() {
  const registry = createRegistry()
  const statuses = await Promise.all(registry.all().map((adapter) => adapter.getStatus()))
  const byProvider = new Map(statuses.map((status) => [status.provider, status]))

  // Notion's live read needs BOTH a token and a database id. A token alone
  // leaves getMeetings() on fixtures, so reporting it as live would be a lie.
  const notionLive = Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID)

  const rows = [
    {
      id: 'notion',
      label: 'Notion',
      access: 'read + write',
      use: 'Reads a database into meetings; appends prep notes as paragraph blocks.',
      env: 'NOTION_TOKEN, NOTION_DATABASE_ID',
      state: notionLive ? ('live' as const) : ('ready' as const),
      hint: process.env.NOTION_TOKEN && !process.env.NOTION_DATABASE_ID
        ? 'Token present but NOTION_DATABASE_ID is missing, so the read path stays on fixtures.'
        : undefined,
    },
    {
      id: 'email',
      label: 'Email (Resend)',
      access: 'write',
      use: 'Delivers a reply to an external attendee. Honours an Idempotency-Key header.',
      env: 'RESEND_API_KEY, RESEND_FROM, RESEND_TO',
      state: process.env.RESEND_API_KEY ? ('live' as const) : ('ready' as const),
    },
    {
      id: 'exa',
      label: 'Web (Exa)',
      access: 'read',
      use: 'Supplies one citable line when a meeting has no thread and no doc.',
      env: 'EXA_API_KEY',
      state: process.env.EXA_API_KEY ? ('live' as const) : ('ready' as const),
    },
    {
      id: 'slack',
      label: 'Slack',
      access: 'read + write',
      use: 'Posts with a client_msg_id, so a retry is safe rather than duplicated.',
      env: 'SLACK_TOKEN, SLACK_CHANNEL',
      state: process.env.SLACK_TOKEN ? ('live' as const) : ('ready' as const),
    },
    {
      id: 'llm',
      label: 'LLM (TokenRouter)',
      access: 'reason',
      use: 'Classifies a transcript with full context. May only propose an action.',
      env: 'LLM_API_KEY, LLM_BASE_URL, LLM_MODEL',
      state: llmConfigured() ? ('live' as const) : ('ready' as const),
    },
    {
      id: 'calendar',
      label: 'Google Calendar',
      access: 'read',
      use: 'Designed, not wired. The seam is getMeetings() in src/lib/meetings.ts.',
      env: '-',
      state: 'planned' as const,
    },
    {
      id: 'gmail',
      label: 'Gmail',
      access: 'read + write',
      use: 'Designed, not wired. Would sit behind the same IntegrationProvider interface.',
      env: '-',
      state: 'planned' as const,
    },
  ]

  return (
    <Shell
      title="connections"
      active="connections"
      subtitle="Every integration sits behind one interface. A provider with no key degrades to a deterministic path - there is no state where the app pretends to be live."
    >
      <div className="card">
        <h2>Providers</h2>
        {rows.map((row) => {
          const status = byProvider.get(row.id)
          // The pill's colour must follow the RESOLVED status, not env presence.
          // A configured-but-rejected token is `expired`, and painting that green
          // would be exactly the "pretend to be live" state this page prevents.
          const resolved = row.state === 'live' ? (status?.status ?? 'connected') : row.state
          const isHealthy = resolved === 'connected'
          return (
            <div key={row.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row" style={{ border: 0, padding: 0 }}>
                <div>
                  <div className="row-title">{row.label}</div>
                  <div className="row-sub">{row.access}</div>
                </div>
                <span className={`pill ${isHealthy ? 'live' : ''}`}>{resolved}</span>
              </div>
              <div className="row-sub" style={{ marginTop: 8 }}>
                {row.use}
              </div>
              {row.hint ? (
                <div className="row-sub" style={{ marginTop: 6, color: '#ffc46b' }}>
                  {row.hint}
                </div>
              ) : null}
              <div className="row-sub" style={{ marginTop: 6 }}>
                <code>{row.env}</code>
                {status?.account ? ` - ${status.account}` : ''}
                {status?.error ? ` - ${status.error}` : ''}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h2>How to connect</h2>
        <p className="row-sub" style={{ margin: 0 }}>
          Copy <code>.env.example</code> to <code>.env.local</code> and fill in what you have. Every
          variable is optional; with none set the app runs in demo mode and the header says{' '}
          <code>demo</code>. Restart the server after changing a key.
        </p>
      </div>
    </Shell>
  )
}
