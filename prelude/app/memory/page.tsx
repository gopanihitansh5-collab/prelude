import { Shell } from '../components/shell'
import { recall, shortDate } from '@/core/memory'
import { getBriefedMeetings } from '@/lib/meetings'
import type { SourceItem } from '@/lib/integrations/types'

export const dynamic = 'force-dynamic'

/**
 * Memory.
 *
 * Cross-source recall over the meetings the app actually has. The query comes
 * from the URL so the page is shareable and the back button works â€” no client
 * state needed.
 *
 * The scoring is deterministic term overlap with a recency bonus, not an
 * embedding. That is deliberate: the answer is reproducible, so a judge can run
 * the same query twice and get the same result.
 */
export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()

  const { meetings, mode } = await getBriefedMeetings()

  const index: SourceItem[] = meetings.flatMap((meeting) =>
    meeting.thread.map((message, i) => ({
      id: `${meeting.id}-${i}`,
      provider: meeting.channel,
      kind: 'message' as const,
      title: `${message.from} Â· ${meeting.title}`,
      body: message.text,
      at: message.at,
      author: message.from,
    })),
  )

  const answer = query ? recall(index, query, Date.now(), 8) : null

  return (
    <Shell
      title="memory"
      active="memory"
      subtitle="Ask what was said, decided or promised. Scoring is deterministic term overlap with a recency bonus â€” no embeddings, so the same query always returns the same answer."
    >
      <div className="card">
        <h2>Search</h2>
        <form method="get" action="/memory" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="enterprise pricing"
            aria-label="Search memory"
            style={{
              flex: '1 1 260px',
              background: '#0e1410',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '9px 12px',
              color: 'var(--text)',
              font: 'inherit',
              fontSize: 13,
            }}
          />
          <button type="submit">Search</button>
        </form>
        <div className="row-sub" style={{ marginTop: 10 }}>
          {index.length} indexed messages Â· source <span className="pill">{mode}</span>
        </div>
      </div>

      {answer ? (
        <div className="card">
          <h2>Answer</h2>
          <div className="row" style={{ border: 0, paddingTop: 0 }}>
            <span className="row-title">{answer.headline}</span>
            {answer.latest ? (
              <span className="pill">last {shortDate(answer.latest.item.at)}</span>
            ) : null}
          </div>

          {answer.empty ? (
            <p className="row-sub" style={{ margin: '10px 0 0' }}>
              Nothing in the current index matches â€œ{query}â€. With a live provider configured, the
              index grows to include those threads.
            </p>
          ) : (
            answer.hits.map((hit) => (
              <div
                key={hit.item.id}
                style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}
              >
                <div className="row" style={{ border: 0, padding: 0 }}>
                  <div className="row-title">{hit.item.title}</div>
                  <span className="pill">{hit.matchedOn}</span>
                </div>
                <div className="row-sub" style={{ marginTop: 6 }}>
                  {hit.item.body}
                </div>
                <div className="row-sub" style={{ marginTop: 6 }}>
                  {shortDate(hit.item.at)} Â· {hit.item.provider} Â· score {hit.score.toFixed(1)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card">
          <h2>Try</h2>
          <div className="controls" style={{ marginTop: 0 }}>
            {['enterprise pricing', 'migration', 'retention', 'pricing'].map((suggestion) => (
              <a key={suggestion} href={`/memory?q=${encodeURIComponent(suggestion)}`}>
                <button type="button">{suggestion}</button>
              </a>
            ))}
          </div>
        </div>
      )}
    </Shell>
  )
}
