import type { BeforeSendEvent } from '@vercel/analytics/react'

// Game handoff URLs can contain a game link and player name. Analytics needs only the page path.
export function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url)
  return { ...event, url: `${url.origin}${url.pathname}` }
}
