import { LABELS } from '../labels'
import type { Label } from '../types'
import type { ReactNode } from 'react'

function Symbol({ label }: { label: Label }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const shapes: Record<Label, ReactNode> = {
    brilliant: <><path d="M7 3h10l4 6-9 12L3 9l4-6Z" /><path d="M3 9h18M8 3l4 18 4-18" /></>,
    great: <><path d="m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2Z" /><path d="M19 19h2m-1-1v2" /></>,
    best: <path d="m12 2.5 2.9 6 6.6 1-4.8 4.7 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6-4.8-4.7 6.6-1L12 2.5Z" />,
    excellent: <><path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Z" /><path d="M7 10 12 3a2 2 0 0 1 3.5 1.7L14 10h5a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2H7" /></>,
    good: <path d="m4 12 5 5L20 6" />,
    book: <><path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1Z" /><path d="M12 6v14" /></>,
    inaccuracy: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
    mistake: <><path d="M4 5h7l-3 5 5 3-3 6h10" /><path d="m16 16 4 3-4 3" /></>,
    miss: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="m4 20 16-16" /></>,
    blunder: <><path d="M7 2h10l5 5v10l-5 5H7l-5-5V7l5-5Z" /><path d="m8 8 8 8m0-8-8 8" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>{shapes[label]}</svg>
}

export function LabelIcon({ label, size = 16 }: { label: Label; size?: number }) {
  const m = LABELS[label]
  return (
    <span className="label-icon" style={{ background: m.color, width: size, height: size }} title={m.name} aria-label={m.name} role="img">
      <Symbol label={label} />
    </span>
  )
}
