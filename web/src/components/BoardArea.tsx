import { Chess } from 'chess.js'
import { createContext, forwardRef, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties } from 'react'
import { TouchBackend } from 'react-dnd-touch-backend'
import { Chessboard } from 'react-chessboard'
import type { CustomSquareProps, Piece, Square } from 'react-chessboard/dist/chessboard/types'
import { useReducedMotion } from '../lib/motion'
import { highlight } from '../lib/highlight'
import { capturedFrom, type Captured, type PieceType } from '../lib/material'
import type { Label, Side } from '../types'
import type { BoardThemeSpec } from '../lib/settings'
import { LabelIcon } from './LabelIcon'
import type { EndBadge } from '../lib/ending'

const NO_ENDS: EndBadge[] = []
import { PlayerAvatar } from './PlayerAvatar'

export interface PlayerInfo {
  name: string
  elo: number | null
  side: Side
  clock: string | null
  avatar?: string | null
}

interface Badge {
  square: string
  label: Label
}

interface SquareInfo {
  badge: Badge | null
  orientation: Side
  ends: EndBadge[]
}

// The square renderer must be a stable component, so the current badge and orientation reach it via context.
const SquareContext = createContext<SquareInfo>({ badge: null, orientation: 'white', ends: [] })

/** A square with its coordinates printed inside (rank on the left file, file on the bottom rank) and the move badge. */
const BoardSquare = forwardRef<HTMLDivElement, CustomSquareProps>(function BoardSquare({ children, square, squareColor, style }, ref) {
  const { badge, orientation, ends } = useContext(SquareContext)
  const end = ends.find((e) => e.square === square)
  const onLight = squareColor === 'white'
  const leftFile = orientation === 'white' ? 'a' : 'h'
  const bottomRank = orientation === 'white' ? '1' : '8'
  return (
    <div ref={ref} style={{ ...style, position: 'relative' }}>
      {children}
      {square[0] === leftFile && <span className={`coord coord-rank ${onLight ? 'on-light' : 'on-dark'}`} aria-hidden>{square[1]}</span>}
      {square[1] === bottomRank && <span className={`coord coord-file ${onLight ? 'on-light' : 'on-dark'}`} aria-hidden>{square[0]}</span>}
      {end && <span className={`end-badge end-${end.tone}`}>{end.text}</span>}
      {badge && badge.square === square && (
        <span className="square-badge" key={`${badge.square}-${badge.label}`}>
          <LabelIcon label={badge.label} size={26} />
        </span>
      )}
    </div>
  )
})

type BoardProps = Omit<ComponentProps<typeof Chessboard>, 'customSquare' | 'customDarkSquareStyle' | 'customLightSquareStyle' | 'customBoardStyle' | 'showBoardNotation'> & {
  theme: BoardThemeSpec
  badge?: Badge | null
  ends?: EndBadge[]
}

/** react-chessboard in an elo101 board theme: one picture (Ice marble) or flat squares, coordinates inside the corner squares. */
// The browser's native drag-and-drop (react-chessboard's desktop default) trails the cursor; the touch backend
// with mouse events follows pointer moves directly, so dragging feels as quick as clicking.
const DND_OPTIONS = { enableMouseEvents: true }

