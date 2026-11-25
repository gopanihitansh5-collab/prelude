// Demo fixtures. Shaped exactly like the server's /api/briefs response, so the
// app runs with no backend and no secret. Times are relative to load so the
// card always reads "9m" rather than a date in the past.

import type { Meeting } from '../core/types.ts'

function iso(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString()
}

export function demoMeetings(): Meeting[] {
  return [
    {
      id: 'm-pricing',
      title: 'Pricing v3 — final call',
      startsAt: iso(9),
      endsAt: iso(39),
      attendees: [
        { name: 'Ada Lovelace', role: 'CTO' },
        { name: 'You', role: 'Founder' },
        { name: 'Grace Hopper', role: 'Eng' },
      ],
      thread: [
        {
          from: 'Ada',
          text: 'Numbers look right. One question on the enterprise tier before we lock it.',
          at: iso(-42),
        },
        { from: 'You', text: 'Sent the updated sheet, tab 3.', at: iso(-120) },
      ],
      doc: { title: 'Pricing v3', touchedAt: iso(-180) },
      agenda: [
        { title: 'Enterprise tier ceiling', minutes: 15 },
        { title: 'Annual vs monthly split', minutes: 10 },
        { title: 'Launch date', minutes: 10 },
      ],
      channel: 'notion',
    },
    {
      id: 'm-standup',
      title: 'Eng standup',
      startsAt: iso(52),
      endsAt: iso(67),
      attendees: [
        { name: 'Grace Hopper', role: 'Eng' },
        { name: 'You', role: 'Founder' },
      ],
      thread: [
        { from: 'Grace', text: 'Blocked on the migration — need a decision on the schema.', at: iso(-25) },
      ],
      agenda: [{ title: 'Migration blocker', minutes: 10 }],
      channel: 'slack',
    },
    {
      id: 'm-investor',
      title: 'Investor sync — Series A',
      startsAt: iso(180),
      endsAt: iso(225),
      attendees: [
        { name: 'Katherine Johnson', role: 'Partner' },
        { name: 'You', role: 'Founder' },
      ],
      thread: [
        { from: 'Katherine', text: 'Can you send the retention cohort before we meet?', at: iso(-300) },
      ],
      doc: { title: 'Series A deck', touchedAt: iso(-1440) },
      agenda: [
        { title: 'Retention cohort', minutes: 15 },
        { title: 'Use of funds', minutes: 15 },
        { title: 'Timeline', minutes: 15 },
      ],
      channel: 'email',
    },
  ]
}
