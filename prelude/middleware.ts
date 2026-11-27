import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CORS for the plugin.
 *
 * The .ehpk is a static export loaded from a file path inside the Even
 * Realities App WebView. Its origin is not the backend's origin, so every
 * request it makes is cross-origin. Two independent gates apply:
 *
 *   1. Even-side: the origin must be in app.json permissions[network].whitelist.
 *   2. Browser-side: the server must return Access-Control-Allow-Origin.
 *
 * This file handles gate 2. The whitelist is not a CORS bypass — adding a
 * domain there does not make the browser accept the response.
 *
 * The plugin's origin is opaque (`null`) when loaded from a file, and
 * `https://app.evenrealities.com` when loaded from the Even app's host. Both
 * are allowed. A wildcard is safe here because the endpoint is authenticated by
 * a shared secret, not by the origin — see `requireActKey` in src/lib/auth.ts.
 */

const ALLOWED_ORIGINS = [
  'null', // file:// or a packaged .ehpk
  'https://app.evenrealities.com',
  'https://hub.evenrealities.com',
]

/**
 * The CORS answer for one request.
 *
 * The subtle part is the packaged plugin. Its origin is opaque, and a browser
 * serialises an opaque origin as the string `null` — but Chrome does **not**
 * accept `Access-Control-Allow-Origin: null` for a document with an opaque
 * origin, so a .ehpk loaded from a file path had every API call fail with
 * "Failed to fetch" while the same server answered a normal origin correctly.
 * The Fetch spec's matching rule is the trap: `null` is not a wildcard.
 *
 * `*` IS accepted for opaque origins, and it is safe here because nothing is
 * authenticated by the origin: there are no cookies and no credentials on these
 * routes. The write path is gated by a shared secret header (`requireActKey`),
 * and the read paths expose only demo data.
 */
function corsHeaders(origin: string | null): Record<string, string> {
  const known = origin !== null && ALLOWED_ORIGINS.includes(origin) && origin !== 'null'
  const allow = known ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allow ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-prelude-key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  // Preflight: answer immediately, never reach a route handler.
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }

  const response = NextResponse.next()
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

export const config = {
  // API routes only. Static assets and pages do not need CORS.
  matcher: '/api/:path*',
}
