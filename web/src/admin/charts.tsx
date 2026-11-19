import { useRef, useState, type ReactNode } from 'react'
import { fmtInt, fmtTime, useWidth } from './chartUtils'

// Charts borrow the review graph's language: neutral fill, hairline grid, blue cursor, black value pill.

function niceTicks(max: number, count = 3): number[] {
  if (max <= 0) return [0, 1, 2, 3].slice(0, count + 1)
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  return Array.from({ length: count + 1 }, (_, i) => +(i * step).toFixed(6))
}

export interface Line { key: string; label: string; values: (number | null)[]; tone: 'main' | 'compare' | 'ink' | 'muted-dash' }

const PAD = { top: 12, right: 4, bottom: 26, left: 40 }

// side: 'above' centres the pill over a point; 'left'/'right' hangs it beside a chart cursor, inside the plot.
function Pill({ x, y, title, rows, side = 'above' }: { x: number; y: number; title: string; rows: { label: string; value: string; swatch?: ReactNode }[]; side?: 'above' | 'left' | 'right' }) {
  return (
    <div className={`pill pill-${side}`} style={{ left: x, top: y }}>
      <div className="pill-title">{title}</div>
      {rows.map((r) => <div className="pill-row" key={r.label}>{r.swatch}<span>{r.label}</span><b>{r.value}</b></div>)}
    </div>
  )
}

const STROKE: Record<Line['tone'], { stroke: string; dash?: string; width: number }> = {
  main: { stroke: 'var(--chart-ink)', width: 2 },
  compare: { stroke: 'var(--chart-faint)', dash: '4 4', width: 1.5 },
  ink: { stroke: 'var(--chart-ink)', width: 2 },
  'muted-dash': { stroke: 'var(--chart-mid)', dash: '5 4', width: 1.5 },
}

export function Swatch({ tone }: { tone: Line['tone'] | 'bar' | 'bad' }) {
  if (tone === 'bar') return <svg className="sw" width="10" height="10" aria-hidden><rect width="10" height="10" rx="2.5" fill="var(--chart-bar)" /></svg>
  if (tone === 'bad') return <svg className="sw" width="10" height="10" aria-hidden><rect width="10" height="10" rx="2.5" fill="var(--bad)" /></svg>
  const s = STROKE[tone]
  return <svg className="sw" width="16" height="6" aria-hidden><line x1="1" x2="15" y1="3" y2="3" stroke={s.stroke} strokeWidth={2} strokeDasharray={s.dash} strokeLinecap="round" /></svg>
}

function Axes({ ticks, y, w, h, fmt, labels }: { ticks: number[]; y: (v: number) => number; w: number; h: number; fmt: (v: number) => string; labels: { x: number; text: string }[] }) {
  return (
    <>
      {ticks.map((t) => (
        <g key={t}>
          <line className={t === 0 ? 'axis-line' : 'grid-line'} x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} />
          <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
        </g>
      ))}
      {labels.map((l, i) => <text key={i} x={l.x} y={h - 7} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>{l.text}</text>)}
    </>
  )
}

function xLabels(times: string[], bucket: 'hour' | 'day', x: (i: number) => number, w: number) {
  const n = times.length
  const fit = Math.max(2, Math.floor(w / 80))
  if (n <= fit) return times.map((t, i) => ({ x: x(i), text: fmtTime(t, bucket) }))
  const want = Math.min(6, fit)
  const idx = Array.from({ length: want }, (_, k) => Math.round((k / (want - 1)) * (n - 1)))
  return [...new Set(idx)].map((i) => ({ x: x(i), text: fmtTime(times[i], bucket) }))
}

