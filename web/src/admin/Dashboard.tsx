import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Kpis, Point, Range, Stats } from '../../api/stats'
import { Heatmap, Path, RankList, StackChart, Swatch, TimeChart } from './charts'
import { fmtInt } from './chartUtils'
import { demoStats } from './demo'

const RANGES: { id: Range; label: string; previous: string }[] = [
  { id: '24h', label: '24h', previous: 'previous 24 hours' },
  { id: '7d', label: '7 days', previous: 'previous 7 days' },
  { id: '30d', label: '30 days', previous: 'previous 30 days' },
  { id: '90d', label: '90 days', previous: 'previous 90 days' },
]
const PASS_KEY = 'elo101.admin'
const RANGE_KEY = 'elo101.admin.range'
const POSTHOG = 'https://us.posthog.com/project/750662'
const DEMO = new URLSearchParams(location.search).has('demo')

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* private mode */ } },
}

class AuthError extends Error {}

async function fetchStats(range: Range, password: string, fresh = false): Promise<Stats> {
  if (DEMO) return demoStats(range)
  const res = await fetch(`/api/stats?range=${range}${fresh ? '&fresh=1' : ''}`, { headers: { Authorization: `Bearer ${password}` } })
  const body = await res.json().catch(() => ({ error: `The server answered ${res.status}.` }))
  if (res.status === 401) throw new AuthError(body.error)
  if (!res.ok) throw new Error(body.error ?? `The server answered ${res.status}.`)
  return body as Stats
}

const Logo = ({ size = 28 }: { size?: number }) => <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={size} height={size} />

function Login({ onDone, error }: { onDone: (p: string) => void; error: string | null }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = (e: FormEvent) => { e.preventDefault(); if (value) { setBusy(true); onDone(value) } }
  useEffect(() => { if (error) setBusy(false) }, [error])
  return (
    <main className="login">
      <form onSubmit={submit}>
        <Logo size={40} />
        <h1>elo101 analytics</h1>
        <p>Who visits, what they do and what breaks. Private to you.</p>
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" inputMode="numeric" autoComplete="current-password" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
        {error && <p className="login-err" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy || !value}>{busy ? 'Checking…' : 'Open dashboard'}</button>
      </form>
    </main>
  )
}

