import { describe, expect, it } from 'vitest'
import { mapNotionPage, meetingsFromNotionPages, type NotionPage } from '../src/core/notion-map.ts'

function page(properties: NotionPage['properties'], overrides: Partial<NotionPage> = {}): NotionPage {
  return { id: 'page-1', last_edited_time: '2026-11-25T09:00:00Z', properties, ...overrides }
}

describe('mapNotionPage', () => {
  it('maps a title and a date into a Meeting', () => {
    const meeting = mapNotionPage(
      page({
        Name: { type: 'title', title: [{ plain_text: 'Pricing v3 — final call' }] },
        When: { type: 'date', date: { start: '2026-11-25T14:09:00Z', end: '2026-11-25T14:39:00Z' } },
      }),
    )

    expect(meeting).not.toBeNull()
    expect(meeting?.title).toBe('Pricing v3 — final call')
    expect(meeting?.startsAt).toBe('2026-11-25T14:09:00Z')
    expect(meeting?.endsAt).toBe('2026-11-25T14:39:00Z')
    expect(meeting?.channel).toBe('notion')
    expect(meeting?.thread).toEqual([])
  })

  it('defaults the end time to 30 minutes when the date has no end', () => {
    const meeting = mapNotionPage(
      page({
        Name: { type: 'title', title: [{ plain_text: 'Standup' }] },
        When: { type: 'date', date: { start: '2026-11-25T14:00:00Z' } },
      }),
    )
    expect(meeting?.endsAt).toBe('2026-11-25T14:30:00.000Z')
  })

  it('returns null without a title', () => {
    const meeting = mapNotionPage(
      page({ When: { type: 'date', date: { start: '2026-11-25T14:00:00Z' } } }),
    )
    expect(meeting).toBeNull()
  })

  it('returns null without a date', () => {
    const meeting = mapNotionPage(
      page({ Name: { type: 'title', title: [{ plain_text: 'No date' }] } }),
    )
    expect(meeting).toBeNull()
  })

  it('reads people properties as attendees', () => {
    const meeting = mapNotionPage(
      page({
        Name: { type: 'title', title: [{ plain_text: 'Sync' }] },
        When: { type: 'date', date: { start: '2026-11-25T14:00:00Z' } },
        Attendees: { type: 'people', people: [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }] },
      }),
    )
    expect(meeting?.attendees.map((p) => p.name)).toEqual(['Ada Lovelace', 'Grace Hopper'])
  })

  it('splits a text attendees property on commas', () => {
    const meeting = mapNotionPage(
      page({
        Name: { type: 'title', title: [{ plain_text: 'Sync' }] },
        When: { type: 'date', date: { start: '2026-11-25T14:00:00Z' } },
        People: { type: 'rich_text', rich_text: [{ plain_text: 'Ada, Grace; Katherine' }] },
      }),
    )
    expect(meeting?.attendees.map((p) => p.name)).toEqual(['Ada', 'Grace', 'Katherine'])
  })

  it('parses agenda lines with and without minutes', () => {
    const meeting = mapNotionPage(
      page({
        Name: { type: 'title', title: [{ plain_text: 'Sync' }] },
        When: { type: 'date', date: { start: '2026-11-25T14:00:00Z' } },
        Agenda: {
          type: 'rich_text',
          rich_text: [{ plain_text: 'Enterprise tier ceiling 15m\nLaunch date' }],
        },
      }),
    )
    expect(meeting?.agenda).toEqual([
      { title: 'Enterprise tier ceiling', minutes: 15 },
      { title: 'Launch date' },
    ])
  })

  it('uses last_edited_time as the doc touch time', () => {
    const meeting = mapNotionPage(
      page({
        Name: { type: 'title', title: [{ plain_text: 'Sync' }] },
        When: { type: 'date', date: { start: '2026-11-25T14:00:00Z' } },
        Doc: { type: 'rich_text', rich_text: [{ plain_text: 'Pricing v3' }] },
      }),
    )
    expect(meeting?.doc).toEqual({ title: 'Pricing v3', touchedAt: '2026-11-25T09:00:00Z' })
  })
})

describe('meetingsFromNotionPages', () => {
  it('drops pages that cannot be meetings', () => {
    const meetings = meetingsFromNotionPages([
      page({
        Name: { type: 'title', title: [{ plain_text: 'Keep me' }] },
        When: { type: 'date', date: { start: '2026-11-25T14:00:00Z' } },
      }),
      page({ Name: { type: 'title', title: [{ plain_text: 'No date' }] } }, { id: 'page-2' }),
    ])
    expect(meetings.map((m) => m.title)).toEqual(['Keep me'])
  })
})
