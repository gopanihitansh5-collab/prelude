// The voice transport seam.
//
// Prelude has two ways to get audio to a transcript:
//
//   1. `batch` — record, POST the whole buffer to /api/stt, get one transcript.
//      This is what the G2 plugin does, and what the browser mirror does today.
//      It is simple, testable, and needs no extra infrastructure.
//
//   2. `stream` — a live session where audio flows continuously and partial
//      transcripts arrive as you speak. Pipecat is the intended implementation:
//      a Python bot process plus a WebRTC transport (Daily, SmallWebRTC, or a
//      custom one).
//
// This file defines the seam so (2) can be added without touching the state
// machine, the lens, or the review gate. The safety rule is unchanged either
// way: a transcript can reach REVIEW, and only a user tap can reach CONFIRMED.
//
// Why Pipecat is not wired yet, stated plainly:
//   • It needs a Python service running alongside Next.js.
//   • It needs a transport provider account (Daily) or a self-hosted WebRTC
//     signalling server.
//   • It needs its own STT key on the bot side.
// None of those are available in this environment, and shipping a half-wired
// streaming path would be worse than an honest batch path that works.

import type { VoiceState } from '@/core/voice'

export type TransportKind = 'batch' | 'stream'

export interface TranscriptEvent {
  /** The text so far. For a batch transport this is the final transcript. */
  text: string
  /** True when the provider considers the utterance complete. */
  final: boolean
}

export interface VoiceTransport {
  readonly kind: TransportKind
  /** Begin a session. Resolves once audio is flowing. */
  start: () => Promise<void>
  /** End the session and flush any pending audio. */
  stop: () => Promise<void>
  /** Subscribe to transcript updates. Returns an unsubscribe function. */
  onTranscript: (handler: (event: TranscriptEvent) => void) => () => void
  /** Subscribe to transport-level state changes, for the lens status band. */
  onState: (handler: (state: VoiceState) => void) => () => void
}

/**
 * The batch transport: record locally, then transcribe in one request.
 *
 * This is the default and the only one implemented. It is deliberately a class
 * rather than a hook so the same object can be driven from the lens page, a
 * test, or a future streaming implementation's fallback path.
 */
export class BatchTransport implements VoiceTransport {
  readonly kind = 'batch' as const

  private chunks: Uint8Array[] = []
  private transcriptHandlers = new Set<(event: TranscriptEvent) => void>()
  private stateHandlers = new Set<(state: VoiceState) => void>()
  private stopCapture: (() => Promise<void>) | null = null

  constructor(
    private readonly options: {
      apiBase: string
      /** Opens the microphone. Injected so tests need no browser. */
      openCapture: (onChunk: (pcm: Uint8Array) => void) => Promise<() => Promise<void>>
      /** Cap the buffer so a forgotten session cannot grow without bound. */
      maxBytes?: number
    },
  ) {}

  private emitState(state: VoiceState): void {
    for (const handler of this.stateHandlers) handler(state)
  }

  private emitTranscript(event: TranscriptEvent): void {
    for (const handler of this.transcriptHandlers) handler(event)
  }

  async start(): Promise<void> {
    this.chunks = []
    this.emitState('listening')
    this.stopCapture = await this.options.openCapture((pcm) => {
      const total = this.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
      const cap = this.options.maxBytes ?? 16_000 * 2 * 15
      if (total + pcm.byteLength > cap) return
      this.chunks.push(pcm)
    })
  }

  async stop(): Promise<void> {
    await this.stopCapture?.()
    this.stopCapture = null

    const total = this.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    if (total === 0) {
      this.emitState('error')
      return
    }

    const pcm = new Uint8Array(total)
    let offset = 0
    for (const chunk of this.chunks) {
      pcm.set(chunk, offset)
      offset += chunk.byteLength
    }
    this.chunks = []

    this.emitState('transcribing')
    try {
      const res = await fetch(`${this.options.apiBase}/api/stt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pcm,
      })
      if (!res.ok) throw new Error(`stt HTTP ${res.status}`)
      const body = (await res.json()) as { transcript?: string }
      const text = (body.transcript ?? '').trim()
      if (!text) {
        this.emitState('error')
        return
      }
      this.emitTranscript({ text, final: true })
    } catch {
      this.emitState('error')
    }
  }

  onTranscript(handler: (event: TranscriptEvent) => void): () => void {
    this.transcriptHandlers.add(handler)
    return () => this.transcriptHandlers.delete(handler)
  }

  onState(handler: (state: VoiceState) => void): () => void {
    this.stateHandlers.add(handler)
    return () => this.stateHandlers.delete(handler)
  }
}