// Memoised: the review re-renders often (engine updates, clocks); the board only redraws when its own props change.
export const ThemedBoard = memo(function ThemedBoard({ theme, badge = null, ends = NO_ENDS, boardOrientation = 'white', ...rest }: BoardProps) {
  const info = useMemo(() => ({ badge, orientation: boardOrientation, ends }), [badge, boardOrientation, ends])
  const dark = useMemo(() => (theme.image ? { backgroundColor: 'transparent' } : { backgroundColor: theme.dark }), [theme])
  const light = useMemo(() => (theme.image ? { backgroundColor: 'transparent' } : { backgroundColor: theme.light }), [theme])
  const boardStyle = useMemo(() => ({
    borderRadius: '6px',
    ...(theme.image ? { backgroundImage: `url(${import.meta.env.BASE_URL}${theme.image})`, backgroundSize: '100% 100%' } : {}),
  }), [theme])
  return (
    <div
      className="themed-board"
      style={{ '--sq-hl': theme.highlight, '--coord-light': theme.coordLight, '--coord-dark': theme.coordDark } as CSSProperties}
    >
      <SquareContext.Provider value={info}>
        <Chessboard
          {...rest}
          boardOrientation={boardOrientation}
          customSquare={BoardSquare}
          customDarkSquareStyle={dark}
          customLightSquareStyle={light}
          customBoardStyle={boardStyle}
          showBoardNotation={false}
          customDndBackend={TouchBackend}
          customDndBackendOptions={DND_OPTIONS}
        />
      </SquareContext.Provider>
    </div>
  )
})

// Captured opponent pieces: filled glyphs (U+FE0E keeps ♟ from turning into an emoji), coloured per side in CSS.
const GLYPH: Record<PieceType, string> = { q: '♛\uFE0E', r: '♜\uFE0E', b: '♝\uFE0E', n: '♞\uFE0E', p: '♟\uFE0E' }

function CapturedPieces({ side, cap }: { side: Side; cap: Captured }) {
  const theirs = side === 'white' ? 'black' : 'white'
  const groups: PieceType[][] = []
  for (const t of cap.pieces) {
    const last = groups[groups.length - 1]
    if (last && last[0] === t) last.push(t)
    else groups.push([t])
  }
  return (
    <span className="captured" aria-label={`Captured: ${cap.pieces.join(' ') || 'none'}`}>
      {groups.map((g, i) => (
        <span key={i} className="cap-group">
          {g.map((t, j) => (
            <span key={j} className={`cap-piece cap-${theirs}`}>{GLYPH[t]}</span>
          ))}
        </span>
      ))}
      {cap.lead > 0 && <span className="cap-lead">+{cap.lead}</span>}
    </span>
  )
}

function PlayerBar({ p, cap, toMove }: { p: PlayerInfo; cap: Captured; toMove: boolean }) {
  return (
    <div className="player-bar">
      <span className="avatar" aria-label={p.side === 'white' ? 'White' : 'Black'} role="img"><PlayerAvatar side={p.side} src={p.avatar ?? null} /></span>
      <div className="player-id">
        <div className="player-line">
          <span className="player-name">{p.name}</span>
          {p.elo !== null && <span className="player-elo">({p.elo})</span>}
        </div>
        <CapturedPieces side={p.side} cap={cap} />
      </div>
      {p.clock && <span className={`clock ${toMove ? 'clock-on' : ''}`}>{p.clock}</span>}
    </div>
  )
}

/** Retry mode: the board takes moves for `side`; onMove returns false to reject (piece snaps back). */
export interface BoardInput {
  side: Side
  onMove: (from: string, to: string, promotion?: string) => boolean
  onIllegal?: () => void
}

interface Props {
  fen: string
  input?: BoardInput | null
  // Board accepts drags for this whole session; `input` decides whether a drag is allowed right now.
  // react-chessboard wires up dragging only at mount, so toggling arePiecesDraggable later doesn't work;
  // changing inputSession remounts the board instead.
  inputSession?: string | null
  orientation: Side
  white: PlayerInfo
  black: PlayerInfo
  lastMove: { from: string; to: string } | null
  badge: Badge | null
  ends?: EndBadge[]
  arrow: { from: string; to: string; color?: string } | null
  whiteShare: number
  evalText: string
  theme: BoardThemeSpec
  onStep?: (direction: -1 | 1) => void
}

