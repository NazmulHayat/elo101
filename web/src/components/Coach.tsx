import type { ReactNode } from 'react'
import type { CoachText } from '../coach'
import { describe, LABELS, PHRASE } from '../labels'
import type { Label } from '../types'
import { LabelIcon } from './LabelIcon'

interface Props {
  text: CoachText
  label?: Label
  evalText?: string | null // chip in the bubble's corner, e.g. "M2", "+1.8"
  ai?: { text?: string; loading?: boolean; error?: string } | null
  children?: ReactNode
}

/** "Bxd1 is a blunder" → move plus the label phrase in the label's colour. */
function Title({ text, label }: { text: string; label?: Label }) {
  const suffix = label ? ` is ${describe(label)}` : ''
  if (label && text.endsWith(suffix) && text.length > suffix.length) {
    return <>{text.slice(0, -suffix.length)} <span style={{ color: LABELS[label].color }}>{PHRASE[label]}</span></>
  }
  return <>{text}</>
}

export function Coach({ text, label, evalText, ai, children }: Props) {
  return (
    <div className="coach" data-testid="coach">
      <span className="coach-icon" aria-hidden={!label}>
        {label ? <LabelIcon label={label} size={44} /> : <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={44} height={44} />}
      </span>
      <div className="bubble" aria-live="polite">
        {evalText && <span className="eval-chip">{evalText}</span>}
        <div className="bubble-title"><Title text={text.title} label={label} /></div>
        {text.body && <div className="bubble-body">{text.body}</div>}
        {text.note && <div className="bubble-note">{text.note}</div>}
        {text.line && <div className="bubble-line">{text.line}</div>}
        {ai && (
          <div className="bubble-ai" aria-live="polite">
            <span className="ai-tag">AI note</span>
            {ai.loading ? 'Thinking…' : ai.error ? <span className="ai-error">{ai.error}</span> : ai.text}
          </div>
        )}
        {children && <div className="coach-actions">{children}</div>}
      </div>
    </div>
  )
}
