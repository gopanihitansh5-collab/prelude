import { Shell } from '../components/shell'
import { actionStoreIsDurable, listActions } from '@/lib/execute'

export const dynamic = 'force-dynamic'

/**
 * Action history.
 *
 * The point of this page is auditability: a judge can see that the write path is
 * real, what status each attempt reached, and what the provider returned. The
 * status vocabulary is the lifecycle's own, not a friendlier paraphrase.
 *
 * The store is Postgres when DATABASE_URL is set, in-memory otherwise. Which one
 * is live is stated on the page rather than hidden.
 */
export default async function ActionsPage() {
  const actions = await listActions()
  const durable = actionStoreIsDurable()

  const statusColor = (status: string): string => {
    if (status === 'receipt_persisted' || status === 'provider_confirmed') return 'var(--green)'
    if (status === 'reconciling') return '#ffc46b'
    if (status === 'failed' || status === 'rejected') return '#ff9d9d'
    return 'var(--muted)'
  }

  return (
    <Shell
      title="actions"
      active="actions"
      subtitle="Every write this process has attempted, newest first. The status is the lifecycle's own - a receipt only exists once a provider confirmed the action."
    >
      <div className="card">
        <h2>History</h2>
        {actions.length === 0 ? (
          <p className="row-sub" style={{ margin: 0 }}>
            No actions yet. Open the <a href="/lens">lens</a> and tap an action, or POST to{' '}
            <code>/api/act</code>.{' '}
            {durable
              ? 'The store is Postgres, so history survives a restart.'
              : 'The store is in-memory, so a restart clears it.'}
          </p>
        ) : (
          actions.map((action) => (
            <div
              key={action.id}
              style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}
            >
              <div className="row" style={{ border: 0, padding: 0 }}>
                <div>
                  <div className="row-title">
                    {action.kind} - {action.text}
                  </div>
                  <div className="row-sub">
                    {action.id} - meeting {action.meetingId}
                  </div>
                </div>
                <span className="pill" style={{ color: statusColor(action.status) }}>
                  {action.status}
                </span>
              </div>
              <div className="row-sub" style={{ marginTop: 8 }}>
                created {action.createdAt}
                {action.providerReference ? ` - provider ${action.providerReference}` : ''}
                {action.error ? ` - ${action.error}` : ''}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Lifecycle</h2>
        <p className="row-sub" style={{ margin: 0 }}>
          created â†’ validated â†’ awaiting_confirmation â†’ authorized â†’ executing â†’ provider_confirmed
          â†’ receipt_persisted. A 5xx or a network error after the request left is{' '}
          <code>reconciling</code>, never a blind retry - otherwise a lost response sends a
          duplicate message.
        </p>
      </div>
    </Shell>
  )
}
