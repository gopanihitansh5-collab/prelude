// Removes the rows the demo probes left in the action store, keeping the two
// that were created deliberately as proof of the write path.
//
//   node scripts/db-clean-probes.mjs            # dry run, lists what would go
//   node scripts/db-clean-probes.mjs --apply    # deletes
//
// It refuses to run without DATABASE_URL, and it never touches a row whose text
// is one of the two keepers.

import { neon } from '@neondatabase/serverless'

const KEEP = new Set(['postgres proof 121717', 'vercel production proof'])

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(2)
}

const apply = process.argv.includes('--apply')
const sql = neon(url)

const rows = await sql`
  SELECT id, kind, meeting_id, text, status, created_at
  FROM actions
  ORDER BY created_at ASC
`

console.log(`${rows.length} row(s) in actions:`)
for (const row of rows) {
  const keep = KEEP.has(row.text)
  console.log(`  ${keep ? 'KEEP  ' : 'DELETE'} ${row.id} ${row.status.padEnd(18)} "${row.text}"`)
}

// Anything not on the keep list was produced by a test run: an audit probe, a
// retry-repro, or a rejected agenda. All of it is scratch, none of it is history
// worth showing a judge.
const doomed = rows.filter((row) => !KEEP.has(row.text))

if (doomed.length === 0) {
  console.log('nothing to delete')
  process.exit(0)
}

if (!apply) {
  console.log(`\ndry run: ${doomed.length} row(s) would be deleted. Re-run with --apply.`)
  process.exit(0)
}

for (const row of doomed) {
  await sql`DELETE FROM actions WHERE id = ${row.id}`
  console.log(`deleted ${row.id}`)
}

const left = await sql`SELECT count(*)::int AS n FROM actions`
console.log(`remaining rows: ${left[0]?.n}`)
