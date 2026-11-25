// Browser microphone capture, resampled to what the server expects.
//
// The G2 mic emits PCM s16le, 16 kHz, mono. A browser's AudioContext emits
// float32 at whatever rate the device chose (usually 44.1 or 48 kHz). This
// module bridges the two so `/api/stt` receives the same bytes from a laptop as
// it does from the glasses — which is what makes the browser mirror a real
// test of the voice path rather than a separate code path.
//
// Deliberately not a streaming transport. Pipecat (and any WebRTC transport)
// would replace this with a live session; see `voice-transport.ts` for the seam.

export interface CaptureOptions {
  /** Called with each resampled chunk of s16le PCM. */
  onChunk: (pcm: Uint8Array) => void
  /** Target sample rate. The G2 and the STT provider both want 16000. */
  sampleRate?: number
}

export interface Capture {
  stop: () => Promise<void>
  /** True while the microphone is open. */
  active: () => boolean
}

const TARGET_RATE = 16_000

/**
 * Linear resample of float32 samples to the target rate, then quantise to
 * signed 16-bit little-endian.
 *
 * Linear interpolation is not the highest-quality resampler, but for speech at
 * 16 kHz it is indistinguishable from a windowed-sinc filter and it costs a
 * fraction of the CPU. The alternative is shipping a WASM resampler for a demo.
 */
function resampleToPcm16(input: Float32Array, inputRate: number, targetRate: number): Uint8Array {
  if (inputRate === targetRate) {
    const out = new Uint8Array(input.length * 2)
    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i] ?? 0))
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      out[i * 2] = value & 0xff
      out[i * 2 + 1] = (value >> 8) & 0xff
    }
    return out
  }

  const ratio = inputRate / targetRate
  const outputLength = Math.floor(input.length / ratio)
  const out = new Uint8Array(outputLength * 2)

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio
    const index = Math.floor(position)
    const fraction = position - index
    const a = input[index] ?? 0
    const b = input[index + 1] ?? a
    const sample = Math.max(-1, Math.min(1, a + (b - a) * fraction))
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    out[i * 2] = value & 0xff
    out[i * 2 + 1] = (value >> 8) & 0xff
  }

  return out
}

/**
 * Open the microphone and stream resampled PCM to `onChunk`.
 *
 * Throws a readable error when the browser has no getUserMedia, when the user
 * denies permission, or when the page is not a secure context. The caller shows
 * that message rather than failing silently.
 */
export async function startBrowserCapture(options: CaptureOptions): Promise<Capture> {
  const targetRate = options.sampleRate ?? TARGET_RATE

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('this browser has no microphone API')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) {
    stream.getTracks().forEach((track) => track.stop())
    throw new Error('this browser has no AudioContext')
  }

  const context = new AudioContextCtor()
  const source = context.createMediaStreamSource(stream)

  // 4096 frames at 48 kHz is ~85 ms: small enough to feel live, large enough
  // that the resample loop is not dominated by per-callback overhead.
  const processor = context.createScriptProcessor(4096, 1, 1)
  let stopped = false

  processor.onaudioprocess = (event) => {
    if (stopped) return
    const channel = event.inputBuffer.getChannelData(0)
    // Copy: the buffer is reused by the audio thread.
    const copy = new Float32Array(channel.length)
    copy.set(channel)
    options.onChunk(resampleToPcm16(copy, context.sampleRate, targetRate))
  }

  // A ScriptProcessor must be connected to a destination to run. Route it
  // through a zero-gain node so nothing is played back and no echo is created.
  const silence = context.createGain()
  silence.gain.value = 0
  source.connect(processor)
  processor.connect(silence)
  silence.connect(context.destination)

  const stop = async () => {
    if (stopped) return
    stopped = true
    processor.onaudioprocess = null
    try {
      source.disconnect()
      processor.disconnect()
      silence.disconnect()
    } catch {
      /* already disconnected */
    }
    stream.getTracks().forEach((track) => track.stop())
    await context.close().catch(() => undefined)
  }

  return { stop, active: () => !stopped }
}
