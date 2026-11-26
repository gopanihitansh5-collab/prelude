'use client'

// The panel view: the real G2 layout, as DOM.
//
// The product photography shows the display is a panel layout — a date and
// battery in the header, a large dithered clock on the left, and a bordered list
// panel on the right. This component paints that layout at exactly 576x288.
//
// It is deliberately separate from the three-band `render()`: the bands are what
// the SDK containers actually receive, and this is the visual layer that shows
// what the hardware looks like. Both derive from the same AppState, so they can
// never disagree about the facts.

import type { PanelIcon, PanelLayout } from '@/core/panel'
import './panel-view.css'

const ICON: Record<PanelIcon, string> = {
  calendar: '▤',
  clock: '◷',
  location: '◉',
  person: '◍',
  doc: '▭',
  check: '✓',
  alert: '!',
}

/** A seven-segment-ish digit, drawn with a dotted font stack. */
function Clock({ hours, minutes }: { hours: string; minutes: string }) {
  return (
    <div className="g2-clock" aria-label={`${hours}:${minutes}`}>
      <span>{hours}</span>
      <span>{minutes}</span>
    </div>
  )
}

function Battery({ level }: { level: number }) {
  const filled = Math.round(Math.max(0, Math.min(1, level)) * 4)
  return (
    <span className="g2-battery" aria-label={`battery ${Math.round(level * 100)} percent`}>
      <span className="g2-battery-shell">
        {Array.from({ length: 4 }).map((_, i) => (
          <i key={i} data-on={i < filled} />
        ))}
      </span>
      <span className="g2-battery-nub" />
    </span>
  )
}

export function PanelView({ layout }: { layout: PanelLayout }) {
  return (
    <div className="g2-panel" role="img" aria-label="Even G2 display preview">
      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="g2-header">
        <span className="g2-date">{layout.date}</span>
        <Battery level={layout.battery} />
      </div>

      {/* ── left column: clock, weather, notifications ─────────────────── */}
      <div className="g2-left">
        <Clock hours={layout.clock.hours} minutes={layout.clock.minutes} />
        <div className="g2-meta">
          {layout.weather ? <span>☀ {layout.weather}</span> : null}
          {layout.notifications ? <span>🔔 {layout.notifications}</span> : null}
        </div>
      </div>

      {/* ── right column: the bordered list panel ──────────────────────── */}
      <div className="g2-list">
        {layout.panel.title ? <div className="g2-list-title">{layout.panel.title}</div> : null}
        {layout.panel.rows.map((row, index) => (
          <div className="g2-row" key={`${row.text}-${index}`}>
            <span className="g2-icon">{ICON[row.icon]}</span>
            <span className="g2-row-text">{row.text}</span>
            {row.meta ? <span className="g2-row-meta">{row.meta}</span> : null}
          </div>
        ))}
      </div>

      {/* ── status strip ───────────────────────────────────────────────── */}
      {layout.status ? (
        <div className="g2-status">
          <span>{layout.status}</span>
          <span className="g2-wave">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : null}
    </div>
  )
}
