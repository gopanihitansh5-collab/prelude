import { NextResponse } from 'next/server'
import { getAction } from '@/lib/execute'

export const dynamic = 'force-dynamic'

/**
 * Read an action's status and receipt.
 *
 * This is the endpoint that makes the lifecycle observable: a client can poll
 * it after an ambiguous failure instead of blindly retrying.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const record = getAction(id)
  if (!record) {
    return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 404 })
  }
  return NextResponse.json({
    ok: record.status === 'provider_confirmed' || record.status === 'receipt_persisted',
    actionId: record.id,
    status: record.status,
    delivered: record.text,
    at: record.updatedAt,
    attempts: record.attempts,
    ...(record.providerReference ? { providerReference: record.providerReference } : {}),
    ...(record.error ? { error: record.error } : {}),
  })
}
