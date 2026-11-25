import { NextResponse } from 'next/server'
import { executeAction } from '@/lib/execute'
import type { ExecuteRequest } from '@/lib/execute'
import { isConfirmed, requireActKey } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Execute an approved action.
 *
 * The client sends what the user confirmed. The server:
 *   1. checks the shared secret, when one is configured
 *   2. requires `confirmed === true` — an omitted field is NOT confirmation
 *   3. validates against deterministic rules
 *   4. walks the action lifecycle
 *   5. calls the provider adapter
 *   6. returns a receipt built from the provider's own response
 *
 * The receipt's `delivered` field is the exact string that left the building.
 * The lens renders it verbatim, so the confirmation cannot disagree with what
 * was sent — which is the property a screenshot cannot fake.
 */
export async function POST(request: Request) {
  const auth = requireActKey(request.headers)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 })
  }

  let body: ExecuteRequest
  try {
    body = (await request.json()) as ExecuteRequest
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  if (!body?.meetingId || !body?.action) {
    return NextResponse.json({ ok: false, error: 'meetingId and action are required' }, { status: 400 })
  }

  // Confirmation must be explicit. A caller that forgets the field cannot write.
  if (!isConfirmed(body.confirmed)) {
    return NextResponse.json(
      { ok: false, error: 'confirmed must be true to execute an action' },
      { status: 400 },
    )
  }

  const receipt = await executeAction({ ...body, confirmed: true })
  return NextResponse.json(receipt)
}
