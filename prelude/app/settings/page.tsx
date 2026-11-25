import { Shell } from '../components/shell'
import { actKeyConfigured } from '@/lib/auth'
import { resolveLlmConfig } from '@/lib/llm'

export const dynamic = 'force-dynamic'

/**
 * Settings.
 *
 * Read-only by design. Secrets live in `.env.local` and are never editable from
 * a web page - a settings form that writes keys would be a credential-exfiltration
 * surface for no benefit. This page reports what is configured so an operator can
 * verify a deployment without reading the environment.
 *
 * It never prints a key. Only presence, and for the LLM the model name, which is
 * not a secret.
 */
export default async function SettingsPage() {
  const llm = resolveLlmConfig()
  // Notion's live read needs both variables; a token alone leaves the app on
  // fixtures, so the report must not claim otherwise.
  const notionLive = Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID)

  const rows: { label: string; value: string; live: boolean; note?: string }[] = [
    {
      label: 'Write authentication',
      value: actKeyConfigured() ? 'required' : 'open',
      live: actKeyConfigured(),
      note: actKeyConfigured()
        ? 'Every write must carry x-prelude-key.'
        : 'No shared secret. Fine for a local demo; set PRELUDE_ACT_KEY for anything reachable.',
    },
    {
      label: 'LLM',
      value: llm ? llm.model : 'keyword rules',
      live: Boolean(llm),
      note: llm
        ? `Endpoint ${llm.baseUrl}. The model may only propose an action; deterministic rules decide.`
        : 'No key. Transcript classification falls back to deterministic keyword rules.',
    },
    {
      label: 'Notion',
      value: notionLive ? 'configured' : 'not configured',
      live: notionLive,
      note: notionLive
        ? 'Live read is wired: getMeetings() queries the database.'
        : process.env.NOTION_TOKEN
          ? 'Token present but NOTION_DATABASE_ID is missing, so the read path stays on fixtures.'
          : 'Set NOTION_TOKEN and NOTION_DATABASE_ID to enable the live read path.',
    },
    {
      label: 'Email (Resend)',
      value: process.env.RESEND_API_KEY ? 'configured' : 'not configured',
      live: Boolean(process.env.RESEND_API_KEY),
      note: 'Honours an Idempotency-Key header, so a retry does not send twice.',
    },
    {
      label: 'Web enrichment (Exa)',
      value: process.env.EXA_API_KEY ? 'configured' : 'not configured',
      live: Boolean(process.env.EXA_API_KEY),
      note: 'Only runs on a meeting with no thread and no doc. Local facts always win.',
    },
    {
      label: 'Speech to text',
      value: process.env.STT_API_KEY ? 'configured' : 'demo transcript',
      live: Boolean(process.env.STT_API_KEY),
      note: 'With no key the voice path returns a canned transcript so it stays demonstrable.',
    },
  ]

  return (
    <Shell
      title="settings"
      active="settings"
      subtitle="Read-only. Secrets live in .env.local and are never editable from a web page - a settings form that writes keys would be an exfiltration surface for no benefit."
    >
      <div className="card">
        <h2>Configuration</h2>
        {rows.map((row) => (
          <div key={row.label} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ border: 0, padding: 0 }}>
              <span className="row-title">{row.label}</span>
              <span className={`pill ${row.live ? 'live' : ''}`}>{row.value}</span>
            </div>
            {row.note ? (
              <div className="row-sub" style={{ marginTop: 8 }}>
                {row.note}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Privacy</h2>
        <p className="row-sub" style={{ margin: 0 }}>
          No analytics. No third-party tracking. Provider tokens are held on the server only and
          never cross into the plugin bundle. Transcripts are capped at 500 characters and wrapped
          as untrusted data before they reach a model, so embedded instructions are treated as text.
        </p>
      </div>

      <div className="card">
        <h2>Data</h2>
        <p className="row-sub" style={{ margin: 0 }}>
          The action store is in-memory and cleared on restart. There is no database in this build;
          the store has the same shape as a table, so swapping it for Postgres is a contained change
          in <code>src/lib/execute.ts</code>.
        </p>
      </div>
    </Shell>
  )
}
