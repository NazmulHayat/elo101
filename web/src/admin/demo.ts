import type { Range, Stats } from '../../api/stats'

// Made-up numbers so the layout can be checked before real traffic exists (/admin/?demo).
const HOURS: Record<Range, number> = { '24h': 24, '7d': 168, '30d': 720, '90d': 2160 }

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function demoStats(range: Range): Stats {
  const r = rng(HOURS[range])
  const hours = HOURS[range]
  const bucket = hours <= 24 ? 'hour' : 'day'
  const n = bucket === 'hour' ? 24 : hours / 24
  const step = bucket === 'hour' ? 3600_000 : 86_400_000
  const end = Math.floor(Date.now() / step) * step
  const series = Array.from({ length: n }, (_, i) => {
    const t = new Date(end - (n - 1 - i) * step)
    const wave = bucket === 'hour' ? 0.4 + 0.6 * Math.sin(((t.getUTCHours() - 6) / 24) * Math.PI) ** 2 : 0.7 + 0.3 * Math.sin(i / 2.3)
    const growth = 0.6 + (0.4 * i) / n
    const visitors = Math.round((bucket === 'hour' ? 9 : 120) * wave * growth * (0.8 + r() * 0.4))
    const analyses = Math.round(visitors * (0.55 + r() * 0.15))
    return {
      t: t.toISOString(), visitors, pageviews: Math.round(visitors * (1.6 + r() * 0.5)), analyses,
      failures: Math.round(analyses * r() * 0.06), started: Math.round(analyses * (1.08 + r() * 0.08)), p50: +(9 + r() * 4).toFixed(1), p90: +(19 + r() * 9).toFixed(1),
    }
  })
  const previousSeries = series.map((pt, i) => ({
    ...pt, t: new Date(new Date(pt.t).getTime() - n * step).toISOString(),
    visitors: Math.round(pt.visitors * (0.7 + 0.25 * Math.sin(i))), pageviews: Math.round(pt.pageviews * (0.75 + 0.2 * Math.cos(i))),
    analyses: Math.round(pt.analyses * 0.8), failures: Math.round(pt.failures * 1.3),
  }))
  const sum = (k: 'visitors' | 'pageviews' | 'analyses' | 'failures') => series.reduce((s, p) => s + p[k], 0)
  const visitors = Math.round(sum('visitors') * 0.7)
  const started = Math.round(sum('analyses') * 1.12)
  const current = { visitors, pageviews: sum('pageviews'), sessions: Math.round(visitors * 1.3), started, finished: sum('analyses'), failures: sum('failures'), medianSeconds: 11.4 }
  const previous = { visitors: Math.round(visitors * 0.82), pageviews: Math.round(current.pageviews * 0.85), sessions: Math.round(current.sessions * 0.8), started: Math.round(started * 0.9), finished: Math.round(current.finished * 0.86), failures: Math.round(current.failures * 1.3), medianSeconds: 12.9 }
  const heatmap = []
  for (let day = 1; day <= 7; day++) for (let hour = 0; hour < 24; hour++) {
    const base = Math.sin(((hour - 5) / 24) * Math.PI) ** 2 * (day >= 6 ? 1.4 : 1)
    heatmap.push({ day, hour, value: Math.round(base * 30 * (0.6 + r() * 0.8)) })
  }
  return {
    range, bucket, generatedAt: new Date().toISOString(), live: 3, kpis: { current, previous }, series, previousSeries,
    funnel: [
      { label: 'Visited', value: visitors }, { label: 'Started analysis', value: Math.round(visitors * 0.64) },
      { label: 'Finished analysis', value: Math.round(visitors * 0.58) }, { label: 'Opened review', value: Math.round(visitors * 0.41) },
      { label: 'Practiced or explained', value: Math.round(visitors * 0.16) },
    ],
    features: [
      { label: 'Review from Start', value: Math.round(visitors * 0.5) }, { label: 'Review from a turning point', value: Math.round(visitors * 0.34) },
      { label: 'Retry a move', value: Math.round(visitors * 0.22) }, { label: 'Explain a move', value: Math.round(visitors * 0.09) },
      { label: 'Open a game link', value: Math.round(visitors * 0.3) }, { label: 'Retry a failed analysis', value: Math.round(visitors * 0.02) },
    ],
    vitals: { lcp: 1840, inp: 230, cls: 0.03, fcp: 1210, samples: 412 },
    errors: [
      { source: 'Analysis', message: 'Could not parse PGN: unexpected token at move 34', count: 14, last: new Date(Date.now() - 3600_000).toISOString() },
      { source: 'Game link', message: 'Chess.com did not return the game (404)', count: 6, last: new Date(Date.now() - 7200_000).toISOString() },
      { source: 'Crash', message: 'TypeError: Cannot read properties of undefined (reading \'fen_after\')', count: 2, last: new Date(Date.now() - 86_400_000).toISOString() },
    ],
    breakdowns: {
      country: [{ label: 'United States', value: 320 }, { label: 'India', value: 210 }, { label: 'Bangladesh', value: 140 }, { label: 'United Kingdom', value: 90 }, { label: 'Germany', value: 60 }, { label: 'Unknown', value: 40 }],
      referrer: [{ label: 'Direct', value: 380 }, { label: 'www.google.com', value: 240 }, { label: 'www.reddit.com', value: 120 }, { label: 'www.chess.com', value: 70 }, { label: 'lichess.org', value: 45 }],
      device: [{ label: 'Desktop', value: 560 }, { label: 'Mobile', value: 300 }, { label: 'Tablet', value: 40 }],
      browser: [{ label: 'Chrome', value: 610 }, { label: 'Safari', value: 180 }, { label: 'Firefox', value: 70 }, { label: 'Edge', value: 40 }],
      os: [{ label: 'Windows', value: 400 }, { label: 'Mac OS X', value: 210 }, { label: 'Android', value: 160 }, { label: 'iOS', value: 130 }],
      gameSite: [{ label: 'www.chess.com', value: 180 }, { label: 'lichess.org', value: 95 }],
    },
    returning: { visitors, returning: Math.round(visitors * 0.27) },
    heatmap,
  }
}
