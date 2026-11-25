import { NextResponse } from 'next/server'
import { actKeyConfigured } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Liveness + mode.
 *
 * `mode` says whether a real provider is configured. `auth` says whether the
 * write endpoint requires a shared secret. Both are reported so the UI can be
 * honest about what is actually running.
 */
export async function GET() {
  const live = Boolean(process.env.NOTION_TOKEN || process.env.SLACK_TOKEN)
  return NextResponse.json({
    ok: true,
    mode: live ? 'live' : 'demo',
    auth: actKeyConfigured() ? 'required' : 'open',
    version: '0.1.0',
  })
}
