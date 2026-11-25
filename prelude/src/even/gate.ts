// Input gating, from measured behaviour on real G2 hardware.
//
// Two findings from maticsh/matic-even (measured on a real pair, SDK 0.0.16)
// that change how input must be handled:
//
//   H12 — one long swipe can arrive as SEVERAL scroll events. A screen that
//         changes on swipe then flips more than once. Only a very short swipe
//         gives exactly one event. Fix: act on the first event, then ignore
//         swipes for ~700 ms.
//
//   H11 — quick repeated taps are read as a double tap, and on the root page a
//         double tap opens the exit dialog. So a triple tap never reaches the
//         app as three taps. Fix: never ask for quick repeated taps.
//
//   H19 — users can bind a temple's long press to a system action (Even AI).
//         An app cannot count on a long press reaching it. Fix: never make a
//         feature depend on long press alone; offer a menu item as well.

/** Let one event through, then ignore the rest for `ms`. */
export function createGate(ms: number): (now: number) => boolean {
  let last = -Infinity
  return (now: number) => {
    if (now - last < ms) return false
    last = now
    return true
  }
}

/** Swipe gate. 700 ms is the value the field notes recommend. */
export const SWIPE_GATE_MS = 700

/** Tap gate. Guards against H11 turning a fast double-tap into an exit. */
export const TAP_GATE_MS = 350
