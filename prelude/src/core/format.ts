// Text measurement and fitting for a 576x288 monochrome display.
//
// The glasses render a single LVGL font with no monospace variant and no size
// control, so every width here is an estimate derived from the font metrics we
// measured against the simulator. The numbers are deliberately conservative:
// dropping a whole field is better than truncating a number in half.

/** Rough advance width of one glyph at the body size, in px. */
export const CHAR_ADVANCE_PX = 8.6

/** Usable width inside a band, after 8px padding on each side. */
export const BAND_INNER_WIDTH = 576 - 16

/** ~65 chars at body size. Kept lower in practice by wrapText. */
export const MAX_LINE_CHARS = Math.floor(BAND_INNER_WIDTH / CHAR_ADVANCE_PX)

/** The firmware rejects a container above 999 UTF-8 bytes. */
export const MAX_CONTAINER_BYTES = 999

/** UTF-8 byte length without depending on TextEncoder (works in any runtime). */
export function utf8Bytes(value: string): number {
  let bytes = 0
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      // surrogate pair -> 4 bytes, skip the low surrogate
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}

/** Truncate to a character budget, appending an ellipsis only when it fits. */
export function truncate(value: string, maxChars: number): string {
  if (maxChars <= 0) return ''
  if (value.length <= maxChars) return value
  if (maxChars === 1) return '…'
  return value.slice(0, maxChars - 1).trimEnd() + '…'
}

/**
 * Wrap text to a character budget, breaking on spaces where possible.
 * Returns at most `maxLines` lines; the last line is ellipsised if it overflows.
 */
export function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (word === '') continue
    const candidate = current === '' ? word : `${current} ${word}`
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }
    if (current !== '') lines.push(current)
    // A single word longer than the budget gets hard-split.
    if (word.length > maxChars) {
      let rest = word
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars))
        rest = rest.slice(maxChars)
      }
      current = rest
    } else {
      current = word
    }
    if (lines.length >= maxLines) break
  }
  if (current !== '' && lines.length < maxLines) lines.push(current)

  if (lines.length > maxLines) lines.length = maxLines
  const consumed = lines.join(' ').length
  if (consumed < value.replace(/\s+/g, ' ').trim().length && lines.length > 0) {
    const last = lines.length - 1
    lines[last] = truncate(lines[last] ?? '', maxChars)
  }
  return lines
}

/**
 * Fit a list of fields into a byte budget by dropping whole fields from the
 * end, never by cutting a field in half. Returns the kept fields and how many
 * were dropped, so the caller can render a "+N" marker.
 */
export function fitFields(
  fields: string[],
  separator: string,
  maxBytes: number,
): { text: string; dropped: number } {
  const kept: string[] = []
  for (const field of fields) {
    const candidate = [...kept, field].join(separator)
    if (utf8Bytes(candidate) > maxBytes) break
    kept.push(field)
  }
  const dropped = fields.length - kept.length
  return { text: kept.join(separator), dropped }
}

/** "9m", "in 2h", "now", "3m ago" — short enough for the header band. */
export function relTime(targetIso: string, nowMs: number): string {
  const target = Date.parse(targetIso)
  if (Number.isNaN(target)) return '--'
  const deltaMin = Math.round((target - nowMs) / 60000)
  const abs = Math.abs(deltaMin)

  if (abs < 1) return 'now'
  if (abs < 60) return deltaMin > 0 ? `${abs}m` : `${abs}m ago`
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  const body = mins === 0 ? `${hours}h` : `${hours}h${mins}m`
  return deltaMin > 0 ? body : `${body} ago`
}

/** "12:04" in the device's local time. */
export function clockTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** Initials for a compact attendee line: "Ada Lovelace" -> "AL". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 2).toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

/** A progress bar built from glyphs that ship in the firmware font. */
export function progressBar(filled: number, total: number): string {
  const safeTotal = Math.max(1, total)
  const safeFilled = Math.max(0, Math.min(safeTotal, filled))
  return '━'.repeat(safeFilled) + '─'.repeat(safeTotal - safeFilled)
}
