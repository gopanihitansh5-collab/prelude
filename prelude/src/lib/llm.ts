// The one LLM client.
//
// Every model call in Prelude goes through here. The provider is
// OpenAI-compatible, so the only thing that changes between TokenRouter,
// OpenRouter, or a local server is the base URL and the model id.
//
// Server-only: this module reads process.env and calls fetch. It must never be
// imported from src/core/ (which imports nothing) or from a client component.
//
// The rule the rest of the app depends on: a model may *propose*, but it never
// decides. Callers validate the result against deterministic rules before it
// can reach a write path.

export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
}

/** A plain env bag, so callers and tests can pass any subset of keys. */
export type Env = Record<string, string | undefined>

const DEFAULT_BASE_URL = 'https://api.tokenrouter.com/v1'
const DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash-1017-free'
const TIMEOUT_MS = 12_000

/**
 * Resolve config from the environment, or null when no key is set.
 *
 * Precedence: LLM_* → TOKENROUTER_* → OPENROUTER_*. The last one is kept so an
 * existing deployment does not break, but it is no longer the documented path.
 */
export function resolveLlmConfig(env: Env = process.env): LlmConfig | null {
  const apiKey = env.LLM_API_KEY || env.TOKENROUTER_API_KEY || env.OPENROUTER_API_KEY
  if (!apiKey) return null

  const baseUrl = (env.LLM_BASE_URL || env.TOKENROUTER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')
  const model = env.LLM_MODEL || env.TOKENROUTER_MODEL || DEFAULT_MODEL
  return { baseUrl, apiKey, model }
}

export function llmConfigured(env: Env = process.env): boolean {
  return resolveLlmConfig(env) !== null
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  /** Ask the provider for a JSON object. Falls back to prompt-only when unsupported. */
  json?: boolean
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

/**
 * One chat completion. Returns the assistant's text, or null on any failure.
 *
 * Never throws: a model outage must degrade to the deterministic path, not take
 * the request down with it.
 */
export async function chat(options: ChatOptions, env: Env = process.env): Promise<string | null> {
  const config = resolveLlmConfig(env)
  if (!config) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const onAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onAbort)

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 200,
        temperature: options.temperature ?? 0,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    })

    if (!res.ok) return null

    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = body.choices?.[0]?.message?.content
    return typeof content === 'string' && content.trim().length > 0 ? content : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * Extract the first JSON object from a model reply.
 *
 * Models wrap JSON in prose or fences even when asked not to, so this is
 * deliberately forgiving: it finds the outermost balanced braces and parses
 * that. Returns null rather than throwing.
 */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }

    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1)) as unknown
          return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null
        } catch {
          return null
        }
      }
    }
  }

  return null
}

/** Chat and parse a JSON object in one step. Null when either half fails. */
export async function chatJson(
  options: ChatOptions,
  env: Env = process.env,
): Promise<Record<string, unknown> | null> {
  const text = await chat({ ...options, json: true }, env)
  return text ? extractJsonObject(text) : null
}
