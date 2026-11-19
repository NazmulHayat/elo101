// Vercel function: GET /api/stats?range=7d
// Reads PostHog with a server-only personal key and returns everything the /admin dashboard draws.
// Env: POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, ADMIN_PASSWORD (optional POSTHOG_HOST).

declare const process: { env: Record<string, string | undefined> }

export const RANGES = { '24h': 24, '7d': 168, '30d': 720, '90d': 2160 } as const
export type Range = keyof typeof RANGES

const FAIL_EVENTS = `('analysis_failed', 'game_link_failed', '$exception')`
// Leave out the dashboard itself and local testing.
const NOT_ADMIN = `coalesce(properties.$pathname, '') NOT LIKE '/admin%' AND coalesce(properties.$host, '') NOT LIKE 'localhost%' AND coalesce(properties.$host, '') NOT LIKE '127.0.0.1%'`
const CACHE_MS = 5 * 60 * 1000
const cache = new Map<Range, { at: number; data: Stats }>()

type Row = (string | number | null)[]

async function hogql(query: string): Promise<Row[]> {
  const host = process.env.POSTHOG_HOST ?? 'https://us.posthog.com'
  const res = await fetch(`${host}/api/projects/${process.env.POSTHOG_PROJECT_ID}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query }, name: 'elo101-admin' }),
  })
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return ((await res.json()) as { results: Row[] }).results
}

// PostHog limits concurrent API queries per project, so run a few at a time.
async function pool<T>(tasks: (() => Promise<T>)[], size = 3): Promise<T[]> {
  const out: T[] = new Array(tasks.length)
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < tasks.length) {
      const i = next++
      out[i] = await tasks[i]()
    }
  }))
  return out
}

const num = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export interface Kpis {
  visitors: number; pageviews: number; sessions: number
  started: number; finished: number; failures: number
  medianSeconds: number | null
}
export interface Point { t: string; visitors: number; pageviews: number; analyses: number; failures: number; p50: number | null; p90: number | null; started: number }
export interface Slice { label: string; value: number }
export interface Stats {
  range: Range; bucket: 'hour' | 'day'; generatedAt: string; live: number
  kpis: { current: Kpis; previous: Kpis }
  series: Point[]
  previousSeries: Point[]
  funnel: Slice[]
  features: Slice[]
  vitals: { lcp: number | null; inp: number | null; cls: number | null; fcp: number | null; samples: number }
  errors: { source: string; message: string; count: number; last: string }[]
  breakdowns: Record<'country' | 'referrer' | 'device' | 'browser' | 'os' | 'gameSite', Slice[]>
  returning: { visitors: number; returning: number }
  heatmap: { day: number; hour: number; value: number }[]
}

function emptyKpis(): Kpis {
  return { visitors: 0, pageviews: 0, sessions: 0, started: 0, finished: 0, failures: 0, medianSeconds: null }
}

// Every bucket in the window, so quiet hours/days draw as zero instead of a gap.
function buckets(hours: number, bucket: 'hour' | 'day'): string[] {
  const step = bucket === 'hour' ? 3600_000 : 86_400_000
  const now = new Date()
  const end = bucket === 'hour'
    ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
    : Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const count = bucket === 'hour' ? hours : hours / 24
  return Array.from({ length: count }, (_, i) => new Date(end - (count - 1 - i) * step).toISOString())
}

const isoKey = (v: unknown) => new Date(`${str(v).replace(' ', 'T')}${/Z|[+-]\d\d:?\d\d$/.test(str(v)) ? '' : 'Z'}`).toISOString()

export async function collect(range: Range): Promise<Stats> {
  const hours = RANGES[range]
  const bucket = hours <= 24 ? 'hour' : 'day'
  const since = `timestamp >= now() - toIntervalHour(${hours})`
  const base = `${since} AND ${NOT_ADMIN}`
  const pv = `event = '$pageview' AND ${base}`
  const breakdown = (expr: string, where = pv, measure = 'uniq(distinct_id)') =>
    `SELECT coalesce(nullIf(toString(${expr}), ''), 'Unknown') AS v, ${measure} AS n FROM events WHERE ${where} GROUP BY v ORDER BY n DESC LIMIT 6`

  const queries = {
    kpis: `SELECT if(timestamp >= now() - toIntervalHour(${hours}), 'current', 'previous') AS period,
        uniqIf(distinct_id, event = '$pageview'), countIf(event = '$pageview'), uniqIf($session_id, coalesce($session_id, '') != ''),
        countIf(event = 'analysis_started'), countIf(event = 'analysis_finished'), countIf(event IN ${FAIL_EVENTS}),
        quantileIf(0.5)(toFloat(properties.seconds), event = 'analysis_finished')
      FROM events WHERE timestamp >= now() - toIntervalHour(${hours * 2}) AND ${NOT_ADMIN} GROUP BY period`,
    live: `SELECT uniq(distinct_id) FROM events WHERE timestamp >= now() - toIntervalMinute(5) AND ${NOT_ADMIN}`,
    series: `SELECT ${bucket === 'hour' ? 'toStartOfHour' : 'toStartOfDay'}(timestamp) AS t,
        uniqIf(distinct_id, event = '$pageview'), countIf(event = '$pageview'),
        countIf(event = 'analysis_finished'), countIf(event IN ${FAIL_EVENTS}),
        quantileIf(0.5)(toFloat(properties.seconds), event = 'analysis_finished'),
        quantileIf(0.9)(toFloat(properties.seconds), event = 'analysis_finished'),
        countIf(event = 'analysis_started')
      FROM events WHERE timestamp >= now() - toIntervalHour(${hours * 2}) AND ${NOT_ADMIN} GROUP BY t ORDER BY t`,
    funnel: `SELECT count(), countIf(s > 0), countIf(f > 0), countIf(r > 0), countIf(d > 0) FROM (
        SELECT distinct_id,
          countIf(event = 'analysis_started') AS s, countIf(event = 'analysis_finished') AS f,
          countIf(event = 'review_opened') AS r, countIf(event IN ('practice_started', 'explain_requested')) AS d
        FROM events WHERE ${base} GROUP BY distinct_id HAVING countIf(event = '$pageview') > 0)`,
    features: `SELECT event, coalesce(toString(properties.via), ''), count() FROM events
      WHERE event IN ('review_opened', 'practice_started', 'explain_requested', 'analysis_retried', 'game_link_opened') AND ${base}
      GROUP BY event, properties.via`,
    vitals: `SELECT quantile(0.75)(toFloat(properties.$web_vitals_LCP_value)), quantile(0.75)(toFloat(properties.$web_vitals_INP_value)),
        quantile(0.75)(toFloat(properties.$web_vitals_CLS_value)), quantile(0.75)(toFloat(properties.$web_vitals_FCP_value)), count()
      FROM events WHERE event = '$web_vitals' AND ${base}`,
    errors: `SELECT event, coalesce(nullIf(toString(properties.message), ''), nullIf(toString(properties.$exception_values), ''), 'Unknown error') AS msg,
        count() AS c, max(timestamp) FROM events WHERE event IN ${FAIL_EVENTS} AND ${base} GROUP BY event, msg ORDER BY c DESC LIMIT 8`,
    country: breakdown('properties.$geoip_country_name'),
    referrer: breakdown('properties.$referring_domain'),
    device: breakdown('properties.$device_type'),
    browser: breakdown('properties.$browser'),
    os: breakdown('properties.$os'),
    gameSite: breakdown('properties.host', `event = 'game_link_opened' AND ${base}`, 'count()'),
    returning: `SELECT count(), countIf(days > 1) FROM (
        SELECT distinct_id, uniq(toDate(timestamp)) AS days FROM events WHERE ${pv} GROUP BY distinct_id)`,
    heatmap: `SELECT toDayOfWeek(timestamp), toHour(timestamp), uniq(distinct_id) FROM events WHERE ${pv} GROUP BY 1, 2`,
  }
  const names = Object.keys(queries) as (keyof typeof queries)[]
  const results = await pool(names.map((n) => () => hogql(queries[n])))
  const r = Object.fromEntries(names.map((n, i) => [n, results[i]])) as Record<keyof typeof queries, Row[]>

  const kpis = { current: emptyKpis(), previous: emptyKpis() }
  for (const [period, visitors, pageviews, sessions, started, finished, failures, median] of r.kpis) {
    kpis[period as 'current' | 'previous'] = {
      visitors: num(visitors) ?? 0, pageviews: num(pageviews) ?? 0, sessions: num(sessions) ?? 0,
      started: num(started) ?? 0, finished: num(finished) ?? 0, failures: num(failures) ?? 0, medianSeconds: num(median),
    }
  }

  const byT = new Map(r.series.map((row) => [isoKey(row[0]), row]))
  // One query covers both windows; the first half is the previous period, drawn as a comparison line.
  const all = buckets(hours * 2, bucket).map((t) => {
    const row = byT.get(t)
    return {
      t, visitors: num(row?.[1]) ?? 0, pageviews: num(row?.[2]) ?? 0, analyses: num(row?.[3]) ?? 0,
      failures: num(row?.[4]) ?? 0, p50: num(row?.[5]), p90: num(row?.[6]), started: num(row?.[7]) ?? 0,
    }
  })
  const previousSeries = all.slice(0, all.length / 2)
  const series = all.slice(all.length / 2)

  const f = r.funnel[0] ?? [0, 0, 0, 0, 0]
  const funnel = ['Visited', 'Started analysis', 'Finished analysis', 'Opened review', 'Practiced or explained']
    .map((label, i) => ({ label, value: num(f[i]) ?? 0 }))

  const featureCount = (event: string, via?: string) =>
    r.features.filter((row) => row[0] === event && (via === undefined || row[1] === via)).reduce((s, row) => s + (num(row[2]) ?? 0), 0)
  const features = [
    { label: 'Review from Start', value: featureCount('review_opened', 'start') },
    { label: 'Review from a turning point', value: featureCount('review_opened', 'turning_point') },
    { label: 'Retry a move', value: featureCount('practice_started') },
    { label: 'Explain a move', value: featureCount('explain_requested') },
    { label: 'Open a game link', value: featureCount('game_link_opened') },
    { label: 'Retry a failed analysis', value: featureCount('analysis_retried') },
  ]

  const v = r.vitals[0] ?? []
  const slices = (rows: Row[]) => rows.map(([label, value]) => ({ label: str(label), value: num(value) ?? 0 }))
  const ret = r.returning[0] ?? [0, 0]

  return {
    range, bucket, generatedAt: new Date().toISOString(), live: num(r.live[0]?.[0]) ?? 0,
    kpis, series, previousSeries, funnel, features,
    vitals: { lcp: num(v[0]), inp: num(v[1]), cls: num(v[2]), fcp: num(v[3]), samples: num(v[4]) ?? 0 },
    errors: r.errors.map(([source, message, count, last]) => ({
      source: source === '$exception' ? 'Crash' : source === 'game_link_failed' ? 'Game link' : 'Analysis',
      message: str(message).replace(/^\["?|"?\]$/g, ''), count: num(count) ?? 0, last: isoKey(last),
    })),
    breakdowns: {
      country: slices(r.country), referrer: slices(r.referrer).map((s) => ({ ...s, label: s.label === '$direct' ? 'Direct' : s.label })),
      device: slices(r.device), browser: slices(r.browser), os: slices(r.os), gameSite: slices(r.gameSite),
    },
    returning: { visitors: num(ret[0]) ?? 0, returning: num(ret[1]) ?? 0 },
    heatmap: r.heatmap.map(([day, hour, value]) => ({ day: num(day) ?? 1, hour: num(hour) ?? 0, value: num(value) ?? 0 })),
  }
}

// Constant-time compare so the password can't be guessed one character at a time.
function same(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || !process.env.POSTHOG_PERSONAL_API_KEY || !process.env.POSTHOG_PROJECT_ID) {
    return json({ error: 'Dashboard is not configured on this server.' }, 503)
  }
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!same(given, expected)) {
    await new Promise((r) => setTimeout(r, 600))
    return json({ error: 'Wrong password.' }, 401)
  }
  const url = new URL(request.url)
  const range = (url.searchParams.get('range') ?? '7d') as Range
  if (!(range in RANGES)) return json({ error: 'Unknown range.' }, 400)

  const hit = cache.get(range)
  if (hit && !url.searchParams.has('fresh') && Date.now() - hit.at < CACHE_MS) return json(hit.data)
  try {
    const data = await collect(range)
    cache.set(range, { at: Date.now(), data })
    return json(data)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
}
