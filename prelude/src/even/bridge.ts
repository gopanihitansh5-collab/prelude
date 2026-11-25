// The only file that talks to the Even Hub SDK's event stream.
//
// The single most important thing in this file is `eventTypeOf`. CLICK_EVENT is
// 0, and protobuf omits zero-value fields on the wire, so a single tap arrives
// as an envelope with NO eventType at all. The default has to be resolved
// INSIDE the envelope check. Writing
//   event.sysEvent?.eventType ?? OsEventTypeList.CLICK_EVENT
// would read CLICK on every event that carries no sysEvent at all — every
// scroll, lifecycle event and audio frame would fire the tap handler.

import { OsEventTypeList, waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import type { Input } from '../core/actions.ts'

export type { EvenAppBridge }

export async function connect(): Promise<EvenAppBridge> {
  return waitForEvenAppBridge()
}

/** Read the event type out of one envelope, resolving the CLICK default inside. */
export function eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!envelope) return null
  return envelope.eventType ?? OsEventTypeList.CLICK_EVENT
}

/**
 * Collapse the SDK's event surface into the four actions the app understands.
 * Returns null for events the app does not act on.
 */
export function toInput(event: {
  sysEvent?: { eventType?: OsEventTypeList }
  textEvent?: { eventType?: OsEventTypeList }
  listEvent?: { eventType?: OsEventTypeList }
}): Input | null {
  const sysType = eventTypeOf(event.sysEvent)
  const textType = eventTypeOf(event.textEvent)
  const listType = eventTypeOf(event.listEvent)

  // Long press arrives on sysEvent only, and must be checked before CLICK.
  if (sysType === OsEventTypeList.LONG_PRESS_EVENT) return { type: 'long_press' }
  if (sysType === OsEventTypeList.LONG_PRESS_RELEASE_EVENT) return { type: 'long_press_release' }

  // Double-tap carries a real non-zero id, so it is safe to match explicitly.
  if (
    sysType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
    textType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
    listType === OsEventTypeList.DOUBLE_CLICK_EVENT
  ) {
    return { type: 'double_click' }
  }

  // Scroll gestures arrive on textEvent (or listEvent when a list captures).
  if (textType === OsEventTypeList.SCROLL_TOP_EVENT || listType === OsEventTypeList.SCROLL_TOP_EVENT) {
    return { type: 'up' }
  }
  if (
    textType === OsEventTypeList.SCROLL_BOTTOM_EVENT ||
    listType === OsEventTypeList.SCROLL_BOTTOM_EVENT
  ) {
    return { type: 'down' }
  }

  // CLICK is the fallback an envelope lands on when it carries no type at all.
  if (sysType === OsEventTypeList.CLICK_EVENT || textType === OsEventTypeList.CLICK_EVENT) {
    return { type: 'click' }
  }

  return null
}

/** True when the event is a lifecycle event the app should react to. */
export function isExitEvent(event: { sysEvent?: { eventType?: OsEventTypeList } }): boolean {
  const t = event.sysEvent?.eventType
  return t === OsEventTypeList.SYSTEM_EXIT_EVENT || t === OsEventTypeList.ABNORMAL_EXIT_EVENT
}
