// The controller: state -> layout -> containers, and gestures -> reducer.
//
// Rules learned from measured hardware behaviour (maticsh/matic-even, real G2,
// SDK 0.0.16):
//
//   • Debounce display writes. The BLE render queue is slow (~83 ms per
//     textContainerUpgrade), so a fast-tapping user must not queue overlapping
//     upgrades. One write in flight, one pending.
//
//   • Never await slow work inside the event dispatcher. The dispatcher drops
//     events while a handler is in flight, so network calls are fired and
//     forgotten, and their result arrives as a `receipt` input.
//
//   • Gate swipes (H12). One long swipe can arrive as several scroll events.
//
//   • Never depend on long press (H19). Users can bind it to Even AI. The
//     contextual menu is the reliable route for the same action.
//
//   • Treat every foreground event as a checkpoint (H7). Save state, re-arm
//     audio. Never map EXIT to pause — with overlays, EXIT fires when the menu
//     closes, just as the user comes back.

import { render } from '../core/layout.ts'
import { initialState, reduce } from '../core/actions.ts'
import type { Effect, Input } from '../core/actions.ts'
import type { AppState, Meeting, Receipt } from '../core/types.ts'
import { connect, eventTypeOf, hasEvenHost, isExitEvent, toInput } from './bridge.ts'
import type { EvenAppBridge } from './bridge.ts'
import { MENU_ITEMS, startupPage, upgrades } from './containers.ts'
import { createGate, SWIPE_GATE_MS, TAP_GATE_MS } from './gate.ts'

export interface ControllerOptions {
  /** Where the backend lives. Empty string means same-origin. */
  apiBase?: string
  /** Called after every state change, for the browser mirror. */
  onState?: (state: AppState) => void
  /** Called when the app should exit. */
  onExit?: () => void
  /** Called when the user asks to speak, from either long press or the menu. */
  onListen?: () => void
  /** Called when the user asks to recall something, from the menu. */
  onRecall?: () => void
}

export class Controller {
  private state: AppState
  private bridge: EvenAppBridge | null = null
  private writing = false
  private pending: string | null = null
  private lastWritten = ''
  private readonly apiBase: string
  private readonly onState?: (state: AppState) => void
  private readonly onExit?: () => void
  private readonly onListen?: () => void
  private readonly onRecall?: () => void

  // H12: one long swipe can arrive as several scroll events.
  private readonly swipeGate = createGate(SWIPE_GATE_MS)
  // H11: quick repeated taps become a double tap, which exits on the root page.
  private readonly tapGate = createGate(TAP_GATE_MS)

  constructor(meetings: Meeting[], nowMs: number, options: ControllerOptions = {}) {
    this.state = initialState(meetings, nowMs)
    this.apiBase = options.apiBase ?? ''
    this.onState = options.onState
    this.onExit = options.onExit
    this.onListen = options.onListen
    this.onRecall = options.onRecall
  }

  getState(): AppState {
    return this.state
  }

  /**
   * Attach the SDK bridge and paint the first page.
   *
   * `waitForEvenAppBridge()` never resolves in a plain browser, so the caller
   * races it against a timeout. In the browser the mirror still works; on
   * hardware the bridge wins the race.
   *
   * With no Even host there is no display to paint: the SDK talks to the
   * glasses through a Flutter handler that only exists inside the Even app, and
   * every display call fails without it. Calling anyway produced a red
   * "createStartUpPageContainer failed: 1" in the browser console on every
   * load — a hard error for a condition that is expected. So the call is
   * skipped, once, and said out loud at info level; the page renders the same
   * three strings through React, which is what the mirror is for.
   */
  async attach(): Promise<void> {
    this.bridge = await connect()
    this.restoreCheckpoint()
    const bands = render(this.state)
    this.lastWritten = JSON.stringify(bands)

    if (hasEvenHost()) {
      const result = await this.bridge.createStartUpPageContainer(startupPage(bands))
      if (result !== 0) {
        console.error('createStartUpPageContainer failed:', result)
      }
    } else {
      console.info(
        '[prelude] no Even host — browser mirror mode. The display container is not created; ' +
          'this page renders the same render(state) strings itself.',
      )
    }

    this.emit()

    this.bridge.onEvenHubEvent((event) => {
      // H7: the contextual menu is a fifth input, and it bypasses
      // isEventCapture entirely.
      const menuId = event.menuItemClickEvent?.itemID
      if (menuId !== undefined) {
        this.onMenu(menuId)
        return
      }

      if (isExitEvent(event)) {
        this.checkpoint()
        return
      }

      // H7: every foreground event is a checkpoint, in either direction.
      const sysType = eventTypeOf(event.sysEvent)
      if (sysType === 4 || sysType === 5) {
        this.checkpoint()
        return
      }

      const input = toInput(event)
      if (input) this.dispatch(input)
    })
  }

  /** Feed one gesture in. Safe to call before attach() — state still updates. */
  dispatch(input: Input): void {
    const now = Date.now()

    // H12: gate swipes so one long swipe cannot flip several screens.
    if (input.type === 'up' || input.type === 'down') {
      if (!this.swipeGate(now)) return
    }

    // H11: gate taps so a fast double-tap is not read as two actions.
    if (input.type === 'click') {
      if (!this.tapGate(now)) return
    }

    const { state, effect } = reduce(this.state, input)
    this.state = state
    this.emit()
    void this.runEffect(effect)
    void this.paint()
  }

  /** Replace the meeting list, e.g. after a refresh. */
  setMeetings(meetings: Meeting[]): void {
    this.state = { ...this.state, meetings, meetingIndex: 0 }
    this.emit()
    void this.paint()
  }