/** Lines over time with a hover cursor. All lines share one axis and one unit. */
export function TimeChart({ times, bucket, lines, height = 240, fmt = fmtInt, empty, compareTimes }: {
  times: string[]; bucket: 'hour' | 'day'; lines: Line[]; height?: number; fmt?: (v: number) => string; empty?: string; compareTimes?: string[]
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(0, ...lines.flatMap((s) => s.values.map((v) => v ?? 0)))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const n = times.length
  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * (w - PAD.left - PAD.right))
  const y = (v: number) => PAD.top + (1 - v / top) * (height - PAD.top - PAD.bottom)
  const path = (vals: (number | null)[]) => {
    let d = ''
    let pen = false
    vals.forEach((v, i) => {
      if (v === null) { pen = false; return }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
      pen = true
    })
    return d
  }
  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - PAD.left) / (w - PAD.left - PAD.right)) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  const main = lines.find((l) => l.tone === 'main')
  const back = lines.filter((l) => l.tone === 'compare' || l.tone === 'muted-dash')
  const front = lines.filter((l) => l.tone === 'main' || l.tone === 'ink')
  return (
    <div className="chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img"
          aria-label={`${front.map((s) => s.label).join(' and ')} over time`}>
          <defs>
            <linearGradient id="main-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--chart-ink)" stopOpacity="0.14" />
              <stop offset="1" stopColor="var(--chart-ink)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <Axes ticks={ticks} y={y} w={w} h={height} fmt={fmt} labels={xLabels(times, bucket, x, w)} />
          {main && <path d={`${path(main.values)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill="url(#main-fill)" />}
          {[...back, ...front].map((s) => {
            const st = STROKE[s.tone]
            return <path key={s.key} d={path(s.values)} fill="none" stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} strokeLinejoin="round" strokeLinecap="round" />
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--brand)" strokeWidth={2} />
              {front.map((s) => s.values[hover] !== null && (
                <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] as number)} r={4} fill="var(--panel)" stroke="var(--brand)" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}
      {max === 0 && empty && <div className="empty-note">{empty}</div>}
      {hover !== null && w > 0 && (
        <Pill x={x(hover)} y={PAD.top} side={x(hover) > w / 2 ? 'left' : 'right'}
          title={fmtTime(times[hover], bucket, true)}
          rows={lines.map((s) => ({
            swatch: <Swatch tone={s.tone} />,
            label: s.tone === 'compare' && compareTimes ? `${s.label}, ${fmtTime(compareTimes[hover], bucket)}` : s.label,
            value: s.values[hover] === null ? '–' : fmt(s.values[hover] as number),
          }))} />
      )}
    </div>
  )
}

/** Columns over time: finished in the neutral bar tone, failures stacked on top in red. */
export function StackChart({ times, bucket, ok, bad, height = 200, empty }: {
  times: string[]; bucket: 'hour' | 'day'; ok: number[]; bad: number[]; height?: number; empty?: string
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const n = times.length
  const max = Math.max(0, ...times.map((_, i) => ok[i] + bad[i]))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const slot = (w - PAD.left - PAD.right) / Math.max(n, 1)
  const bw = Math.max(2, Math.min(22, slot * 0.58))
  const cx = (i: number) => PAD.left + slot * (i + 0.5)
  const y = (v: number) => PAD.top + (1 - v / top) * (height - PAD.top - PAD.bottom)
  const col = (x0: number, yTop: number, h: number, round: boolean) => {
    const r = round ? Math.min(3, bw / 2, h) : 0
    return `M${x0},${yTop + h}V${yTop + r}Q${x0},${yTop} ${x0 + r},${yTop}H${x0 + bw - r}Q${x0 + bw},${yTop} ${x0 + bw},${yTop + r}V${yTop + h}Z`
  }
  return (
    <div className="chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={`Games finished and failed per ${bucket}`} onPointerLeave={() => setHover(null)}>
          <Axes ticks={ticks} y={y} w={w} h={height} fmt={fmtInt} labels={xLabels(times, bucket, cx, w)} />
          {times.map((t, i) => {
            const x0 = cx(i) - bw / 2
            const okH = y(0) - y(ok[i])
            const badH = Math.max(1, y(0) - y(bad[i]) - (ok[i] > 0 ? 2 : 0))
            return (
              <g key={t} onPointerEnter={() => setHover(i)}>
                <rect x={cx(i) - slot / 2} y={PAD.top} width={slot} height={height - PAD.top - PAD.bottom} fill={hover === i ? 'var(--hover-col)' : 'transparent'} />
                {ok[i] > 0 && <path d={col(x0, y(ok[i]), okH, bad[i] === 0)} fill="var(--chart-bar)" />}
                {bad[i] > 0 && <path d={col(x0, y(ok[i] + bad[i]), badH, true)} fill="var(--bad)" />}
              </g>
            )
          })}
        </svg>
      )}
      {max === 0 && empty && <div className="empty-note">{empty}</div>}
      {hover !== null && w > 0 && (
        <Pill x={cx(hover) + (cx(hover) > w / 2 ? -slot / 2 : slot / 2)} y={PAD.top} side={cx(hover) > w / 2 ? 'left' : 'right'} title={fmtTime(times[hover], bucket, true)}
          rows={[{ swatch: <Swatch tone="bar" />, label: 'Finished', value: fmtInt(ok[hover]) }, { swatch: <Swatch tone="bad" />, label: 'Failed', value: fmtInt(bad[hover]) }]} />
      )}
    </div>
  )
}

/** Ranked rows on the move-list zebra: name, a thin share bar, count, share. */
export function RankList({ items, empty = 'Nothing recorded in this range.' }: { items: { label: string; value: number }[]; empty?: string }) {
  const sum = items.reduce((s, i) => s + i.value, 0)
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!sum) return <p className="quiet">{empty}</p>
  return (
    <ol className="rank">
      {items.map((i) => (
        <li key={i.label}>
          <span className="rank-name" title={i.label}>{i.label}</span>
          <span className="rank-bar" aria-hidden><span style={{ width: `${(i.value / max) * 100}%` }} /></span>
          <span className="rank-val">{fmtInt(i.value)}</span>
          <span className="rank-pct">{Math.round((i.value / sum) * 100)}%</span>
        </li>
      ))}
    </ol>
  )
}

/** The path through the app, one row per step, with what each step kept from the one before. */
export function Path({ steps }: { steps: { label: string; hint: string; value: number }[] }) {
  const first = steps[0]?.value ?? 0
  return (
    <ol className="path">
      {steps.map((s, i) => {
        const prev = i === 0 ? s.value : steps[i - 1].value
        const kept = prev ? s.value / prev : 0
        return (
          <li key={s.label}>
            <span className="path-no">{i + 1}</span>
            <span className="path-name">{s.label}<small>{s.hint}</small></span>
            <span className="path-bar" aria-hidden><span style={{ width: `${first ? (s.value / first) * 100 : 0}%` }} /></span>
            <span className="path-val">{fmtInt(s.value)}</span>
            <span className={`path-kept ${i > 0 && prev && kept < 0.5 ? 'leak' : ''}`}>
              {i === 0 ? '' : prev ? `${Math.round(kept * 100)}% kept` : '–'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STEPS = [0, 1, 2, 3, 4]

export function Heatmap({ cells }: { cells: { day: number; hour: number; value: number }[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string; v: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const map = new Map(cells.map((c) => [`${c.day}-${c.hour}`, c.value]))
  const max = Math.max(1, ...cells.map((c) => c.value))
  // Five sequential steps of the brand hue; empty hours stay on the well.
  const step = (v: number) => (v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)))
  const rows: ReactNode[] = []
  DAYS.forEach((d, di) => {
    rows.push(<span className="heat-day" key={d}>{d}</span>)
    for (let h = 0; h < 24; h++) {
      const v = map.get(`${di + 1}-${h}`) ?? 0
      rows.push(<span key={`${d}${h}`} className={`heat-cell h${step(v)}`}
        onPointerEnter={(e) => {
          const r = ref.current!.getBoundingClientRect()
          const c = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setTip({ x: c.left - r.left + c.width / 2, y: c.top - r.top - 52, text: `${d} ${String(h).padStart(2, '0')}:00`, v })
        }} />)
    }
  })
  return (
    <div className="chart" ref={ref} onPointerLeave={() => setTip(null)}>
      <div className="heat" role="img" aria-label="Visitors by weekday and hour, UTC">
        {rows}
        <span />
        {Array.from({ length: 24 }, (_, h) => <span className="heat-hr" key={h}>{h % 6 === 0 ? String(h).padStart(2, '0') : ''}</span>)}
      </div>
      <div className="heat-key"><span>Quiet</span>{STEPS.map((s) => <i key={s} className={`heat-cell h${s}`} />)}<span>Busy</span><span className="heat-tz">Hours in UTC</span></div>
      {tip && <Pill x={tip.x} y={tip.y} title={tip.text} rows={[{ label: 'Visitors', value: String(tip.v) }]} />}
    </div>
  )
}
