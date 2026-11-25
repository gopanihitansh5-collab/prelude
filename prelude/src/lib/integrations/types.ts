// The integration adapter contract.
//
// Every source of truth — Gmail, Calendar, Notion, Slack, Drive, Outlook — sits
// behind this one interface. The brief engine never learns which app a fact came
// from, so adding an integration never means rewriting the brief.
//
// The rule from the spec: the glasses never hold provider keys, OAuth refresh
// tokens, or privileged credentials. Adapters run on the server only.
//
// The data types live in `src/core/types.ts` so that `src/core/` never imports
// from `src/lib/`. This file re-exports them and adds the provider interface,
// which is the only thing that belongs to the integration layer.

import type {
  ActionRequest,
  ActionResult,
  Connection,
  ConnectionStatus,
  SearchQuery,
  SourceItem,
} from '@/core/types'

export type { ActionRequest, ActionResult, Connection, ConnectionStatus, SearchQuery, SourceItem }

export interface IntegrationProvider {
  /** Stable id, e.g. "notion". */
  readonly id: string
  /** Human name for the dashboard. */
  readonly label: string

  connect(): Promise<Connection>
  getStatus(): Promise<Connection>

  search(query: SearchQuery): Promise<SourceItem[]>
  getItem(id: string): Promise<SourceItem | null>

  execute(action: ActionRequest): Promise<ActionResult>
  disconnect(): Promise<void>
}
