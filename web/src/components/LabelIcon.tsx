import type { ReactNode } from 'react'
import { LABELS } from '../labels'
import type { Label } from '../types'

// elo101's squircle badge: the label colour with a white glyph (!!, !, star, thumbs-up, check, book, ?!, ?, ✕, ??).
const SQUIRCLE = 'M10 .8c6.6 0 9.2 2.6 9.2 9.2s-2.6 9.2-9.2 9.2S.8 16.6.8 10 3.4.8 10 .8z'

const Bang = ({ x }: { x: number }) => (
  <><rect x={x - 1.4} y={4.3} width={2.8} height={7.6} rx={1.4} fill="#fff" /><circle cx={x} cy={14.9} r={1.6} fill="#fff" /></>
)

const Query = ({ x }: { x: number }) => (
  <>
    <path d={`M${x - 2.6} 7.4a2.6 2.6 0 1 1 3.9 2.25c-.85.5-1.3 1-1.3 2.05`} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={x} cy={14.9} r={1.6} fill="#fff" />
  </>
)

const GLYPHS: Record<Label, ReactNode> = {
  brilliant: <><Bang x={7.1} /><Bang x={12.9} /></>,
  great: <Bang x={10} />,
  best: <path d="M10 3.7l1.95 4.1 4.45.55-3.3 3.05.85 4.4L10 13.65 6.05 15.8l.85-4.4-3.3-3.05 4.45-.55z" fill="#fff" stroke="#fff" strokeWidth={1} strokeLinejoin="round" />,
  excellent: <><path d="M5.2 9.3h2.3v6.6H5.2z" fill="#fff" /><path d="M8.6 15.9V9.5l2.5-4.3c.5-.85 1.85-.45 1.75.55l-.3 2.75h2.6c.85 0 1.5.8 1.3 1.65l-1 4.35c-.15.8-.85 1.4-1.65 1.4z" fill="#fff" /></>,
  good: <path d="M5.6 10.4l3 3 5.8-6.5" fill="none" stroke="#fff" strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" />,
  book: <><path d="M10 6.5C8.3 5.3 6.4 5 4.3 5.3v8.9c2.1-.3 4 .05 5.7 1.25 1.7-1.2 3.6-1.55 5.7-1.25V5.3c-2.1-.3-4 0-5.7 1.2z" fill="#fff" /><path d="M10 6.6v8.6" stroke="rgba(0,0,0,.22)" strokeWidth={1} /></>,
  inaccuracy: <><Query x={7.3} /><Bang x={13.6} /></>,
  mistake: <Query x={10} />,
  miss: <path d="M6.4 6.4l7.2 7.2M13.6 6.4l-7.2 7.2" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" />,
  blunder: <><Query x={6.9} /><Query x={13.1} /></>,
}

export function LabelIcon({ label, size = 16 }: { label: Label; size?: number }) {
  const m = LABELS[label]
  return (
    <svg className="label-icon" width={size} height={size} viewBox="0 0 20 20" role="img" aria-label={m.name} focusable="false">
      <title>{m.name}</title>
      <path d={SQUIRCLE} fill={m.color} />
      {GLYPHS[label]}
    </svg>
  )
}
