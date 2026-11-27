// Quick connectivity + schema probe for the Neon action store.
// Run: node scripts/db-check.mjs
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(2)
}

const sql = neon(url)

try {
  const ping = await sql`select 1 as ok, current_database() as db, now() as at`
  console.log('PING OK', JSON.stringify(ping[0]))
  const rows = await sql`
    select column_name, data_type
    from information_schema.columns
    where table_name = 'actions'
    order by ordinal_position
  `
  console.log('actions columns:', rows.length)
  for (const r of rows) console.log(' -', r.column_name, r.data_type)
  const count = await sql`select count(*)::int as n from actions`
  console.log('row count:', count[0]?.n)
} catch (error) {
  console.error('DB ERROR:', error instanceof Error ? error.message : error)
  process.exit(1)
}
