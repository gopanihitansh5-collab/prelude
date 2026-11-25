// The page layout: three text containers on a 576x288 canvas.
//
// Firmware rules this file has to satisfy, each pinned by a test:
//   • exactly one container sets isEventCapture: 1
//   • zOrderIndex is all-or-nothing per page and unique
//   • text stays under 999 UTF-8 bytes per container
//   • at most 12 containers per page (we use 3)
//
// Two measured findings shape the choices below:
//
//   H2 — all five textColor levels render, but they look too alike to rank
//        text. So brightness is NOT used for hierarchy. Hierarchy comes from
//        position, spacing and glyph weight.
//
//   H20 — a page rebuild cannot animate, and a page rebuilt with empty text
//        then filled by an upgrade shows the fill as a second jump. So the
//        startup page is built with its text already in it, and every later
//        change is an in-place upgrade, never a rebuild.

import { CreateStartUpPageContainer, TextContainerProperty, TextContainerUpgrade } from '@evenrealities/even_hub_sdk'
import type { Bands } from '../core/layout.ts'

export const CONTAINER_IDS = {
  header: 1,
  body: 2,
  status: 3,
} as const

export const CONTAINER_NAMES = {
  header: 'hdr',
  body: 'body',
  status: 'sts',
} as const

/** Geometry, in canvas pixels. Origin is top-left. */
export const GEOMETRY = {
  header: { xPosition: 0, yPosition: 0, width: 576, height: 32 },
  body: { xPosition: 0, yPosition: 36, width: 576, height: 200 },
  status: { xPosition: 0, yPosition: 244, width: 576, height: 44 },
} as const

/**
 * Brightness per band.
 *
 * H2 says the five levels are not a usable hierarchy, so all three bands sit at
 * the device default (4). Visual separation comes from the gap in y, not from
 * brightness.
 */
export const BRIGHTNESS = {
  header: 4,
  body: 4,
  status: 4,
} as const

export function buildContainers(bands: Bands): TextContainerProperty[] {
  return [
    new TextContainerProperty({
      ...GEOMETRY.header,
      borderWidth: 0,
      paddingLength: 8,
      containerID: CONTAINER_IDS.header,
      containerName: CONTAINER_NAMES.header,
      content: bands.header,
      textColor: BRIGHTNESS.header,
      isEventCapture: 0,
      zOrderIndex: 1,
    }),
    new TextContainerProperty({
      ...GEOMETRY.body,
      borderWidth: 0,
      paddingLength: 8,
      containerID: CONTAINER_IDS.body,
      containerName: CONTAINER_NAMES.body,
      content: bands.body,
      textColor: BRIGHTNESS.body,
      // The body is the single event-capturing container. Scroll gestures
      // arrive as textEvent because a text container holds capture.
      isEventCapture: 1,
      zOrderIndex: 2,
    }),
    new TextContainerProperty({
      ...GEOMETRY.status,
      borderWidth: 0,
      paddingLength: 8,
      containerID: CONTAINER_IDS.status,
      containerName: CONTAINER_NAMES.status,
      content: bands.status,
      textColor: BRIGHTNESS.status,
      isEventCapture: 0,
      zOrderIndex: 3,
    }),
  ]
}

/** The startup page, built with its text already in it (H20). */
export function startupPage(bands: Bands): CreateStartUpPageContainer {
  const textObject = buildContainers(bands)
  return new CreateStartUpPageContainer({
    containerTotalNum: textObject.length,
    textObject,
  })
}

/** In-place updates for all three bands. Never a rebuild. */
export function upgrades(bands: Bands): TextContainerUpgrade[] {
  return [
    new TextContainerUpgrade({
      containerID: CONTAINER_IDS.header,
      containerName: CONTAINER_NAMES.header,
      content: bands.header,
      textColor: BRIGHTNESS.header,
    }),
    new TextContainerUpgrade({
      containerID: CONTAINER_IDS.body,
      containerName: CONTAINER_NAMES.body,
      content: bands.body,
      textColor: BRIGHTNESS.body,
    }),
    new TextContainerUpgrade({
      containerID: CONTAINER_IDS.status,
      containerName: CONTAINER_NAMES.status,
      content: bands.status,
      textColor: BRIGHTNESS.status,
    }),
  ]
}

/**
 * The contextual menu. This is the fallback for anything that would otherwise
 * depend on long press (H19), and the route for rare actions (H7).
 *
 * Labels are verbs, not state readouts: the menu is fire-and-forget and does
 * not re-render, so a label like "Status: high" would go stale.
 *
 * Four items, each mapped to a real handler in `Controller.onMenu`. The lens
 * has no spare gesture for memory or follow-ups, so the menu is the only route
 * to those screens — which is exactly what H7 recommends for rare actions.
 */
export const MENU_ITEMS = [
  { itemName: 'Speak', itemID: 1 },
  { itemName: 'Recall', itemID: 2 },
  { itemName: 'Follow-ups', itemID: 3 },
  { itemName: 'Refresh', itemID: 4 },
] as const
