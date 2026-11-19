import { Chess } from 'chess.js'

export type EndTone = 'win' | 'lose' | 'draw'
export interface EndBadge { square: string; text: string; tone: EndTone }

function kingSquare(board: Chess, color: 'w' | 'b'): string | null {
  for (const row of board.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square
  return null
}

/** How the game ended, from the PGN headers and the final position: "Winner" on one king, the reason on the other. */
export function endBadges(headers: Record<string, string | undefined>, finalFen: string): EndBadge[] {
  const result = headers.Result
  if (!result || result === '*') return []
  let board: Chess
  try { board = new Chess(finalFen) } catch { return [] }
  const w = kingSquare(board, 'w')
  const b = kingSquare(board, 'b')
  if (!w || !b) return []
  const term = (headers.Termination ?? '').toLowerCase()

  if (result === '1/2-1/2') {
    const text = board.isStalemate() || term.includes('stalemate') ? 'Stalemate'
      : term.includes('repetition') ? 'Repetition'
      : term.includes('insufficient') ? 'No material'
      : term.includes('50') ? '50 moves'
      : 'Draw'
    return [{ square: w, text, tone: 'draw' }, { square: b, text, tone: 'draw' }]
  }

  const whiteWon = result === '1-0'
  const reason = board.isCheckmate() || term.includes('checkmate') ? 'Checkmated'
    : term.includes('time') ? 'Timeout'
    : term.includes('resign') ? 'Resigned'
    : term.includes('abandon') ? 'Abandoned'
    : 'Lost'
  return [
    { square: whiteWon ? w : b, text: 'Winner', tone: 'win' },
    { square: whiteWon ? b : w, text: reason, tone: 'lose' },
  ]
}
