/**
 * Two build targets from one codebase.
 *
 *  • Normal (`next dev` / `next build`) — the full app: dashboard, API routes,
 *    deployable to Vercel. This is the backend the plugin talks to.
 *
 *  • Plugin (`NEXT_PLUGIN=1`) — a static export of just the lens, written to
 *    `dist/`, which `evenhub pack` turns into a .ehpk.
 *
 * The switch is `pageExtensions`. Next only treats a file as a page or a route
 * handler when its extension is in this list, so in plugin mode every
 * `route.ts` under app/api is ignored entirely — which is what makes a static
 * export possible with POST handlers present in the same tree.
 */

const isPlugin = process.env.NEXT_PLUGIN === '1'

/**
 * The two targets must not share a build directory.
 *
 * `next build` writes `.next/`; the plugin export writes `dist/`. If the plugin
 * build also wrote `.next/`, running it after a normal build would leave
 * `next start` serving a static export with no API routes — which is exactly
 * the bug this comment exists to prevent.
 */
/** @type {import('next').NextConfig} */
const nextConfig = isPlugin
  ? {
      output: 'export',
      distDir: 'dist',
      // Only *.plugin.tsx / *.plugin.ts are pages in this mode.
      pageExtensions: ['plugin.tsx', 'plugin.ts'],
      images: { unoptimized: true },
      // The .ehpk is loaded from a file path, so assets must be relative.
      assetPrefix: '.',
      trailingSlash: true,
      // Pin the workspace root: without this, Turbopack walks up to the home
      // directory and warns about a lockfile it should not read.
      turbopack: { root: import.meta.dirname },
    }
  : {
      pageExtensions: ['tsx', 'ts'],
      reactStrictMode: true,
      turbopack: { root: import.meta.dirname },
    }

export default nextConfig
