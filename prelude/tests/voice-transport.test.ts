import { describe, expect, it } from 'vitest'
import { BatchTransport } from '../src/ui/voice-transport.ts'

/**
 * The transport seam is the part that can be tested without a browser: the
 * capture function is injected, so these tests drive the whole record → POST →
 * transcript path with a fake microphone and a fake fetch.
 */

function fakeCapture(chunks: Uint8Array[]) {
  return async (onChunk: (pcm: Uint8Array) => void) => {
    for (const chunk of chunks) onChunk(chunk)
    return async () => undefined
  }
}

describe('BatchTransport', () => {
  it('emits listening, then transcribing, then a final transcript', async () => {
    const states: string[] = []
    const transcripts: { text: string; final: boolean }[] = []

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ transcript: 'running five minutes late' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch

    try {
      const transport = new BatchTransport({
        apiBase: '',
        openCapture: fakeCapture([new Uint8Array([1, 2, 3, 4])]),
      })
      transport.onState((state) => states.push(state))
      transport.onTranscript((event) => transcripts.push(event))

      await transport.start()
      await transport.stop()

      expect(states).toEqual(['listening', 'transcribing'])
      expect(transcripts).toEqual([{ text: 'running five minutes late', final: true }])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('reports an error when no audio was captured', async () => {
    const states: string[] = []
    const transport = new BatchTransport({
      apiBase: '',
      openCapture: fakeCapture([]),
    })
    transport.onState((state) => states.push(state))

    await transport.start()
    await transport.stop()

    expect(states).toEqual(['listening', 'error'])
  })

  it('reports an error when the server rejects the audio', async () => {
    const states: string[] = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response('nope', { status: 502 })) as typeof fetch

    try {
      const transport = new BatchTransport({
        apiBase: '',
        openCapture: fakeCapture([new Uint8Array([1, 2])]),
      })
      transport.onState((state) => states.push(state))

      await transport.start()
      await transport.stop()

      expect(states).toEqual(['listening', 'transcribing', 'error'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('drops audio past the byte cap instead of growing without bound', async () => {
    let posted = 0
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      posted = (init?.body as Uint8Array).byteLength
      return new Response(JSON.stringify({ transcript: 'ok' }), { status: 200 })
    }) as typeof fetch

    try {
      const transport = new BatchTransport({
        apiBase: '',
        maxBytes: 4,
        openCapture: fakeCapture([
          new Uint8Array([1, 2, 3]),
          new Uint8Array([4, 5, 6]),
          new Uint8Array([7, 8, 9]),
        ]),
      })
      await transport.start()
      await transport.stop()

      // Only the first chunk fits under the 4-byte cap.
      expect(posted).toBe(3)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('unsubscribes handlers', async () => {
    const transport = new BatchTransport({ apiBase: '', openCapture: fakeCapture([]) })
    const seen: string[] = []
    const off = transport.onState((state) => seen.push(state))
    off()

    await transport.start()
    await transport.stop()

    expect(seen).toEqual([])
  })
})
