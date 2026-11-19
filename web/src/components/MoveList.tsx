import { useEffect, useRef } from 'react'
import type { ReviewMove } from '../types'
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

  const cell = (m: ReviewMove | undefined) =>
    m ? (
      <button type="button" aria-current={m.ply === current ? 'step' : undefined} aria-label={`${m.move_number}${m.mover === 'white' ? '.' : '...'} ${m.san}`} data-ply={m.ply} className={`move-cell ${m.ply === current ? 'current' : ''}`} onClick={() => onSelect(m.ply)}>
        <LabelIcon label={m.ep_label} size={16} />
        <span>{m.san}</span>
      </button>
    ) : (
      <span />
    )

  return (
    <div className="move-list" data-tour="moves" ref={box}>
      {rows.map(([w, b]) => (
        <div className="move-turn" key={w.ply}>
          <div className="move-row">
            <span className="move-num">{w.move_number}.</span>
            {cell(w)}
            {cell(b)}
          </div>
          {variation && (w.ply === variation.anchorPly || b?.ply === variation.anchorPly) && (
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
