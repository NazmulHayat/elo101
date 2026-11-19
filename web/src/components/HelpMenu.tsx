import { useEffect, useId, useRef } from 'react'
import { LABEL_ORDER, LABELS } from '../labels'
import { LABEL_HELP } from '../lib/help'
import { LabelIcon } from './LabelIcon'

const SHORTCUTS = [['← / →', 'Previous / next move'], ['Home / End', 'First / final position'], ['Space', 'Play / pause'], ['F', 'Flip the board'], ['?', 'Open this help']]

/** One help popover: what each move label means, plus the keyboard shortcuts. `?` toggles it. */
export function HelpMenu() {
  const id = useId()
  const pop = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || target.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      pop.current?.togglePopover()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  return (
    <>
      <button type="button" className="icon-btn" data-testid="help-button" popoverTarget={id} aria-label="Help: move labels and shortcuts" title="Help (?)">
        <svg viewBox="0 0 16 16" width="17" height="17" aria-hidden>
          <path d="M6 6a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.5M8 12h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <div ref={pop} id={id} popover="auto" className="help-pop" role="dialog" aria-label="Help">
        <div className="popover-head"><h2>Move labels</h2><button type="button" className="icon-btn icon-btn-sm" popoverTarget={id} popoverTargetAction="hide" aria-label="Close help">×</button></div>
        <ul className="label-legend">
          {LABEL_ORDER.map((label) => <li key={label}><LabelIcon label={label} size={26} /><div><strong>{LABELS[label].name}</strong><p>{LABEL_HELP[label]}</p></div></li>)}
        </ul>
        <h2 className="help-sub">Keyboard shortcuts</h2>
        <p className="muted help-note">Use these while reviewing a game. Shortcuts pause while you type or use a popup.</p>
        <dl className="shortcut-list">{SHORTCUTS.map(([keys, action]) => <div key={keys}><dt><kbd>{keys}</kbd></dt><dd>{action}</dd></div>)}</dl>
      </div>
    </>
  )
}
