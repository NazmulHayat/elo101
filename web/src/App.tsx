import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { analyseVariation, explainMove, fetchGameUrl, GoneError, health, retryMove, streamReview } from './api'
import { moveCoach, retryCoach, startCoach, summaryCoach } from './coach'
import { BoardArea, type BoardInput, type PlayerInfo } from './components/BoardArea'
import { Coach } from './components/Coach'
import { Controls } from './components/Controls'
import { Graph } from './components/Graph'
import { ImportPanel } from './components/ImportPanel'
import { MoveList } from './components/MoveList'
import { SettingsMenu } from './components/SettingsMenu'
import { HelpMenu } from './components/HelpMenu'
import { InfoTip } from './components/InfoTip'
import { ReviewTour } from './components/ReviewTour'
import { MODE_HELP } from './lib/help'
import { Welcome } from './components/Welcome'
import { rememberGame } from './lib/recent'
import { Summary } from './components/Summary'
import { engineScore, engineWhiteShare, pct } from './format'
import { play, soundForSan } from './lib/sound'
import { BOARD_THEMES, useSettings } from './lib/settings'
import { BAD_LABELS, GRAPH_LABELS, RETRY_LABELS, TOP_LABELS } from './labels'
import type { Mode, RetryResult, Review, ReviewMove, Side } from './types'

type Stage = 'import' | 'analyzing' | 'summary' | 'review'

/** Retry mode at move `ply`: try → checking → correct | wrong (→ try again | solution). */
export interface RetryState {
  ply: number
  phase: 'try' | 'checking' | 'correct' | 'wrong' | 'solution'
  fen: string
  tries: number
  attempt?: { from: string; to: string }
  result?: RetryResult
  error?: string
  attemptFen?: string
  requestId?: number
}

interface VariationMove { san: string; uci: string; fen: string }
interface Variation {
  id: number
  anchorPly: number
  firstPly: number
  anchorFen: string
  moves: VariationMove[]
  cursor: number
  explanation: string
}

const RETRY_TOLERANCE = 0.02 // same as the server: within 2% of the best move counts as finding it

