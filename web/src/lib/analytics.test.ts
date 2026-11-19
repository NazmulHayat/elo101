import { describe, expect, it } from 'vitest'
import { redactAnalyticsEvent } from './analytics'

describe('analytics URL privacy', () => {
  it('removes game handoff parameters and fragments from page views', () => {
    expect(redactAnalyticsEvent({ type: 'pageview', url: 'https://elo101.vercel.app/?game=https%3A%2F%2Fchess.com%2Fgame%2F123&user=Alice#review' }))
      .toEqual({ type: 'pageview', url: 'https://elo101.vercel.app/' })
  })
})
