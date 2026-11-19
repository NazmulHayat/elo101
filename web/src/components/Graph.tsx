import { useLayoutEffect, useRef, useState } from 'react'
import { engineScore, pct } from '../format'
import { LABELS } from '../labels'
import type { Label, Mode, ReviewMove, ReviewPosition } from '../types'

interface Props {
  values: number[] // white's share per ply, 0..1 (index 0 = start position)
  positions?: ReviewPosition[] // for the tooltip value
  mode?: Mode
  moves?: ReviewMove[]
  current: number | null
  markers: { ply: number; label: Label }[]
  onSelect?: (ply: number) => void
  height?: number
}

const HEADROOM = 0.06

/** "+1.8", "−0.4", "M2": engine scores with a real minus sign. */
function engineText(p: ReviewPosition): string {
  return engineScore(p).replace(/^-/, '−')
}

function moveName(moves: ReviewMove[], ply: number): string {
  const m = moves[ply - 1]
  return m ? `${m.move_number}${m.mover === 'white' ? '.' : '…'} ${m.san}` : 'Start'
}

export function Graph({ values, positions = [], mode = 'chances', moves = [], current, markers, onSelect, height = 96 }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  // Draw in real pixels so marker dots stay round at any width.
  const [W, setW] = useState(400)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setW(Math.max(1, Math.round(el.getBoundingClientRect().width)))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const H = height
  const n = Math.max(values.length, 2)
  const x = (i: number) => (i / (n - 1)) * W
  const y = (v: number) => H - (HEADROOM + v * (1 - 2 * HEADROOM)) * H
  const clamp = (p: number) => Math.max(0, Math.min(values.length - 1, p))
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const selected = hover ?? current ?? 0
  const move = moves[selected - 1]
  const position = positions[selected]
  const value = position ? (mode === 'engine' ? engineText(position) : pct(position.white_ep)) : pct(values[selected] ?? .5)
  const description = `${move ? `${move.move_number}${move.mover === 'white' ? '.' : '...'} ${move.san} · ${LABELS[move.ep_label].name}` : 'Starting position'} · ${mode === 'engine' ? `Engine ${value}` : `White’s chances ${value}`}`

  function pointerPly(clientX: number) {
    const r = ref.current?.getBoundingClientRect()
    return r ? clamp(Math.round(((clientX - r.left) / r.width) * (n - 1))) : 0
  }

  return (
    <div className="graph-container" ref={box} data-testid="graph" onPointerLeave={() => setHover(null)}>
      {hover !== null && (
        <div className="graph-tooltip" role="tooltip" data-testid="graph-tooltip" style={{ left: `clamp(32px, ${(hover / (n - 1)) * 100}%, calc(100% - 32px))` }}>
          {value}<small>{moveName(moves, hover)}</small>
        </div>
      )}
      <svg
        ref={ref}
        className={`graph ${onSelect ? 'graph-clickable' : ''}`}
        style={{ height: H }}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onPointerMove={(e) => setHover(pointerPly(e.clientX))}
        onClick={(e) => onSelect?.(pointerPly(e.clientX))}
        onFocus={() => setHover(current ?? 0)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (!onSelect) return
          let next: number
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamp(selected + 1)
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamp(selected - 1)
          else if (e.key === 'Home') next = 0
          else if (e.key === 'End') next = values.length - 1
          else return
          e.preventDefault()
          e.stopPropagation()
          setHover(next)
          onSelect(next)
        }}
        tabIndex={onSelect ? 0 : undefined}
        role={onSelect ? 'slider' : 'img'}
        aria-label="Game advantage; use arrow keys to explore moves"
        aria-valuemin={onSelect ? 0 : undefined}
        aria-valuemax={onSelect ? values.length - 1 : undefined}
        aria-valuenow={onSelect ? selected : undefined}
        aria-valuetext={onSelect ? description : undefined}
      >
        <rect width={W} height={H} fill="var(--graph-black)" />
        {values.length > 1 && <path d={`${line} L${W},${H} L0,${H} Z`} fill="var(--graph-white)" />}
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="var(--graph-axis)" strokeWidth={0.6} />
        {markers.map((m) => {
          const my = y(values[m.ply] ?? .5)
          const color = LABELS[m.label].color
          return (
            <g key={m.ply}>
              <line x1={x(m.ply)} x2={x(m.ply)} y1={my} y2={H / 2} stroke={color} strokeWidth={1.4} />
              <circle cx={x(m.ply)} cy={my} r={4} fill={color} />
            </g>
          )
        })}
        {current !== null && <line x1={x(current)} x2={x(current)} y1={0} y2={H} stroke="var(--brand)" strokeWidth={2} />}
        {hover !== null && hover !== current && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--brand)" strokeWidth={1.2} strokeDasharray="3 3" />}
      </svg>
    </div>
  )
}
