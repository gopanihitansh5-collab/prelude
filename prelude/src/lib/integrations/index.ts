// The adapter registry. One place that decides which provider is live.
//
// The rule from the spec: an explicit choice never silently changes provider.
// If a token is present the real adapter is used; if not, the demo adapter is
// used and the dashboard says so. There is no path where the app pretends to be
// live.

import { DemoAdapter } from './demo.ts'
import { ExaAdapter } from './exa.ts'
import { NotionAdapter } from './notion.ts'
import { ResendAdapter } from './resend.ts'
import { SlackAdapter } from './slack.ts'
import type { IntegrationProvider } from './types.ts'

export interface Registry {
  /** The adapter that handles writes for a given channel. */
  forChannel(channel: string): IntegrationProvider
  /** Every adapter that is configured, for the dashboard. */
  all(): IntegrationProvider[]
  /** True when at least one real provider is configured. */
  isLive(): boolean
}

export function createRegistry(env: NodeJS.ProcessEnv = process.env): Registry {
  const demo = new DemoAdapter()
  const adapters: IntegrationProvider[] = []

  if (env.NOTION_TOKEN) {
    adapters.push(new NotionAdapter(env.NOTION_TOKEN, env.NOTION_PAGE_ID ?? ''))
  }
  if (env.SLACK_TOKEN) {
    adapters.push(new SlackAdapter(env.SLACK_TOKEN, env.SLACK_CHANNEL ?? ''))
  }
  if (env.RESEND_API_KEY) {
    adapters.push(
      new ResendAdapter(env.RESEND_API_KEY, env.RESEND_FROM ?? '', env.RESEND_TO ?? ''),
    )
  }
  // Exa is read-only, so it is registered for search but never chosen for a
  // write. `forChannel` only matches on id, and no action targets 'exa'.
  if (env.EXA_API_KEY) {
    adapters.push(new ExaAdapter(env.EXA_API_KEY))
  }

  return {
    forChannel(channel: string): IntegrationProvider {
      const match = adapters.find((a) => a.id === channel)
      return match ?? demo
    },
    all(): IntegrationProvider[] {
      return adapters.length > 0 ? adapters : [demo]
    },
    isLive(): boolean {
      return adapters.length > 0
    },
  }
}