/** "+22%" in green or red; "lower is better" metrics flip the colour. */
function Change({ now, before, lowerIsBetter = false }: { now: number | null; before: number | null; lowerIsBetter?: boolean }) {
  if (now === null || before === null) return <span className="change">no earlier data</span>
  if (before === 0) return <span className="change">{now === 0 ? 'no change' : 'new this period'}</span>
  const pct = ((now - before) / before) * 100
  if (Math.abs(pct) < 0.5) return <span className="change">no change</span>
  const good = lowerIsBetter ? pct < 0 : pct > 0
  return <span className={`change ${good ? 'is-good' : 'is-bad'}`}>{pct > 0 ? '+' : '−'}{Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%</span>
}

type MetricId = 'visitors' | 'pageviews' | 'games' | 'finish' | 'speed' | 'failures'

const finishRate = (k: Kpis) => (k.started ? (k.finished / k.started) * 100 : null)
const pointRate = (p: Point) => (p.started ? Math.min(100, (p.analyses / p.started) * 100) : null)

interface Metric {
  id: MetricId; label: string; value: (k: Kpis) => number | null; show: (v: number) => ReactNode; lowerIsBetter?: boolean
  title: (per: string) => string
}

const METRICS: Metric[] = [
  { id: 'visitors', label: 'Visitors', value: (k) => k.visitors, show: (v) => fmtInt(v), title: (per) => `Unique visitors per ${per}` },
  { id: 'pageviews', label: 'Page views', value: (k) => k.pageviews, show: (v) => fmtInt(v), title: (per) => `Page views per ${per}` },
  { id: 'games', label: 'Games analyzed', value: (k) => k.finished, show: (v) => fmtInt(v), title: (per) => `Games analyzed per ${per}` },
  { id: 'finish', label: 'Finish rate', value: finishRate, show: (v) => <>{v.toFixed(0)}<small>%</small></>, title: () => 'Share of started analyses that finished' },
  { id: 'speed', label: 'Typical analysis', value: (k) => k.medianSeconds, show: (v) => <>{v.toFixed(1)}<small>s</small></>, lowerIsBetter: true, title: () => 'Seconds to analyze a game' },
  { id: 'failures', label: 'Failures', value: (k) => k.failures, show: (v) => fmtInt(v), lowerIsBetter: true, title: (per) => `Failures per ${per}` },
]

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

function Overview({ s, range }: { s: Stats; range: Range }) {
  const [metric, setMetric] = useState<MetricId>('visitors')
  const { current: c, previous: p } = s.kpis
  const times = s.series.map((x) => x.t)
  const prevTimes = s.previousSeries.map((x) => x.t)
  const prevLabel = RANGES.find((r) => r.id === range)!.previous
  const m = METRICS.find((x) => x.id === metric)!
  const compareLegend = <><span><Swatch tone="main" />This period</span><span><Swatch tone="compare" />{cap(prevLabel)}</span></>
  let chart: ReactNode
  let legend: ReactNode = compareLegend
  if (metric === 'games') {
    chart = <StackChart times={times} bucket={s.bucket} height={260} ok={s.series.map((x) => x.analyses)} bad={s.series.map((x) => x.failures)} empty="No games analyzed in this range." />
    legend = <><span><Swatch tone="bar" />Finished</span><span><Swatch tone="bad" />Failed</span></>
  } else if (metric === 'speed') {
    chart = <TimeChart times={times} bucket={s.bucket} height={260} fmt={(v) => `${+v.toFixed(1)}s`} empty="No games analyzed in this range." lines={[
      { key: 'p50', label: 'Typical (median)', values: s.series.map((x) => x.p50), tone: 'ink' },
      { key: 'p90', label: 'Slowest 10%', values: s.series.map((x) => x.p90), tone: 'muted-dash' },
    ]} />
    legend = <><span><Swatch tone="ink" />Typical (median)</span><span><Swatch tone="muted-dash" />Slowest 10%</span></>
  } else if (metric === 'finish') {
    chart = <TimeChart times={times} bucket={s.bucket} height={260} fmt={(v) => `${Math.round(v)}%`} empty="No analyses started in this range." compareTimes={prevTimes} lines={[
      { key: 'now', label: 'Finish rate', values: s.series.map(pointRate), tone: 'main' },
      { key: 'before', label: 'Previous', values: s.previousSeries.map(pointRate), tone: 'compare' },
    ]} />
  } else {
    const key = metric
    chart = <TimeChart times={times} bucket={s.bucket} height={260} compareTimes={prevTimes}
      empty={metric === 'failures' ? 'Nothing failed in this range.' : 'No visits in this range yet.'} lines={[
        { key: 'now', label: m.label, values: s.series.map((x) => x[key]), tone: 'main' },
        { key: 'before', label: 'Previous', values: s.previousSeries.map((x) => x[key]), tone: 'compare' },
      ]} />
  }
  const ret = s.returning
  return (
    <section className="panel overview" aria-label="Overview">
      <div className="ledger" role="tablist" aria-label="Metric shown in the chart">
        {METRICS.map((x) => {
          const v = x.value(c)
          return (
            <button key={x.id} role="tab" aria-selected={metric === x.id} className="ledger-cell" onClick={() => setMetric(x.id)}>
              <span className="ledger-label">{x.label}</span>
              <span className="ledger-value">{v === null ? '–' : x.show(v)}</span>
              <Change now={v} before={x.value(p)} lowerIsBetter={x.lowerIsBetter} />
            </button>
          )
        })}
      </div>
      <div className="overview-chart">
        <div className="panel-head">
          <h2>{m.title(s.bucket)}</h2>
          <div className="legend">{legend}</div>
        </div>
        {chart}
      </div>
      <p className="overview-foot">
        <span><b>{ret.visitors ? Math.round((ret.returning / ret.visitors) * 100) : 0}%</b> of visitors came back on another day</span>
        <span className="sep" aria-hidden>·</span><span><b>{fmtInt(c.sessions)}</b> sessions</span>
        <span className="sep" aria-hidden>·</span><span><b>{c.visitors ? (c.pageviews / c.visitors).toFixed(1) : '0'}</b> pages per visitor</span>
      </p>
    </section>
  )
}

function Panel({ title, note, action, className = '', children }: { title: string; note?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head"><h2>{title}</h2>{note && <p>{note}</p>}{action}</div>
      {children}
    </section>
  )
}

const SOURCES = [
  { id: 'referrer', label: 'Sites' }, { id: 'gameSite', label: 'Game links' }, { id: 'country', label: 'Countries' },
  { id: 'device', label: 'Devices' }, { id: 'browser', label: 'Browsers' }, { id: 'os', label: 'Systems' },
] as const

function Sources({ b }: { b: Stats['breakdowns'] }) {
  const [tab, setTab] = useState<(typeof SOURCES)[number]['id']>('referrer')
  const countriesHidden = tab === 'country' && b.country.length > 0 && b.country.every((c) => c.label === 'Unknown')
  return (
    <Panel title="Where they come from" className="span-6">
      <div className="seg seg-wide" role="tablist" aria-label="Breakdown">
        {SOURCES.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {countriesHidden
        ? <p className="quiet">Countries are hidden because PostHog is set to discard visitor IP addresses.</p>
        : <RankList items={b[tab]} empty={tab === 'gameSite' ? 'No one has opened a game link yet.' : 'No visits in this range yet.'} />}
    </Panel>
  )
}

const ICON = {
  good: <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.5 6.3 5 8.6l4.5-5.2" /></svg>,
  warn: <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 2.5v4.2M6 9.3v.01" /></svg>,
  bad: <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m3.2 3.2 5.6 5.6M8.8 3.2 3.2 8.8" /></svg>,
}

// Google's Core Web Vitals thresholds at the 75th percentile.
const VITALS = [
  { key: 'lcp', name: 'Largest paint', what: 'Main content visible', good: 2500, poor: 4000, fmt: (v: number) => `${(v / 1000).toFixed(2)} s` },
  { key: 'inp', name: 'Interaction', what: 'Reacts to a click or key', good: 200, poor: 500, fmt: (v: number) => `${Math.round(v)} ms` },
  { key: 'cls', name: 'Layout shift', what: 'Page stays still while loading', good: 0.1, poor: 0.25, fmt: (v: number) => v.toFixed(3) },
  { key: 'fcp', name: 'First paint', what: 'Anything visible', good: 1800, poor: 3000, fmt: (v: number) => `${(v / 1000).toFixed(2)} s` },
] as const

function Speed({ v }: { v: Stats['vitals'] }) {
  return (
    <Panel title="Page speed" note={v.samples ? `75th percentile of ${fmtInt(v.samples)} real page loads` : 'Measured on real page loads'} className="span-5">
      <ul className="vitals">
        {VITALS.map((m) => {
          const val = v[m.key]
          const grade = val === null ? null : val <= m.good ? 'good' : val <= m.poor ? 'warn' : 'bad'
          return (
            <li key={m.key}>
              <span className="vital-name">{m.name}<small>{m.what}</small></span>
              <span className="vital-val">{val === null ? '–' : m.fmt(val)}</span>
              <span className={`grade ${grade ?? ''}`} title={`Good at or under ${m.fmt(m.good)}, poor over ${m.fmt(m.poor)}`}>
                {grade ? <>{ICON[grade]}{{ good: 'Good', warn: 'Needs work', bad: 'Poor' }[grade]}</> : 'No data'}
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

function Errors({ errors }: { errors: Stats['errors'] }) {
  return (
    <Panel title="What broke" className="span-7" action={<a className="text-link" href={`${POSTHOG}/error_tracking`} target="_blank" rel="noreferrer">Error tracking in PostHog</a>}>
      {errors.length === 0
        ? <p className="quiet ok">{ICON.good}Nothing failed in this range.</p>
        : (
          <table className="errors">
            <thead><tr><th>Where</th><th>Message</th><th className="n">Times</th><th className="n">Last</th></tr></thead>
            <tbody>{errors.map((e) => (
              <tr key={e.source + e.message}><td className="where">{e.source}</td><td className="msg">{e.message}</td><td className="n">{e.count}</td><td className="n last">{ago(e.last)}</td></tr>
            ))}</tbody>
          </table>
        )}
    </Panel>
  )
}

const HINTS = ['Opened the site', 'Pasted or linked a game', 'Saw the summary', 'Stepped through the moves', 'Retried or asked why']

function Body({ s, range }: { s: Stats; range: Range }) {
  return (
    <div className="stack">
      <Overview s={s} range={range} />
      <div className="row">
        <Panel title="How people move through elo101" note="Visitors who reached each step" className="span-7">
          <Path steps={s.funnel.map((f, i) => ({ ...f, hint: HINTS[i] }))} />
        </Panel>
        <Panel title="What they use" note="Times used" className="span-5">
          <RankList items={[...s.features].sort((a, b) => b.value - a.value)} empty="No one has used a feature yet." />
        </Panel>
      </div>
      <div className="row">
        <Sources b={s.breakdowns} />
        <Panel title="When they visit" note="Visitors by weekday and hour" className="span-6">
          <Heatmap cells={s.heatmap} />
        </Panel>
      </div>
      <div className="row">
        <Speed v={s.vitals} />
        <Errors errors={s.errors} />
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="stack" aria-busy aria-label="Loading">
      <div className="panel"><div className="skeleton" style={{ height: 96 }} /><div className="skeleton" style={{ height: 260, marginTop: 16 }} /></div>
      <div className="row"><div className="panel span-7"><div className="skeleton" style={{ height: 220 }} /></div><div className="panel span-5"><div className="skeleton" style={{ height: 220 }} /></div></div>
    </div>
  )
}

const RefreshIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M13.2 8.6A5.3 5.3 0 1 1 11.6 4" /><path d="M12 1.8v2.6H9.4" />
  </svg>
)

export function Dashboard() {
  const [password, setPassword] = useState<string | null>(DEMO ? 'demo' : store.get(PASS_KEY))
  const [range, setRange] = useState<Range>(() => (RANGES.some((r) => r.id === store.get(RANGE_KEY)) ? store.get(RANGE_KEY) as Range : '7d'))
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [, tick] = useState(0)

  const load = useCallback(async (pw: string, r: Range, fresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const s = await fetchStats(r, pw, fresh)
      setStats(s)
      if (!DEMO) store.set(PASS_KEY, pw)
      setAuthError(null)
    } catch (e) {
      if (e instanceof AuthError) { store.set(PASS_KEY, null); setPassword(null); setAuthError(e.message) }
      else setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (password) load(password, range) }, [password, range, load])
  // Re-fetch every 5 minutes while visible; keep "updated … ago" honest.
  useEffect(() => {
    if (!password) return
    const a = setInterval(() => { if (document.visibilityState === 'visible') load(password, range) }, 5 * 60_000)
    const b = setInterval(() => tick((n) => n + 1), 30_000)
    return () => { clearInterval(a); clearInterval(b) }
  }, [password, range, load])

  if (!password) return <Login error={authError} onDone={(pw) => { setAuthError(null); setPassword(pw) }} />

  const pick = (r: Range) => { setRange(r); store.set(RANGE_KEY, r) }
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/"><Logo />elo101</a>
        <span className="crumb">Analytics</span>
        <div className="topbar-actions">
          {stats && <span className="here" title="Visitors active in the last 5 minutes"><b>{stats.live}</b> {stats.live === 1 ? 'person' : 'people'} here now</span>}
          <div className="seg" role="group" aria-label="Time range">
            {RANGES.map((r) => <button key={r.id} aria-pressed={range === r.id} onClick={() => pick(r.id)}>{r.label}</button>)}
          </div>
          <button className={`icon-btn ${loading ? 'is-spinning' : ''}`} onClick={() => load(password, range, true)} disabled={loading}
            aria-label="Refresh" title={stats ? `Updated ${ago(stats.generatedAt)}. Refresh` : 'Refresh'}><RefreshIcon /></button>
        </div>
      </header>
      <main className="dash">
        {DEMO && <p className="note">Sample numbers for checking the layout. Remove <code>?demo</code> from the address to see real data.</p>}
        {error && <p className="note is-error" role="alert">Couldn’t load the numbers: {error} Try Refresh in a minute.</p>}
        {stats ? <Body s={stats} range={range} /> : <Loading />}
        <footer className="foot">
          <span>{stats ? `Updated ${ago(stats.generatedAt)}` : ''}</span>
          <a href={`${POSTHOG}/replay/home`} target="_blank" rel="noreferrer">Session replays</a>
          <a href={POSTHOG} target="_blank" rel="noreferrer">PostHog</a>
          {!DEMO && <button className="text-link" onClick={() => { store.set(PASS_KEY, null); setPassword(null); setStats(null) }}>Sign out</button>}
        </footer>
      </main>
    </>
  )
}
