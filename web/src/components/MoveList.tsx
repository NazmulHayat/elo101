import { useEffect, useRef } from 'react'
import { LABELS, LIST_ICON_LABELS } from '../labels'
import type { ReviewMove, Side } from '../types'
import { LabelIcon } from './LabelIcon'

interface Props {
  moves: ReviewMove[]
  current: number // ply shown on the board (0 = start)
  onSelect: (ply: number) => void
  variation?: {
    anchorPly: number
    firstPly: number
    cursor: number
    moves: { san: string; uci: string }[]
    onSelect: (cursor: number) => void
  } | null
}

// Chess.com-style figurines: filled for White's moves, outlined for Black's.
const FIGURINES: Record<Side, Record<string, string>> = {
  white: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' },
  black: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' },
}

export function MoveList({ moves, current, onSelect, variation }: Props) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('.branch-move.current, .move-cell.current')
    const list = box.current
    if (el && list) {
      const cellRect = el.getBoundingClientRect()
      const listRect = list.getBoundingClientRect()
      if (cellRect.top < listRect.top) list.scrollTop -= listRect.top - cellRect.top
      else if (cellRect.bottom > listRect.bottom) list.scrollTop += cellRect.bottom - listRect.bottom
    }
  }, [current, variation?.cursor, variation?.anchorPly])

  const rows: [ReviewMove, ReviewMove | undefined][] = []
  for (let i = 0; i < moves.length; i += 2) {
    // Games that start with black to move are rare in review; pair in order.
    rows.push([moves[i], moves[i + 1]])
  }

  const cell = (m: ReviewMove | undefined) => {
    if (!m) return <span />
    const icon = LIST_ICON_LABELS.includes(m.ep_label)
    const piece = /^([KQRBN])(.*)$/.exec(m.san)
    return (
      <button
        type="button"
        aria-current={m.ply === current ? 'step' : undefined}
        aria-label={`${m.move_number}${m.mover === 'white' ? '.' : '...'} ${m.san}, ${LABELS[m.ep_label].name.toLowerCase()}`}
        data-ply={m.ply}
        data-testid="move-cell"
        className={`move-cell ${m.ply === current ? 'current' : ''} ${icon ? '' : 'no-icon'}`}
        style={icon ? { color: LABELS[m.ep_label].color } : undefined}
        onClick={() => onSelect(m.ply)}
      >
        {icon && <LabelIcon label={m.ep_label} size={20} />}
        <span aria-hidden="true">{piece ? <><span className="fig">{FIGURINES[m.mover][piece[1]]}</span>{piece[2]}</> : m.san}</span>
      </button>
    )
  }

  return (
    <div className="move-list" data-tour="moves" data-testid="move-list" ref={box}>
      {rows.map(([w, b]) => (
        <div className="move-turn" key={w.ply}>
          <div className="move-row">
            <span className="move-num">{w.move_number}.</span>
            {cell(w)}
            {cell(b)}
          </div>
          {variation && (w.ply === variation.anchorPly || b?.ply === variation.anchorPly || (variation.anchorPly === 0 && w.ply === 1)) && (
            <div className="branch-row" aria-label="Explored line">
              <span className="branch-rule" aria-hidden="true" />
              <span className="branch-label">Your line</span>
              <button type="button" className={`branch-move ${variation.cursor === 0 ? 'current' : ''}`} onClick={() => variation.onSelect(0)} aria-current={variation.cursor === 0 ? 'step' : undefined}>Start</button>
              {variation.moves.map((move, index) => {
                const ply = variation.firstPly + index
                const isWhite = ply % 2 === 1
                const number = Math.ceil(ply / 2)
                return <button type="button" key={`${index}-${move.uci}`} className={`branch-move ${variation.cursor === index + 1 ? 'current' : ''}`} aria-current={variation.cursor === index + 1 ? 'step' : undefined} onClick={() => variation.onSelect(index + 1)}>{number}{isWhite ? '.' : '…'} {move.san}</button>
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
