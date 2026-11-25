import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prelude',
  description: 'The brief before your next meeting.',
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

/**
 * Plugin-mode root layout. Only `*.plugin.tsx` files are pages in this build,
 * so this is the layout the .ehpk ships. It is deliberately bare: the glasses
 * render containers, not HTML, and the WebView behind them should do nothing
 * except run the controller.
 */
export default function PluginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#000' }}>{children}</body>
    </html>
  )
}
