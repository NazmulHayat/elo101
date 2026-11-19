import posthog, { type CaptureResult } from 'posthog-js'

// Project keys are public by design (they can only send events, never read them).
const KEY = import.meta.env.VITE_POSTHOG_KEY ?? 'phc_v4nruPEcSp64y2gScS8Qc877zsidR36kHk73FLnZQvU5'
const HOST = 'https://us.i.posthog.com'

let enabled = false

// Handoff URLs carry ?game=<link>&user=<name>. Keep only origin + path so no player names leave the browser.
function stripQuery(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    const u = new URL(value)
    return `${u.origin}${u.pathname}`
  } catch {
    return value
  }
}

const URL_PROPS = ['$current_url', '$referrer', '$initial_current_url', '$initial_referrer', '$session_entry_url']

export function redactPosthogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event
  for (const bag of [event.properties, event.$set, event.$set_once]) {
    if (!bag) continue
    for (const k of URL_PROPS) if (k in bag) bag[k] = stripQuery(bag[k])
  }
  return event
}

export function initPosthog() {
  if (!import.meta.env.PROD || !KEY) return
  posthog.init(KEY, {
    api_host: HOST,
    defaults: '2026-05-30', // pageviews on SPA navigation, page leave, web vitals
    person_profiles: 'identified_only', // anonymous visitors stay anonymous (and cheaper)
    persistence: 'localStorage', // no cookies
    autocapture: true,
    capture_exceptions: true,
    session_recording: { maskAllInputs: true },
    before_send: redactPosthogEvent,
  })
  enabled = true
}

export type TrackEvent =
  | 'game_link_opened'
  | 'game_link_failed'
  | 'analysis_started'
  | 'analysis_finished'
  | 'analysis_failed'
  | 'analysis_retried'
  | 'review_opened'
  | 'practice_started'
  | 'explain_requested'

export function track(event: TrackEvent, props?: Record<string, string | number | boolean | null | undefined>) {
  if (enabled) posthog.capture(event, props)
}
