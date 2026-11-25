/**
 * Auth for the write endpoint.
 *
 * `/api/act` performs a real side effect. On a public deployment an open write
 * endpoint means anyone who can reach the server can send a message on the
 * user's behalf. Two rules:
 *
 *   1. A shared secret, when configured. `PRELUDE_ACT_KEY` must match the
 *      `x-prelude-key` header.
 *   2. Confirmation must be explicit. `confirmed` defaults to **false**, so a
 *      caller that forgets the field cannot write.
 *
 * With no key configured the endpoint is open — which is correct for a local
 * demo and wrong for anything reachable from the internet. The health endpoint
 * reports which mode is active so the UI can say so.
 */

export interface AuthResult {
  ok: boolean
  reason?: string
}

/** The subset of the environment this module reads. */
export type AuthEnv = { PRELUDE_ACT_KEY?: string | undefined }

/** True when a shared secret is configured. */
export function actKeyConfigured(env: AuthEnv = process.env as AuthEnv): boolean {
  return Boolean(env.PRELUDE_ACT_KEY?.trim())
}

/**
 * Check the shared secret. Returns ok when no key is configured, because a
 * local demo must work with zero setup.
 */
export function requireActKey(headers: Headers, env: AuthEnv = process.env as AuthEnv): AuthResult {
  const expected = env.PRELUDE_ACT_KEY?.trim()
  if (!expected) return { ok: true }

  const provided = headers.get('x-prelude-key')?.trim()
  if (!provided) return { ok: false, reason: 'missing x-prelude-key' }
  if (provided !== expected) return { ok: false, reason: 'invalid x-prelude-key' }
  return { ok: true }
}

/**
 * Confirmation must be explicit.
 *
 * The previous rule was `confirmed !== false`, which meant a caller that omitted
 * the field was treated as having confirmed. That contradicts the safety
 * framing: no execution without confirmation.
 */
export function isConfirmed(value: unknown): boolean {
  return value === true
}
