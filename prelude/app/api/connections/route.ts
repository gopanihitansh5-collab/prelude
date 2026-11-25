import { NextResponse } from 'next/server'
import { createRegistry } from '@/lib/integrations'

export const dynamic = 'force-dynamic'

/**
 * Connection status for every configured integration.
 *
 * The dashboard reads this. It never returns a token — only whether one is
 * present and whether the provider accepted it.
 */
export async function GET() {
  const registry = createRegistry()
  const connections = await Promise.all(registry.all().map((adapter) => adapter.getStatus()))
  return NextResponse.json({
    ok: true,
    live: registry.isLive(),
    connections,
  })
}
