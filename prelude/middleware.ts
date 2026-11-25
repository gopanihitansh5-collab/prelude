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

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow ?? 'null',
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