  private emit(): void {
    this.onState?.(this.state)
  }

  /** H7: cheap, safe to repeat, called on every foreground event. */
  private checkpoint(): void {
    try {
      localStorage.setItem('prelude.screen', this.state.screen)
      localStorage.setItem('prelude.meetingIndex', String(this.state.meetingIndex))
    } catch {
      /* storage can be unavailable; a checkpoint must never throw */
    }
  }

  /**
   * H7: restore the checkpoint written by `checkpoint()`.
   *
   * Without this the checkpoint is write-only and "resume after exit" does not
   * actually work. Only the screen and meeting index are restored — never a
   * receipt, because a stale receipt would claim a write that may not have
   * happened in this session.
   */
  private restoreCheckpoint(): void {
    try {
      const screen = localStorage.getItem('prelude.screen')
      const index = Number(localStorage.getItem('prelude.meetingIndex'))
      const validScreens: AppState['screen'][] = [
        'brief',
        'actions',
        'agenda',
        'note',
        'memory',
        'followup',
        'voice',
        'receipt',
      ]
      const restoredScreen =
        screen && validScreens.includes(screen as AppState['screen'])
          ? (screen as AppState['screen'])
          : 'brief'
      // A receipt screen with no receipt is meaningless; fall back to the brief.
      const safeScreen = restoredScreen === 'receipt' ? 'brief' : restoredScreen
      const safeIndex =
        Number.isInteger(index) && index >= 0 && index < this.state.meetings.length ? index : 0
      this.state = { ...this.state, screen: safeScreen, meetingIndex: safeIndex }
    } catch {
      /* storage can be unavailable; a restore must never throw */
    }
  }

  private onMenu(itemID: number): void {
    switch (itemID) {
      case 1:
        // "Speak" — the reliable route to voice, since long press can be
        // taken by the OS (H19).
        this.onListen?.()
        return
      case 2:
        // "Recall" — the memory screen. Reachable only from here, because the
        // lens has no spare gesture and the menu is the documented route for
        // rare actions (H7).
        this.onRecall?.()
        return
      case 3:
        // "Follow-ups" — every open commitment across meetings.
        this.dispatch({ type: 'memory', query: '' })
        this.state = { ...this.state, screen: 'followup' }
        this.emit()
        void this.paint()
        return
      case 4:
        // "Refresh" — actually refetch, not just tick the clock.
        void this.refresh()
        return
      default:
        return
    }
  }

  /**
   * Refetch the meeting list from the backend.
   *
   * Falls back silently to the current list on any failure, so a demo with no
   * network still works. The mode is reported through `onState` so the UI can
   * show `demo` rather than pretending.
   */
  async refresh(): Promise<void> {
    try {
      const res = await fetch(`${this.apiBase}/api/briefs`, { cache: 'no-store' })
      if (!res.ok) return
      const body = (await res.json()) as { meetings?: Meeting[] }
      if (Array.isArray(body.meetings) && body.meetings.length > 0) {
        this.setMeetings(body.meetings)
      }
    } catch {
      /* offline: keep the current list */
    }
  }

  private async runEffect(effect: Effect): Promise<void> {
    switch (effect.kind) {
      case 'exit':
        this.onExit?.()
        await this.bridge?.shutDownPageContainer(1)
        return

      case 'listen':
        this.onListen?.()
        return

      case 'refresh':
        void this.refresh()
        return

      case 'act': {
        if (!effect.action || !effect.meetingId) return
        const receipt = await this.performAction(effect.meetingId, effect.action.kind, effect.action.payload)
        this.dispatch({ type: 'receipt', receipt })
        return
      }

      default:
        return
    }
  }

  private async performAction(
    meetingId: string,
    kind: string,
    payload?: string,
  ): Promise<Receipt> {
    const at = new Date().toISOString()
    try {
      const res = await fetch(`${this.apiBase}/api/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The act effect only fires from a user tap (actions/note) or a voice
        // action that reached `confirmed` through review, so this request *is*
        // the confirmation. The server requires the field explicitly.
        body: JSON.stringify({ meetingId, action: kind, text: payload, confirmed: true }),
      })
      if (!res.ok) {
        return {
          ok: false,
          delivered: payload ?? kind,
          at,
          channel: 'unknown',
          error: `HTTP ${res.status}`,
        }
      }
      const body = (await res.json()) as Partial<Receipt>
      return {
        ok: body.ok ?? true,
        // The server's delivered string wins. The client never re-derives it.
        delivered: body.delivered ?? payload ?? kind,
        at: body.at ?? at,
        channel: body.channel ?? 'unknown',
        ...(body.error ? { error: body.error } : {}),
      }
    } catch (err) {
      return {
        ok: false,
        delivered: payload ?? kind,
        at,
        channel: 'offline',
        error: err instanceof Error ? err.message : 'network error',
      }
    }
  }

  /** Serialise display writes: one in flight, one pending, newest wins. */
  private async paint(): Promise<void> {
    const bands = render(this.state)
    const key = JSON.stringify(bands)
    if (key === this.lastWritten) return
    if (this.writing) {
      this.pending = key
      return
    }
    if (!this.bridge) return

    this.writing = true
    try {
      for (const upgrade of upgrades(bands)) {
        await this.bridge.textContainerUpgrade(upgrade)
      }
      this.lastWritten = key
    } finally {
      this.writing = false
      const next = this.pending
      this.pending = null
      if (next && next !== this.lastWritten) void this.paint()
    }
  }
}

export { eventTypeOf, MENU_ITEMS }
