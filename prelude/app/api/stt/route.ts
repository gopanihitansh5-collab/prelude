import { NextResponse } from 'next/server'
import { transcribe } from '@/lib/speech'

export const dynamic = 'force-dynamic'

/**
 * PCM in, transcript out.
 *
 * The client posts raw `application/octet-stream` PCM (s16le, 16 kHz, mono),
 * which is exactly what the G2 mic emits. With no STT key this returns a canned
 * transcript so the voice path is demonstrable end to end without a credential.
 */
export async function POST(request: Request) {
  const pcm = await request.arrayBuffer()
  if (pcm.byteLength === 0) {
    return NextResponse.json({ ok: false, error: 'empty body' }, { status: 400 })
  }
  try {
    const result = await transcribe(pcm)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'stt failed' },
      { status: 502 },
    )
  }
}
