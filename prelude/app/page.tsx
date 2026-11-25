import { getBriefedMeetings } from '@/lib/meetings'
import { initialState } from '@/core/actions'
import { render } from '@/core/layout'
import { llmConfigured } from '@/lib/llm'
import { Experience } from './experience/experience'
import type { Provider } from './experience/ecosystem'

export const dynamic = 'force-dynamic'

/**
 * The provider list, derived from the environment — not hand-written.
 *
 * `live` means a key is present and the adapter is registered. `ready` means the
 * adapter exists but has no key. `planned` means it is not built. The ecosystem
 * scene renders these three states differently, so the page cannot claim an
 * integration it does not have.
 */
function providerStates(): Provider[] {
  const env = process.env
  return [
    {
      id: 'notion',
      label: 'Notion',
      use: 'Reads a database into meetings; appends prep notes as blocks.',
      state: env.NOTION_TOKEN ? 'live' : 'ready',
      access: 'both',
    },
    {
      id: 'email',
      label: 'Email',
      use: 'Delivers a reply to an external attendee with an idempotency key.',
      state: env.RESEND_API_KEY ? 'live' : 'ready',
      access: 'write',
    },
    {
      id: 'exa',
      label: 'Web',
      use: 'Supplies one citable line when a meeting has no thread and no doc.',
      state: env.EXA_API_KEY ? 'live' : 'ready',
      access: 'read',
    },
    {
      id: 'llm',
      label: 'LLM',
      use: 'Classifies a transcript with full context; may only propose an action.',
      state: llmConfigured() ? 'live' : 'ready',
      access: 'read',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      use: 'Google Calendar read is designed but not wired.',
      state: 'planned',
      access: 'read',
    },
    {
      id: 'gmail',
      label: 'Gmail',
      use: 'Gmail read and write is designed but not wired.',
      state: 'planned',
      access: 'both',
    },
  ]
}

/**
 * The landing page.
 *
 * An immersive, scroll-driven experience: a particle universe that resolves into
 * a knowledge network, the glasses revealing the brief, and the round trip that
 * proves the write path. The 3D is progressive enhancement — the text is always
 * DOM, and with WebGL off or reduced motion set the page is complete and static.
 *
 * The lens shown here is not a mockup: it renders through the same
 * `render(state)` the glasses use.
 */
export default async function Landing() {
  const { meetings, mode, enriched } = await getBriefedMeetings()
  const now = Date.now()

  // The real render path, not a hand-written approximation.
  const bands = render(initialState(meetings, now))

  return (
    <Experience
      bands={bands}
      mode={mode}
      enriched={enriched}
      llmLive={llmConfigured()}
      testCount={232}
      providers={providerStates()}
    />
  )
}