/** Fallback when the server no longer has the review: only the engine's top two moves can be judged. */
function localRetryResult(move: ReviewMove, uci: string, san: string): RetryResult {
  const isBest = uci === move.best_uci
  const isSecond = san === move.second_san && move.ep_second !== null
  const ep = isBest ? move.ep_best : isSecond ? (move.ep_second as number) : NaN
  const loss = Number.isNaN(ep) ? NaN : Math.max(0, move.ep_best - ep)
  return {
    uci, san, ep_after: ep, ep_loss: loss, label: isBest ? 'best' : 'good',
    correct: isBest || (!Number.isNaN(loss) && loss <= RETRY_TOLERANCE),
    best_san: move.best_san, best_line_san: move.best_line_san,
  }
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function formatClock(sec: number | null | undefined): string | null {
  if (sec === null || sec === undefined) return null
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

/** Headers from a PGN without analysing it, so the board can show players while the engine runs. */
function previewHeaders(pgn: string): Record<string, string> {
  try {
    const c = new Chess()
    c.loadPgn(pgn)
    return c.getHeaders() as Record<string, string>
  } catch {
    return {}
  }
}

export default function App() {
  const [stage, setStage] = useState<Stage>('import')
  const [review, setReview] = useState<Review | null>(null)
  const [ply, setPly] = useState(0)
  const [mode, setMode] = useState<Mode>('chances')
  const [orientation, setOrientation] = useState<Side>('white')
  const [playing, setPlaying] = useState(false)
  const [showBest, setShowBest] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, elapsed: 0 })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Record<string, string>>({})
  const [playerSide, setPlayerSide] = useState<Side>('white')
  const [retry, setRetry] = useState<RetryState | null>(null)
  const [practiceVisited, setPracticeVisited] = useState(false)
  const [variations, setVariations] = useState<Variation[]>([])
  const [activeVariationId, setActiveVariationId] = useState<number | null>(null)
  const activeVariationIdRef = useRef<number | null>(null)
  activeVariationIdRef.current = activeVariationId
  const [variationEval, setVariationEval] = useState<{ fen: string; cp: number | null; mate: number | null } | null>(null)
  const [replyHint, setReplyHint] = useState<{ fen: string; moves: VariationMove[] } | null>(null)
  const attemptId = useRef(0)
  const variationId = useRef(0)
  const boardRef = useRef<HTMLElement>(null)
  const [settings, updateSettings] = useSettings()
  const [explainOn, setExplainOn] = useState(false)
  const [notes, setNotes] = useState<Record<number, { text?: string; loading?: boolean; error?: string }>>({})
  const [lastPgn, setLastPgn] = useState<{ pgn: string; side?: Side } | null>(null)
  const [handoffLink, setHandoffLink] = useState<{ url: string; user: string } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const handoffToken = useRef(0)
  const prevPly = useRef(0)
  const prevStage = useRef<Stage>('import')
  const prevVariation = useRef<{ id: number; cursor: number } | null>(null)

  useEffect(() => {
    health().then((h) => {
      setExplainOn(!!h?.explain)
    })
  }, [])

  const explainPly = useCallback((reviewId: string, p: number) => {
    setNotes((n) => ({ ...n, [p]: { loading: true } }))
    explainMove(reviewId, p)
      .then((text) => setNotes((n) => ({ ...n, [p]: { text } })))
      .catch((e) => setNotes((n) => ({ ...n, [p]: { error: e instanceof Error ? e.message : String(e) } })))
  }, [])

  const total = review ? review.moves.length : 0

  const analyze = useCallback(async (pgn: string, side?: Side) => {
    abort.current?.abort()
    setPlaying(false)
    prevPly.current = 0
    setPlayerSide(side ?? 'white')
    setOrientation(side ?? 'white')
    setLastPgn({ pgn, side })
    setRetry(null)
    setPracticeVisited(false)
    setVariations([])
    setActiveVariationId(null)
    const ctrl = new AbortController()
    abort.current = ctrl
    setError(null)
    setReview(null)
    setNotes({})
    setPly(0)
    setPending(previewHeaders(pgn))
    setProgress({ done: 0, total: 0, elapsed: 0 })
    const started = Date.now()
    setStage('analyzing')
    try {
      const r = await streamReview(pgn, (done, t) => {
        if (!ctrl.signal.aborted) setProgress({ done, total: t, elapsed: (Date.now() - started) / 1000 })
      }, ctrl.signal)
      setReview(r)
      rememberGame(pgn, r.headers, side)
      setStage('summary')
    } catch (e) {
      if (ctrl.signal.aborted) return
      setError(e instanceof Error ? e.message : String(e))
      setStage('import')
    }
  }, [])

  const handledHandoff = useRef(false)
  useEffect(() => {
    if (handledHandoff.current) return
    const params = new URLSearchParams(window.location.search)
    const gameUrl = params.get('game')
    if (!gameUrl) return
    handledHandoff.current = true
    const gameUser = params.get('user') ?? ''
    setHandoffLink({ url: gameUrl, user: gameUser })
    params.delete('game')
    params.delete('user')
    const query = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
    setStage('analyzing')
    const token = ++handoffToken.current
    fetchGameUrl(gameUrl, gameUser || undefined)
      .then(({ pgn, side }) => { if (token === handoffToken.current) analyze(pgn, side) })
      .catch((e) => {
        if (token !== handoffToken.current) return
        setError(e instanceof Error ? e.message : String(e))
        setStage('import')
      })
  }, [analyze])

  const go = useCallback((p: number) => {
    setShowBest(false)
    setRetry(null)
    setActiveVariationId(null)
    setPly((cur) => {
      const max = review ? review.moves.length : 0
      const next = Math.max(0, Math.min(max, p))
      return next === cur ? cur : next
    })
  }, [review])

  const activeVariation = variations.find((v) => v.id === activeVariationId) ?? null
  const variationFen = activeVariation ? (activeVariation.cursor === 0 ? activeVariation.anchorFen : activeVariation.moves[activeVariation.cursor - 1].fen) : null
  const evaluationFen = variationFen ?? (retry && (retry.phase === 'checking' || retry.phase === 'correct') ? retry.fen : null)

  useEffect(() => {
    if (!evaluationFen) return
    let live = true
    setVariationEval(null)
    analyseVariation(evaluationFen).then((ev) => {
      if (live) setVariationEval({ fen: evaluationFen, cp: ev.eval_cp_white, mate: ev.mate_white })
    }).catch(() => { if (live) setVariationEval(null) })
    return () => { live = false }
  }, [evaluationFen])

  const variationStep = useCallback((cursor: number) => {
    setVariations((list) => list.map((v) => v.id === activeVariationId ? { ...v, cursor: Math.max(0, Math.min(cursor, v.moves.length)) } : v))
  }, [activeVariationId])

  const onVariationMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (!activeVariation || !variationFen) return false
    const board = new Chess(variationFen)
    try {
      const m = board.move({ from, to, promotion })
      const next: VariationMove = { san: m.san, uci: from + to + (promotion ?? ''), fen: board.fen() }
      setVariations((list) => list.map((v) => v.id === activeVariation.id
        ? { ...v, moves: [...v.moves.slice(0, v.cursor), next], cursor: v.cursor + 1 } : v))
      return true
    } catch { return false }
  }, [activeVariation, variationFen])

  const openAttemptLine = useCallback(() => {
    if (!retry?.attemptFen || !retry.result || !review) return
    const m = review.moves[retry.ply - 1]
    const first: VariationMove = { san: retry.result.san, uci: retry.result.uci, fen: retry.attemptFen }
    const line = retry.result.continuation ?? []
    const reply = line[0]
    const id = ++variationId.current
    const reason = retry.result.reason
      ? `${retry.result.san} ${retry.result.reason}.`
      : reply ? `After ${retry.result.san}, Stockfish’s strongest reply is ${reply.san}.` : `${retry.result.san} reaches this position.`
    const explanation = retry.result.correct
      ? `${retry.result.san} keeps your expected score close to the strongest move. ${reason}`
      : `${retry.result.san} gives away about ${Math.round(retry.result.ep_loss * 100)} expected-score points compared with the strongest move. ${reason}`
    const plannedMoves = [first, ...line]
    setVariations((list) => [...list, { id, anchorPly: retry.ply, firstPly: retry.ply, anchorFen: m.fen_before, moves: plannedMoves, cursor: 1, explanation }])
    setActiveVariationId(id)
    for (let cursor = 2; cursor <= plannedMoves.length; cursor++) {
      window.setTimeout(() => {
        if (activeVariationIdRef.current !== id) return
        setVariations((list) => list.map((v) => v.id === id && v.cursor === cursor - 1 && v.moves[cursor - 1]?.uci === plannedMoves[cursor - 1].uci
          ? { ...v, cursor } : v))
      }, (cursor - 1) * 900)
    }
    boardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [retry, review])

  const continueAttempt = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (!retry?.result?.correct || !retry.attemptFen || !review) return false
    const board = new Chess(retry.attemptFen)
    try {
      const next = board.move({ from, to, promotion })
      const first: VariationMove = { san: retry.result.san, uci: retry.result.uci, fen: retry.attemptFen }
      const id = ++variationId.current
      setVariations((list) => [...list, {
        id, anchorPly: retry.ply, firstPly: retry.ply, anchorFen: review.moves[retry.ply - 1].fen_before,
        moves: [first, { san: next.san, uci: from + to + (promotion ?? ''), fen: board.fen() }], cursor: 2,
        explanation: `${first.san} is close to the strongest move. You continued this position with ${next.san}.`,
      }])
      setActiveVariationId(id)
      return true
    } catch { return false }
  }, [retry, review])

  const flip = useCallback(() => setOrientation((o) => (o === 'white' ? 'black' : 'white')), [])

  // Entering review plays the game-start cue. Forward moves play their own cue;
  // backward navigation and the puzzle's pre-move position stay quiet.
  useEffect(() => {
    const prev = prevPly.current
    prevPly.current = ply
    const enteredReview = stage === 'review' && prevStage.current !== 'review'
    prevStage.current = stage
    if (!review || !settings.sounds || stage !== 'review') return
    if (enteredReview) {
      play('start', settings.volume)
      return
    }
    if (retry || ply <= prev || ply === 0) return
    const played = review.moves[ply - 1]
    play(soundForSan(played.san, played.mover, playerSide), settings.volume)
    if (ply === review.moves.length) {
      const timer = setTimeout(() => play('end', settings.volume), 180)
      return () => clearTimeout(timer)
    }
  }, [ply, review, retry, settings.sounds, settings.volume, stage, playerSide])

  useEffect(() => {
    const previous = prevVariation.current
    prevVariation.current = activeVariation ? { id: activeVariation.id, cursor: activeVariation.cursor } : null
    if (!activeVariation || !settings.sounds || !previous || previous.id !== activeVariation.id || activeVariation.cursor <= previous.cursor) return
    const played = activeVariation.moves[activeVariation.cursor - 1]
    const mover: Side = played.fen.split(' ')[1] === 'w' ? 'black' : 'white'
    play(soundForSan(played.san, mover, playerSide), settings.volume)
  }, [activeVariation, settings.sounds, settings.volume, playerSide])

  // Keyboard: ← → Home End, Space play, F flip.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!review || stage === 'analyzing' || stage === 'import') return
      const target = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey || target.closest('input, textarea, select, [contenteditable="true"], [popover], [role="dialog"]')) return
      if (e.key === ' ' && target.closest('button')) return
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End', ' '].includes(e.key)) setStage('review')
      if (e.key === 'ArrowRight') { if (activeVariation) variationStep(activeVariation.cursor + 1); else go(ply + 1) }
      else if (e.key === 'ArrowLeft') { if (activeVariation) variationStep(activeVariation.cursor - 1); else go(ply - 1) }
      else if (e.key === 'Home') { if (activeVariation) variationStep(0); else go(0) }
      else if (e.key === 'End') { if (activeVariation) variationStep(activeVariation.moves.length); else go(total) }
      else if (e.key === ' ' && !retry && !activeVariation) setPlaying((p) => !p)
      else if (e.key.toLowerCase() === 'f') flip()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [review, stage, ply, total, go, flip, retry, activeVariation, variationStep])

  // Autoplay.
  useEffect(() => {
    if (!playing) return
    if (ply >= total) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => go(ply + 1), 900)
    return () => clearTimeout(t)
  }, [playing, ply, total, go])

  const startRetry = useCallback((p: number) => {
    if (!review) return
    const m = review.moves[p - 1]
    setPlaying(false)
    setPracticeVisited(true)
    setShowBest(false)
    setPly(p)
    setRetry({ ply: p, phase: 'try', fen: m.fen_before, tries: 0 })
    setActiveVariationId(null)
    window.requestAnimationFrame(() => boardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }, [review])

  const onRetryMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (!review || !retry || (retry.phase !== 'try' && retry.phase !== 'wrong')) return false
    const m = review.moves[retry.ply - 1]
    const chess = new Chess(m.fen_before)
    let san: string
    try {
      san = chess.move({ from, to, promotion }).san
    } catch {
      return false
    }
    const uci = from + to + (promotion ?? '')
    const tries = retry.tries + 1
    const requestId = ++attemptId.current
    const base = { ply: retry.ply, tries, attempt: { from, to }, attemptFen: chess.fen(), requestId }
    setRetry({ ...base, phase: 'checking', fen: chess.fen() })
    if (settings.sounds) play(soundForSan(san), settings.volume)
    const finish = (result: RetryResult) => {
      if (settings.sounds) play('notify', settings.volume)
      setRetry((cur) => {
        if (!cur || cur.requestId !== requestId || cur.phase !== 'checking') return cur
        if (result.correct) return { ...base, phase: 'correct', fen: chess.fen(), result }
        return { ...base, phase: tries >= 2 ? 'solution' : 'wrong', fen: m.fen_before, result }
      })
    }
    if (uci === m.best_uci || !review.review_id) {
      finish(localRetryResult(m, uci, san))
    } else {
      retryMove(review.review_id, retry.ply, uci)
        .then(finish)
        .catch((e) => {
          if (e instanceof GoneError) finish(localRetryResult(m, uci, san))
          else setRetry((cur) => (cur && cur.requestId === requestId && cur.phase === 'checking' ? { ...cur, phase: 'try', fen: m.fen_before, error: String(e.message ?? e) } : cur))
        })
    }
    return true
  }, [review, retry, settings.sounds, settings.volume])

  const mistakes = useMemo(
    () => (review ? review.moves.filter((m) => RETRY_LABELS.includes(m.ep_label)).map((m) => m.ply) : []),
    [review],
  )
  const nextMistake = useCallback(() => {
    if (!mistakes.length) return
    go(mistakes.find((p) => p > ply) ?? mistakes[0])
  }, [mistakes, ply, go])

  const move = review && ply > 0 ? review.moves[ply - 1] : null
  const showingBest = stage === 'review' && !!move && !retry && !activeVariation && showBest && !!move.best_from && !!move.best_to
  const position = review ? review.positions[retry ? retry.ply - 1 : showingBest ? ply - 1 : ply] : null
  const fen = variationFen ?? (retry ? retry.fen : review ? (showingBest ? move.fen_before : move ? move.fen_after : review.start_fen) : START_FEN)

  useEffect(() => {
    if (!move || !BAD_LABELS.includes(move.ep_label) || stage !== 'review') return
    let live = true
    const fen = move.fen_after
    analyseVariation(fen).then((ev) => {
      if (!live) return
      const board = new Chess(fen)
      const moves: VariationMove[] = []
      for (const uci of (ev.pv_uci ?? []).slice(0, 4)) {
        try {
          const played = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
          moves.push({ san: played.san, uci, fen: board.fen() })
        } catch { break }
      }
      setReplyHint({ fen, moves })
    }).catch(() => { if (live) setReplyHint(null) })
    return () => { live = false }
  }, [move, stage])

  const openReplyLine = useCallback(() => {
    if (!move || !replyHint || replyHint.fen !== move.fen_after || !replyHint.moves.length) return
    const id = ++variationId.current
    setVariations((list) => [...list, {
      id, anchorPly: move.ply, firstPly: move.ply + 1, anchorFen: move.fen_after,
      moves: replyHint.moves, cursor: 0,
      explanation: `After ${move.san}, the engine’s strongest reply is ${replyHint.moves[0].san}. Step through the line on the board or move either side’s pieces to explore.`,
    }])
    setActiveVariationId(id)
    boardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [move, replyHint])

  const graphValues = useMemo(() => {
    if (!review) return []
    return review.positions.map((p) => (mode === 'chances' ? p.white_ep : engineWhiteShare(p)))
  }, [review, mode])

  const markers = useMemo(
    () => (review ? review.moves.filter((m) => GRAPH_LABELS.includes(m.ep_label)).map((m) => ({ ply: m.ply, label: m.ep_label })) : []),
    [review],
  )

  const headers = review?.headers ?? pending
  const clockFor = (side: Side): string | null => {
    if (!review || activeVariation) return null
    // Most recent known clock for `side` at or before the shown position.
    for (let i = Math.min(retry ? retry.ply - 2 : ply - 1, review.moves.length - 1); i >= 0; i--) {
      const m = review.moves[i]
      if (m.mover === side && m.clock_sec !== null) return formatClock(m.clock_sec)
    }
    const initial = Number((review.headers.TimeControl || '').split('+')[0])
    return Number.isFinite(initial) && initial > 0 ? formatClock(initial) : null
  }
  const whiteP: PlayerInfo = {
    name: headers.White || 'White',
    elo: review ? review.white_elo : Number(headers.WhiteElo) || null,
    side: 'white',
    clock: clockFor('white'),
  }
  const blackP: PlayerInfo = {
    name: headers.Black || 'Black',
    elo: review ? review.black_elo : Number(headers.BlackElo) || null,
    side: 'black',
    clock: clockFor('black'),
  }

  let whiteShare = 0.5
  let evalText = mode === 'chances' ? '50%' : '0.0'
  if (position) {
    if (mode === 'chances') {
      whiteShare = position.white_ep
      evalText = pct(Math.max(whiteShare, 1 - whiteShare))
    } else {
      whiteShare = engineWhiteShare(position)
      evalText = engineScore(position).replace('+', '')
    }
  }
  if (evaluationFen) {
    const value = variationEval?.fen === evaluationFen ? variationEval : null
    if (value) {
      const p = { fen, cp: value.cp, mate: value.mate, white_ep: 0.5, white_lichess: 0.5 }
      whiteShare = engineWhiteShare(p)
      evalText = engineScore(p).replace('+', '')
    } else {
      whiteShare = 0.5
      evalText = '…'
    }
  }

  const inReview = stage === 'review' && review
  const replyUci = move && replyHint?.fen === move.fen_after ? replyHint.moves[0]?.uci : null
  let arrow: { from: string; to: string; color?: string } | null = showingBest && move
    ? { from: move.best_from as string, to: move.best_to as string, color: 'var(--c-best)' }
    : inReview && !retry && !activeVariation && move && BAD_LABELS.includes(move.ep_label) && replyUci
      ? { from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), color: 'var(--arrow)' }
      : null
  if (retry && move && retry.phase === 'solution' && move.best_from && move.best_to) arrow = { from: move.best_from, to: move.best_to }
  if (activeVariation) {
    const next = activeVariation.moves[activeVariation.cursor]
    arrow = next ? { from: next.uci.slice(0, 2), to: next.uci.slice(2, 4) } : null
  }

  const boardInput: BoardInput | null = inReview && activeVariation
    ? { side: fen.split(' ')[1] === 'w' ? 'white' : 'black', onMove: onVariationMove, onIllegal: () => { if (settings.sounds) play('illegal', settings.volume) } }
    : inReview && retry?.phase === 'correct'
      ? { side: fen.split(' ')[1] === 'w' ? 'white' : 'black', onMove: continueAttempt, onIllegal: () => { if (settings.sounds) play('illegal', settings.volume) } }
    : inReview && retry && (retry.phase === 'try' || retry.phase === 'wrong') && move ? { side: move.mover, onMove: onRetryMove, onIllegal: () => { if (settings.sounds) play('illegal', settings.volume) } } : null
  let lastMove = inReview && move && !showingBest ? { from: move.from, to: move.to } : null
  let badge = inReview && move && !showingBest ? { square: move.to, label: move.ep_label } : null
  if (retry) {
    lastMove = retry.attempt && (retry.phase === 'checking' || retry.phase === 'correct') ? retry.attempt : null
    badge = retry.phase === 'correct' && retry.attempt && retry.result ? { square: retry.attempt.to, label: retry.result.label } : null
  }
  if (activeVariation) {
    const current = activeVariation.moves[activeVariation.cursor - 1]
    lastMove = current ? { from: current.uci.slice(0, 2), to: current.uci.slice(2, 4) } : null
    badge = null
  }
  const canRetry = !!move && RETRY_LABELS.includes(move.ep_label)

  const coachEval = inReview && move && !retry && !activeVariation ? engineScore(review.positions[ply]).replace(/^-/, '−') : null
  const leaveReview = () => { setRetry(null); setPlaying(false); setActiveVariationId(null); setStage('summary') }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span>elo101</span>
        </div>
        <nav className="topbar-actions" aria-label="Site">
          <a className="topbar-link" href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
          {review && (
            <button type="button" className="btn btn-sm" onClick={() => { setStage('import'); setPlaying(false); setRetry(null); setActiveVariationId(null); setHandoffLink(null) }}>
              New game
            </button>
          )}
          <HelpMenu />
          <SettingsMenu settings={settings} onChange={updateSettings} />
        </nav>
      </header>
      <main className={`layout ${stage === 'import' || stage === 'analyzing' ? 'layout-welcome' : ''}`}>
        <section className="left" ref={boardRef}>
          {stage === 'import' || stage === 'analyzing' ? <Welcome theme={BOARD_THEMES[settings.theme]} /> : <BoardArea
            fen={fen}
            orientation={orientation}
            white={whiteP}
            black={blackP}
            input={boardInput}
            inputSession={activeVariation ? `variation-${activeVariation.id}` : retry ? `retry-${retry.ply}` : null}
            lastMove={lastMove}
            badge={badge}
            arrow={arrow}
            whiteShare={whiteShare}
            evalText={evalText}
            onStep={inReview && !retry ? (direction) => go(ply + direction) : undefined}
            theme={BOARD_THEMES[settings.theme]}
          />}
        </section>

        <aside className={`panel panel-${stage}`}>
          {stage === 'import' && (
            <>
              <div className="panel-head"><h2 className="panel-title">Review a game</h2></div>
              {error && (
                <div className="error banner" role="alert">
                  <span>{error}</span>
                  {handoffLink && <span>Check the game link and Chess.com username below, or choose PGN.</span>}
                  {lastPgn && (
                    <button type="button" className="link-btn" onClick={() => analyze(lastPgn.pgn, lastPgn.side)}>Try again</button>
                  )}
                </div>
              )}
              <ImportPanel onAnalyze={analyze} handoff={handoffLink ?? undefined} />
            </>
          )}

          {stage === 'analyzing' && (
            <div className="panel-body analyzing">
              <div className="spinner" aria-hidden />
              <div className="an-title">Analyzing game…</div>
              <div className="progress" role="progressbar" aria-label="Game analysis" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.total ? Math.round(progress.done / progress.total * 100) : undefined}>
                <div style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '4%' }} />
              </div>
              <div className="analysis-status" role="status">
                <strong>{progress.total ? `${Math.round(progress.done / progress.total * 100)}%` : 'Starting Stockfish…'}</strong>
                {progress.total > 1 && <span>Analyzing move {Math.max(1, progress.done - 1)} of {progress.total - 1}</span>}
                <span className="muted">{progress.done > 1 && progress.elapsed > 0
                  ? (() => { const seconds = Math.max(1, Math.ceil((progress.total - progress.done) * progress.elapsed / progress.done)); return seconds < 60 ? `About ${seconds} sec left` : `About ${Math.ceil(seconds / 60)} min left` })()
                  : 'Estimating time remaining…'}</span>
              </div>
              <button type="button" className="btn" onClick={() => { handoffToken.current++; abort.current?.abort(); setStage('import') }}>
                Cancel
              </button>
              <div className="skeleton-block" aria-hidden>
                <div className="sk sk-graph" />
                <div className="sk-row"><div className="sk sk-acc" /><div className="sk sk-acc" /></div>
                {Array.from({ length: 5 }, (_, i) => <div key={i} className="sk sk-line" />)}
              </div>
            </div>
          )}

          {stage === 'summary' && review && (
            <Summary
              review={review}
              coach={summaryCoach(review)}
              graphValues={graphValues}
              mode={mode}
              onStart={() => { setStage('review'); go(Math.max(ply, 1)) }}
              onJump={(p) => { setStage('review'); go(p) }}
              onPractice={(p) => { setStage('review'); startRetry(p) }}
            />
          )}

          {inReview && (
            <div className="panel-body review" data-testid="review-page">
              <div className="panel-head">
                <button type="button" className="icon-btn icon-btn-ghost back-btn" data-testid="back-to-summary" aria-label="Back to summary" title="Back to summary" onClick={leaveReview}>
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <h2 className="panel-title">Game review</h2>
                {evaluationFen && <span className="panel-sub">Engine · practice line</span>}
                <button type="button" className="icon-btn icon-btn-ghost flip-btn" data-testid="flip-board" onClick={flip} aria-label="Flip board" title="Flip board (F)">
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden><path d="M5 2.5v11M5 13.5 2.5 11M5 13.5 7.5 11M11 13.5v-11M11 2.5 8.5 5M11 2.5 13.5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
              {activeVariation ? (
                <div className="variation-panel">
                  <h2>Your line <span className="variation-position">{activeVariation.cursor} / {activeVariation.moves.length}</span></h2>
                  <p>{activeVariation.explanation}</p>
                  {activeVariation.moves[activeVariation.cursor] && <div className="variation-next">Arrow: {activeVariation.moves[activeVariation.cursor].san} is next in the analyzed line. Tap a move below or move a piece to explore.</div>}
                  <div className="coach-actions">
                    {retry && <button type="button" className="btn btn-sm" onClick={() => { setActiveVariationId(null); setRetry((cur) => cur && review ? { ...cur, phase: 'try', fen: review.moves[cur.ply - 1].fen_before, tries: cur.phase === 'wrong' ? cur.tries : 0, result: undefined, attempt: undefined, attemptFen: undefined } : cur) }}>Back to puzzle</button>}
                    <button type="button" className="btn btn-sm" onClick={() => go(activeVariation.anchorPly)}>Original move</button>
                    <button type="button" className="btn btn-sm" onClick={() => go(activeVariation.anchorPly + 1)}>Continue game</button>
                  </div>
                </div>
              ) : retry && move ? (
                <Coach text={retryCoach(move, retry)} label={retry.phase === 'correct' ? retry.result?.label : undefined}>
                  {retry.phase === 'try' && (
                    <button type="button" className="btn btn-sm" onClick={() => setRetry(null)}>Return to game</button>
                  )}
                  {retry.result && <button type="button" className="btn btn-sm" onClick={openAttemptLine}>Show why · play line</button>}
                  {retry.phase === 'wrong' && <button type="button" className="btn btn-sm" onClick={() => setRetry({ ...retry, phase: 'solution' })}>Show solution</button>}
                  {(retry.phase === 'correct' || retry.phase === 'solution') && (
                    <>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => go(ply + 1)}>Continue original game</button>
                      {mistakes.some((p) => p !== ply) && (
                        <button type="button" className="btn btn-sm" onClick={nextMistake}>Next mistake</button>
                      )}
                    </>
                  )}
                </Coach>
              ) : (
                <Coach text={move ? moveCoach(review, move) : startCoach(review)} label={move?.ep_label} evalText={coachEval} ai={move ? notes[move.ply] ?? null : null}>
                  {showingBest && <span className="best-position-note">Board shows the position before {move?.san}.</span>}
                  {move && BAD_LABELS.includes(move.ep_label) && <button type="button" className="btn btn-sm" disabled={replyHint?.fen !== move.fen_after || !replyHint.moves.length} onClick={openReplyLine}>Play the reply</button>}
                  {variations.filter((v) => v.anchorPly === ply).map((v, i) => <button type="button" key={v.id} className="btn btn-sm" onClick={() => setActiveVariationId(v.id)}>Your line {i + 1}</button>)}
                  {mistakes.length > 0 && (
                    <button type="button" className="btn btn-sm" data-testid="next-mistake" onClick={nextMistake} title="Next mistake by either player">
                      Next mistake
                    </button>
                  )}
                  {explainOn && review.review_id && move && move.ep_label !== 'book' && !notes[move.ply] && (
                    <button type="button" className="btn btn-sm" onClick={() => explainPly(review.review_id as string, move.ply)} title="Ask Claude to explain this move">
                      Explain
                    </button>
                  )}
                </Coach>
              )}
              {!activeVariation && !retry && (
                <div className="review-actions">
                  <button type="button" data-tour="retry" data-testid="retry-move" className="btn btn-primary" disabled={!canRetry} onClick={() => startRetry(ply)}>
                    Retry this move
                  </button>
                  <button
                    type="button"
                    data-testid="show-best"
                    className="btn"
                    aria-pressed={showingBest}
                    disabled={!move || TOP_LABELS.includes(move.ep_label)}
                    onClick={() => setShowBest((s) => !s)}
                  >
                    {showingBest ? 'Show played' : 'Show best'}
                  </button>
                </div>
              )}
              <MoveList moves={review.moves} current={activeVariation ? -1 : ply} onSelect={go} variation={activeVariation ? { anchorPly: activeVariation.anchorPly, firstPly: activeVariation.firstPly, cursor: activeVariation.cursor, moves: activeVariation.moves, onSelect: variationStep } : null} />
              {!activeVariation && <div className="graph-wrap" data-tour="graph">
                <div className="graph-tabs">
                  <div className="seg" role="tablist" aria-label="Graph and evaluation bar">
                    <button type="button" role="tab" data-testid="graph-tab-chances" aria-selected={mode === 'chances'} onClick={() => setMode('chances')} title="Expected points at these players' level">Chances</button>
                    <button type="button" role="tab" data-testid="graph-tab-engine" aria-selected={mode === 'engine'} onClick={() => setMode('engine')} title="Raw Stockfish evaluation">Engine</button>
                  </div>
                  <InfoTip label="Chances vs Engine">{MODE_HELP}</InfoTip>
                </div>
                <Graph values={graphValues} positions={review.positions} mode={mode} moves={review.moves} current={ply} markers={markers} onSelect={go} />
              </div>}
              <Controls
                onFirst={() => activeVariation ? variationStep(0) : go(0)}
                onPrev={() => activeVariation ? variationStep(activeVariation.cursor - 1) : go(ply - 1)}
                onNext={() => activeVariation ? variationStep(activeVariation.cursor + 1) : go(ply + 1)}
                onLast={() => activeVariation ? variationStep(activeVariation.moves.length) : go(total)}
                onTogglePlay={() => setPlaying((p) => !p)}
                playing={playing}
                atStart={activeVariation ? activeVariation.cursor === 0 : ply === 0}
                atEnd={activeVariation ? activeVariation.cursor === activeVariation.moves.length : ply === total}
                retrying={!!retry || !!activeVariation}
              />
            </div>
          )}
        </aside>
      </main>
      {inReview && !retry && !practiceVisited && <ReviewTour onShowRetry={() => {
        const first = review.moves.find((m) => RETRY_LABELS.includes(m.ep_label))
        if (first) go(first.ply)
      }} />}
    </div>
  )
}
