import { NextResponse } from 'next/server'
import { validateAction, createAction } from '@/core/action-lifecycle'
import type { ActionKind } from '@/core/action-lifecycle'
import { getMeetings } from '@/lib/meetings'

export const dynamic = 'force-dynamic'

/**
 * Preview an action without executing it.
 *
 * The spec asks for a preview step so a sensitive action can be shown before it
 * is committed. This runs the same deterministic validation the executor runs,
 * so a preview that says "ok" cannot be rejected a moment later.
 */
export async function POST(request: Request) {
  let body: { meetingId?: string; action?: ActionKind; text?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  if (!body.meetingId || !body.action) {
    return NextResponse.json({ ok: false, error: 'meetingId and action are required' }, { status: 400 })
  }

  const { meetings } = await getMeetings()
  const meeting = meetings.find((m) => m.id === body.meetingId)
  const record = createAction({
    id: 'preview',
    kind: body.action,
    meetingId: body.meetingId,
    text: body.text ?? '',
    now: new Date().toISOString(),
  })

  const validation = validateAction(record, {
    meetingExists: Boolean(meeting),
    userConfirmed: true,
  })

  return NextResponse.json({
    ok: validation.ok,
    ...(validation.reason ? { reason: validation.reason } : {}),
    preview: {
      action: body.action,
      text: record.text,
      idempotencyKey: record.idempotencyKey,
      channel: meeting?.channel ?? 'demo',
    },
  })
}
