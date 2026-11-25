import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prelude — the brief before your next meeting',
  description:
    'One card before your next meeting on Even Realities G2: who, the last thread, the doc, and one tap to act.',
}

export const viewport: Viewport = {
  themeColor: '#0b0f0c',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
