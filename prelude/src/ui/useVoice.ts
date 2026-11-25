'use client'

import { useCallback, useRef } from 'react'
import { connect } from '@/even/bridge'
import { startBrowserCapture, type Capture } from './browser-capture'
import type { VoiceState } from '@/core/voice'

/**
 * Voice capture, end to end.
 *
 * The G2 mic emits PCM s16le 16 kHz mono through `audioEvent.audioPcm`. This
 * hook buffers those frames, posts them to `/api/stt`, then posts the transcript
 * to `/api/parse`, and hands the parsed action back for REVIEW.
 *
 * The safety rule is enforced by the state machine, not here: this hook can
 * reach `review`, but only the user's tap can reach `confirmed`. A misheard
 * transcript can never send a message.
 *
 * In a plain browser there is no bridge, so `start()` reports an error rather
 * than hanging. That is deliberate — a silent no-op would look like a bug.
 */

export interface VoiceProposal {
  action: 'reply' | 'note' | 'agenda' | 'join'
  text: string
}

export interface UseVoiceOptions {
  apiBase: string
  onState: (state: VoiceState) => void
  onProposal: (proposal: VoiceProposal, transcript: string) => void
  onError: (error: string) => void
}

export interface UseVoice {
  start: () => Promise<void>
  stop: () => Promise<void>
  isRecording: () => boolean
}

/** 16 kHz mono s16le: 32 bytes per millisecond. Cap the buffer at ~15 s. */
const MAX_PCM_BYTES = 16_000 * 2 * 15

export function useVoice({ apiBase, onState, onProposal, onError }: UseVoiceOptions): UseVoice {
  const chunks = useRef<Uint8Array[]>([])
  const recording = useRef(false)
  const unsubscribe = useRef<(() => void) | null>(null)
  const browserCapture = useRef<Capture | null>(null)

  const stop = useCallback(async () => {
    if (!recording.current) return
    recording.current = false
    unsubscribe.current?.()
    unsubscribe.current = null

    // Close whichever capture path was open.
    if (browserCapture.current) {
      await browserCapture.current.stop().catch(() => undefined)
      browserCapture.current = null
    }

    try {
      const bridge = await connect()
      await bridge.audioControl(false)
    } catch {
      /* no bridge: nothing to stop */
    }

    const total = chunks.current.reduce((sum, c) => sum + c.byteLength, 0)
    const pcm = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks.current) {
      pcm.set(chunk, offset)
      offset += chunk.byteLength
    }
    chunks.current = []

    if (total === 0) {
      onError('no audio captured')
      return
    }

    onState('transcribing')

    try {
      const sttRes = await fetch(`${apiBase}/api/stt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pcm,
      })
      if (!sttRes.ok) throw new Error(`stt HTTP ${sttRes.status}`)
      const stt = (await sttRes.json()) as { transcript?: string }
      const transcript = (stt.transcript ?? '').trim()
      if (!transcript) {
        onError('nothing transcribed')
        return
      }

      const parseRes = await fetch(`${apiBase}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      if (!parseRes.ok) throw new Error(`parse HTTP ${parseRes.status}`)
      const parsed = (await parseRes.json()) as Partial<VoiceProposal>

      if (!parsed.action || !parsed.text) {
        onError('could not parse an action')
        return
      }

      // REVIEW, never CONFIRMED. The user's tap is the only route forward.
      onProposal({ action: parsed.action, text: parsed.text }, transcript)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'voice failed')
    }
  }, [apiBase, onError, onProposal, onState])

  const start = useCallback(async () => {
    if (recording.current) {
      await stop()
      return
    }

    // Two capture paths, one state machine.
    //
    // The glasses path uses the SDK bridge. A plain browser has no bridge, so it
    // falls back to getUserMedia and resamples to the same 16 kHz s16le the G2
    // emits — which means /api/stt receives identical bytes either way, and the
    // browser mirror is a real test of the voice path rather than a mock.
    let bridge: Awaited<ReturnType<typeof connect>> | null = null
    try {
      bridge = await connect()
    } catch {
      bridge = null
    }

    if (bridge) {
      try {
        const ok = await bridge.audioControl(true)
        if (!ok) {
          onError('microphone unavailable')
          return
        }

        chunks.current = []
        recording.current = true
        onState('listening')

        unsubscribe.current = bridge.onEvenHubEvent((event) => {
          const pcm = event.audioEvent?.audioPcm
          if (!pcm || !recording.current) return
          const total = chunks.current.reduce((sum, c) => sum + c.byteLength, 0)
          if (total + pcm.byteLength > MAX_PCM_BYTES) return
          chunks.current.push(pcm)
        })
        return
      } catch {
        onError('microphone unavailable')
        return
      }
    }

    // Browser fallback.
    try {
      chunks.current = []
      const capture = await startBrowserCapture({
        onChunk: (pcm) => {
          if (!recording.current) return
          const total = chunks.current.reduce((sum, c) => sum + c.byteLength, 0)
          if (total + pcm.byteLength > MAX_PCM_BYTES) return
          chunks.current.push(pcm)
        },
      })
      browserCapture.current = capture
      recording.current = true
      onState('listening')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'no microphone in this environment')
    }
  }, [onError, onState, stop])

  return { start, stop, isRecording: () => recording.current }
}
