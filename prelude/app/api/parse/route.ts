import { NextResponse } from 'next/server'
import { parseTranscript } from '@/lib/speech'
import { assertMaxLen, InputTooLargeError } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { transcript?: string }
  try {
    body = (await request.json()) as { transcript?: string }
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  let transcript: string
  try {
    // A transcript is untrusted input: it came from a microphone and may
    // contain anything. Cap it before it reaches a model.
    transcript = assertMaxLen(body.transcript, 500, 'transcript')
  } catch (err) {
    if (err instanceof InputTooLargeError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 })
    }
    throw err
  }

  if (!transcript) {
    return NextResponse.json({ ok: false, error: 'transcript is required' }, { status: 400 })
  }

  const parsed = await parseTranscript(transcript)
  return NextResponse.json({ ok: true, ...parsed })
}
