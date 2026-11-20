// One always-on Stockfish worker for exploring lines on the board. Unlike the review pool (a fixed-depth,
// cleared-hash search per position, so results are reproducible), this streams the eval as it deepens and
// drops the previous search the moment the position changes, so the eval bar keeps up with fast moves.

import { Chess } from 'chess.js'
import { parseInfo } from './uci'

export interface LiveEval { fen: string; cp: number | null; mate: number | null; depth: number; best?: string }

const LIVE_DEPTH = 20
const MIN_SHOWN_DEPTH = 6 // shallower scores swing too much to be worth showing

export interface LiveEngine {
  /** Start analysing `fen` (stopping whatever ran before); `onEval` gets each deeper result. */
  analyse(fen: string, onEval: (e: LiveEval) => void): void
  stop(): void
}

export function createLiveEngine(url: string): LiveEngine {
  const worker = new Worker(url)
  const best = new Map<string, LiveEval>() // deepest result per position, so stepping back is instant
  let fen: string | null = null
  let board: Chess | null = null
  let listener: ((e: LiveEval) => void) | null = null
  let ready = false
  let queued: string | null = null

  const emit = (e: LiveEval) => {
    const prev = best.get(e.fen)
    if (prev && prev.depth >= e.depth) return // one update per depth keeps re-renders (and drag jank) down
    best.set(e.fen, e)
    if (e.fen === fen) listener?.(e)
  }

  const start = (f: string) => {
    worker.postMessage('stop')
    worker.postMessage(`position fen ${f}`)
    worker.postMessage(`go depth ${LIVE_DEPTH}`)
  }

  worker.onmessage = (msg: MessageEvent) => {
    const data = typeof msg.data === 'string' ? msg.data : String(msg.data)
    for (const line of data.split('\n')) {
      if (line === 'readyok' && !ready) {
        ready = true
        if (queued) start(queued)
        queued = null
        continue
      }
      const info = parseInfo(line)
      if (!info || info.multipv !== 1 || info.kind === undefined || info.value === undefined || info.depth === undefined) continue
      if (!fen || !board || info.depth < MIN_SHOWN_DEPTH || !info.pv?.length) continue
      // Lines from the search we just stopped can still arrive: keep only ones whose first move is legal here.
      const uci = info.pv[0]
      try { board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); board.undo() } catch { continue }
      const sign = fen.split(' ')[1] === 'b' ? -1 : 1
      emit({
        fen,
        cp: info.kind === 'cp' ? sign * info.value : null,
        mate: info.kind === 'mate' ? sign * info.value : null,
        depth: info.depth,
        best: uci,
      })
    }
  }
  worker.postMessage('uci')
  worker.postMessage('setoption name Hash value 32')
  worker.postMessage('isready')

  return {
    analyse(next, onEval) {
      listener = onEval
      if (next === fen) return
      fen = next
      board = new Chess(next)
      const known = best.get(next)
      if (known) onEval(known)
      if (board.isGameOver()) {
        worker.postMessage('stop')
        const mated = board.isCheckmate()
        const sign = next.split(' ')[1] === 'b' ? 1 : -1 // side to move is mated
        onEval({ fen: next, cp: mated ? null : 0, mate: mated ? sign * 0 : null, depth: 99 })
        return
      }
      if (known && known.depth >= LIVE_DEPTH) { worker.postMessage('stop'); return }
      if (ready) start(next)
      else queued = next
    },
    stop() {
      listener = null
      fen = null
      board = null
      worker.postMessage('stop')
    },
  }
}