export function BoardArea({ fen, input, inputSession, orientation, white, black, lastMove, badge, ends, arrow, whiteShare, evalText, theme, onStep }: Props) {
  const swipe = useRef<{ id: number; x: number; y: number; time: number } | null>(null)
  // Scrolling over the board steps through moves (down = forward, up = back), one step per notch.
  const boardRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef(onStep)
  stepRef.current = onStep
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    let acc = 0
    let last = 0
    const onWheel = (e: WheelEvent) => {
      const step = stepRef.current
      if (!step || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
      e.preventDefault()
      const now = performance.now()
      if (now - last > 250) acc = 0
      last = now
      acc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
      // Trackpads send many small deltas; a mouse notch is ~100px.
      while (Math.abs(acc) >= 60) {
        step(acc > 0 ? 1 : -1)
        acc -= Math.sign(acc) * 60
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])
  const reducedMotion = useReducedMotion()
  const captured = useMemo(() => capturedFrom(fen), [fen])
  // Click-to-move (touch friendly): first click picks a piece, second picks the target.
  const [selected, setSelected] = useState<string | null>(null)
  // Clear on a new position or input mode only: `input` is rebuilt on every parent render
  // (engine updates), which used to wipe the legal-move dots mid-thought.
  const inputKey = input ? input.side : null
  useEffect(() => setSelected(null), [fen, inputKey])

  const targetMoves = useMemo(() => {
    if (!inputKey || !selected) return []
    try {
      return new Chess(fen).moves({ square: selected as Square, verbose: true })
    } catch {
      return []
    }
  }, [fen, inputKey, selected])
  const targets = useMemo(() => targetMoves.map((m) => m.to as string), [targetMoves])

  // The parent rebuilds lastMove / arrow / badge objects on every render: key these on their values instead.
  const lastFrom = lastMove?.from ?? null
  const lastTo = lastMove?.to ?? null
  const squareStyles = useMemo(() => {
    const s: Record<string, Record<string, string>> = {}
    if (lastFrom && lastTo) {
      for (const sq of [lastFrom, lastTo]) s[sq] = highlight()
    }
    if (selected) s[selected] = { boxShadow: 'inset 0 0 0 999px var(--sq-select)' }
    // Dot on empty targets, ring on captures (a dot would hide under the piece).
    for (const m of targetMoves) {
      const ring = m.captured !== undefined
      s[m.to] = {
        ...s[m.to],
        backgroundImage: ring
          ? 'radial-gradient(circle, transparent 60%, var(--sq-dot) 62%, var(--sq-dot) 74%, transparent 76%)'
          : 'radial-gradient(circle, var(--sq-dot) 22%, transparent 24%)',
      }
    }
    return s
  }, [lastFrom, lastTo, selected, targetMoves])

  const myColor = input ? (input.side === 'white' ? 'w' : 'b') : null
  // react-chessboard can call drag/drop handlers from an earlier render; read the current values via refs.
  const live = useRef({ input, fen, myColor, selected, targets })
  live.current = { input, fen, myColor, selected, targets }
  // Stable handlers (they read the latest values from `live`), so the memoised board isn't redrawn for them.
  const isPromotion = useCallback((from: string, to: string) => {
    try {
      const p = new Chess(live.current.fen).get(from as Square)
      return !!p && p.type === 'p' && (to[1] === '8' || to[1] === '1')
    } catch {
      return false
    }
  }, [])

  const onSquareClick = useCallback((square: Square, piece: Piece | undefined) => {
    const { input, myColor, selected, targets } = live.current
    if (!input) return
    if (piece && piece[0] === myColor) {
      setSelected(square === selected ? null : square)
      return
    }
    if (selected && targets.includes(square)) {
      if (!input.onMove(selected, square, isPromotion(selected, square) ? 'q' : undefined)) input.onIllegal?.()
      setSelected(null)
    } else {
      if (selected) input.onIllegal?.()
      setSelected(null)
    }
  }, [isPromotion])

  const isDraggablePiece = useCallback(({ piece }: { piece: Piece }) => !!live.current.input && piece[0] === live.current.myColor, [])
  const onPieceDrop = useCallback((from: Square, to: Square, piece: Piece) => {
    const cur = live.current.input
    if (!cur) return false
    const promo = isPromotion(from, to) ? piece[1].toLowerCase() : undefined
    const accepted = cur.onMove(from, to, promo)
    if (!accepted) cur.onIllegal?.()
    return accepted
  }, [isPromotion])
  const onPieceDragBegin = useCallback((piece: Piece, square: Square) => { if (live.current.input && piece[0] === live.current.myColor) setSelected(square) }, [])
  const onPieceDragEnd = useCallback(() => setSelected(null), [])

  const arrowFrom = arrow?.from ?? null
  const arrowTo = arrow?.to ?? null
  const arrowColor = arrow?.color ?? 'var(--arrow)'
  const arrows = useMemo(
    () => (arrowFrom && arrowTo ? [[arrowFrom as Square, arrowTo as Square, arrowColor] as [Square, Square, string]] : []),
    [arrowFrom, arrowTo, arrowColor],
  )
  const badgeSquare = badge?.square ?? null
  const badgeLabel = badge?.label ?? null
  const stableBadge = useMemo(() => (badgeSquare && badgeLabel ? { square: badgeSquare, label: badgeLabel } : null), [badgeSquare, badgeLabel])

  const top = orientation === 'white' ? black : white
  const bottom = orientation === 'white' ? white : black
  const turn: Side = fen.split(' ')[1] === 'b' ? 'black' : 'white'
  // Eval bar fills from the bottom with the bottom player's colour; the value sits at the leading side's end.
  const bottomShare = orientation === 'white' ? whiteShare : 1 - whiteShare
  const bottomAhead = bottomShare >= 0.5

  return (
    <div className={`board-area ${input ? 'board-input' : ''}`}>
      <PlayerBar p={top} cap={captured[top.side]} toMove={turn === top.side} />
      <div className="board-row">
        <div className={`eval-bar ${orientation === 'black' ? 'eval-flipped' : ''}`} data-testid="eval-bar" aria-label={`${whiteShare >= .5 ? 'White' : 'Black'} ahead: ${evalText}`}>
          <div className="eval-fill" style={{ height: `${bottomShare * 100}%` }} />
          <span key={evalText} className={`eval-text ${bottomAhead ? 'eval-bottom' : 'eval-top'}`}>{evalText}</span>
        </div>
        <div className="board" role="group" aria-label={inputSession === 'explore' ? 'Your line: move either side’s pieces to explore' : inputSession ? 'Retry position: drag a piece or tap its start and destination' : 'Chessboard'}
          style={{ touchAction: inputSession ? 'none' : 'pan-y' }}
          onPointerDown={(e) => {
            if (onStep && !inputSession && e.pointerType !== 'mouse') swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now() }
          }}
          onPointerCancel={() => { swipe.current = null }}
          ref={boardRef}
          onPointerUp={(e) => {
            const start = swipe.current
            swipe.current = null
            if (!start || start.id !== e.pointerId || inputSession || !onStep) return
            const dx = e.clientX - start.x
            const dy = e.clientY - start.y
            if (performance.now() - start.time < 900 && Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.4) onStep(dx < 0 ? 1 : -1)
          }}
        >
          <ThemedBoard
            key={inputSession ?? 'view'}
            theme={theme}
            badge={stableBadge}
            ends={ends}
            id="review-board"
            position={fen}
            boardOrientation={orientation}
            arePiecesDraggable={!!inputSession}
            isDraggablePiece={isDraggablePiece}
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            // Dragging shows the same legal-move dots as tapping.
            onPieceDragBegin={onPieceDragBegin}
            onPieceDragEnd={onPieceDragEnd}
            areArrowsAllowed={false}
            animationDuration={reducedMotion ? 0 : 200}
            customArrows={arrows}
            customSquareStyles={squareStyles}
          />
        </div>
      </div>
      <PlayerBar p={bottom} cap={captured[bottom.side]} toMove={turn === bottom.side} />
    </div>
  )
}
