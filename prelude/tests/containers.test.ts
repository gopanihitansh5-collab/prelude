import { describe, expect, it } from 'vitest'
import { buildContainers, GEOMETRY, MENU_ITEMS, startupPage, upgrades } from '../src/even/containers.ts'
import { utf8Bytes } from '../src/core/format.ts'
import type { Bands } from '../src/core/layout.ts'

const BANDS: Bands = {
  header: 'PRELUDE · 9m',
  body: 'Ada Lovelace · CTO\nPricing v3 — final call',
  status: 'tap act · hold speak · swipe next',
}

describe('container rules', () => {
  it('uses exactly three containers', () => {
    expect(buildContainers(BANDS)).toHaveLength(3)
  })

  it('has exactly one event-capturing container', () => {
    // The firmware silently lets two containers steal input from each other.
    const capturing = buildContainers(BANDS).filter((c) => c.isEventCapture === 1)
    expect(capturing).toHaveLength(1)
  })

  it('captures on the body, so scroll arrives as textEvent', () => {
    const capturing = buildContainers(BANDS).find((c) => c.isEventCapture === 1)
    expect(capturing?.containerName).toBe('body')
  })

  it('sets zOrderIndex on every container (all-or-nothing)', () => {
    const containers = buildContainers(BANDS)
    expect(containers.every((c) => typeof c.zOrderIndex === 'number')).toBe(true)
  })

  it('uses unique zOrderIndex values', () => {
    const values = buildContainers(BANDS).map((c) => c.zOrderIndex)
    expect(new Set(values).size).toBe(values.length)
  })

  it('keeps every band under the 999-byte firmware limit', () => {
    for (const container of buildContainers(BANDS)) {
      expect(utf8Bytes(container.content ?? '')).toBeLessThanOrEqual(999)
    }
  })

  it('keeps containers inside the 576x288 canvas', () => {
    for (const container of buildContainers(BANDS)) {
      expect((container.xPosition ?? 0) + (container.width ?? 0)).toBeLessThanOrEqual(576)
      expect((container.yPosition ?? 0) + (container.height ?? 0)).toBeLessThanOrEqual(288)
    }
  })

  it('does not overlap the bands vertically', () => {
    const headerBottom = GEOMETRY.header.yPosition + GEOMETRY.header.height
    const bodyBottom = GEOMETRY.body.yPosition + GEOMETRY.body.height
    expect(GEOMETRY.body.yPosition).toBeGreaterThanOrEqual(headerBottom)
    expect(GEOMETRY.status.yPosition).toBeGreaterThanOrEqual(bodyBottom)
  })

  it('builds the startup page with its text already in it', () => {
    // H20: a page rebuilt with empty text then filled shows a second jump.
    const page = startupPage(BANDS)
    expect(page.containerTotalNum).toBe(3)
    expect(page.textObject?.every((c) => (c.content ?? '').length > 0)).toBe(true)
  })

  it('upgrades all three bands in place', () => {
    const list = upgrades(BANDS)
    expect(list).toHaveLength(3)
    expect(list.map((u) => u.containerName)).toEqual(['hdr', 'body', 'sts'])
  })

  it('matches containerID and containerName between create and upgrade', () => {
    const created = buildContainers(BANDS)
    const updated = upgrades(BANDS)
    for (const upgrade of updated) {
      const match = created.find((c) => c.containerID === upgrade.containerID)
      expect(match?.containerName).toBe(upgrade.containerName)
    }
  })
})

describe('contextual menu', () => {
  it('has at most 10 items', () => {
    expect(MENU_ITEMS.length).toBeLessThanOrEqual(10)
  })

  it('uses non-zero unique itemIDs', () => {
    // itemID 0 is reserved by the protocol.
    const ids: number[] = MENU_ITEMS.map((m) => m.itemID)
    expect(ids.every((id) => id !== 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps every label under 32 UTF-8 bytes', () => {
    for (const item of MENU_ITEMS) {
      expect(utf8Bytes(item.itemName)).toBeLessThanOrEqual(32)
    }
  })

  it('labels actions as verbs, not state readouts', () => {
    // The menu is fire-and-forget and does not re-render, so a label like
    // "Status: high" would go stale.
    for (const item of MENU_ITEMS) {
      expect(item.itemName).not.toMatch(/:/)
    }
  })
})
