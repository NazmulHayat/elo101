import type { CSSProperties } from 'react'
import type { CoachText } from '../coach'
import { pct } from '../format'
import { GRAPH_LABELS, LABEL_ORDER, LABELS } from '../labels'
import type { Mode, Phase, PhaseGrade, Review, Side } from '../types'
import { ACCURACY_HELP, RATING_HELP } from '../lib/help'
import { InfoTip } from './InfoTip'
import { Graph } from './Graph'
import { LabelIcon } from './LabelIcon'
import { KingIcon } from './PieceIcon'

interface Props {
  review: Review
  coach: CoachText
  graphValues: number[]
  mode: Mode
  onStart: () => void
  onJump: (ply: number) => void
  onPractice: (ply: number) => void
}

const PHASES: [Phase, string][] = [['opening', 'Opening'], ['middlegame', 'Middlegame'], ['endgame', 'Endgame']]

function Grade({ g }: { g: PhaseGrade | null }) {
  if (!g) return <span className="sum-n zero">–</span>
  return (
    <span className="sum-grade" title={`${g.accuracy.toFixed(1)} accuracy over ${g.moves} moves in this phase`}>
      <LabelIcon label={g.grade} size={18} /><span>{g.accuracy.toFixed(1)}</span>
    </span>
  )
}

function Rating({ est, rating }: { est: Review['summary']['white']['estimated_rating']; rating: number }) {
  // "Played like": the rating of players who typically play this well, as Chess.com's game rating does.
  if (!est) return <span className="sum-rating">–<small>too few moves</small></span>
  return <span className="sum-rating" title={`Played like a ${est.plays_like}. Rating: ${rating}.`}>{est.plays_like}<small>played like</small></span>
}

export function Summary({ review, coach, graphValues, mode, onStart, onJump, onPractice }: Props) {
  const { white: ws, black: bs } = review.summary
  const white = review.headers.White || 'White'
  const black = review.headers.Black || 'Black'
  const result = review.headers.Result && review.headers.Result !== '*' ? review.headers.Result : null
  const winner: Side | null = result === '1-0' ? 'white' : result === '0-1' ? 'black' : null
  const fullMoves = Math.ceil(review.moves.length / 2)
  const markers = review.moves.filter((m) => GRAPH_LABELS.includes(m.ep_label)).map((m) => ({ ply: m.ply, label: m.ep_label }))
  const keyMoves = review.moves.filter((m) => review.key_moments.includes(m.ply))
  const converted = review.rating_pool === 'chesscom'

  return (
    <div className="panel-body summary" data-testid="summary-page">
      <div className="panel-head">
        <h2 className="panel-title">Game review</h2>
        <span className="panel-sub">{result ? `${result} · ` : ''}{fullMoves} {fullMoves === 1 ? 'move' : 'moves'}</span>
      </div>
      <div className="summary-scroll">
        <div className="summary-graph">
          <Graph values={graphValues} positions={review.positions} mode={mode} moves={review.moves} current={null} markers={markers} onSelect={onJump} />
        </div>

        <div className="sum-table" role="table" aria-label="Game summary">
          <div className="sum-row" role="row">
            <span role="columnheader" />
            <span className="sum-hd" role="columnheader" title={white}>{white}</span>
            <span aria-hidden />
            <span className="sum-hd" role="columnheader" title={black}>{black}</span>
          </div>
          <div className="sum-row" role="row">
            <span className="sum-lbl" role="rowheader">Players</span>
            <span className="sum-av" role="cell"><span className={winner === 'white' ? 'win' : ''} aria-label={winner === 'white' ? `${white}, winner` : white} role="img"><KingIcon side="white" size={46} /></span></span>
            <span aria-hidden />
            <span className="sum-av" role="cell"><span className={winner === 'black' ? 'win' : ''} aria-label={winner === 'black' ? `${black}, winner` : black} role="img"><KingIcon side="black" size={46} /></span></span>
          </div>
          <div className="sum-row" role="row">
            <span className="sum-lbl" role="rowheader">Accuracy <InfoTip label="Accuracy">{ACCURACY_HELP}</InfoTip></span>
            <span className="sum-acc sum-acc-white" role="cell"><b>{ws.accuracy.toFixed(1)}</b></span>
            <span aria-hidden />
            <span className="sum-acc sum-acc-black" role="cell"><b>{bs.accuracy.toFixed(1)}</b></span>
          </div>
          <div className="sum-row" role="row">
            <span className="sum-lbl" role="rowheader">Game rating <InfoTip label="Game rating">{RATING_HELP}</InfoTip></span>
            <span role="cell"><Rating est={ws.estimated_rating} rating={review.white_elo} /></span>
            <span aria-hidden />
            <span role="cell"><Rating est={bs.estimated_rating} rating={review.black_elo} /></span>
          </div>
          <div className="sum-rule" aria-hidden />
          {LABEL_ORDER.map((l) => {
            const w = ws.labels[l] ?? 0
            const b = bs.labels[l] ?? 0
            const color = { color: LABELS[l].color } as CSSProperties
            return (
              <div className="sum-row" role="row" key={l}>
                <span className="sum-lbl" role="rowheader">{LABELS[l].name}</span>
                <span className={`sum-n ${w ? '' : 'zero'}`} role="cell" style={w ? color : undefined}>{w}</span>
                <span className="sum-icon" aria-hidden><LabelIcon label={l} size={26} /></span>
                <span className={`sum-n ${b ? '' : 'zero'}`} role="cell" style={b ? color : undefined}>{b}</span>
              </div>
            )
          })}
        </div>

        <div className="start-review-wrap">
          <button type="button" className="btn btn-primary btn-start" data-testid="start-review" onClick={onStart}>Start review</button>
        </div>

        <section className="sum-section" aria-label="Overview">
          <div className="sum-card">
            <strong>{coach.title}</strong>
            <p>{coach.body}</p>
          </div>
        </section>

        {keyMoves.length > 0 && (
          <section className="sum-section key-moments" aria-label="Key moments">
            <h3 className="sum-h">Key moments</h3>
            <p className="key-explain">These percentages compare each move with the strongest move using the move-label model. The graph uses the separate Chances model.</p>
            {keyMoves.map((m) => (<div className="key-row" key={m.ply}>
              <button
                type="button"
                className="key-item"
                onClick={() => onJump(m.ply)}
                aria-label={`${m.move_number}${m.mover === 'white' ? '.' : '...'} ${m.san}, ${LABELS[m.ep_label].name.toLowerCase()}: ${pct(m.ep_best)} to ${pct(m.ep_after)}`}
              >
                <LabelIcon label={m.ep_label} size={22} />
                <span className="key-move">
                  <span><span className="key-num">{m.move_number}{m.mover === 'white' ? '.' : '…'}</span> {m.san}</span>
                  <small>{m.mover === 'white' ? white : black}</small>
                </span>
                <span className="key-drop">
                  <span className="key-pct">{pct(m.ep_best)} → <strong>{pct(m.ep_after)}</strong></span>
                  <span className="key-track" aria-hidden="true" style={{ '--lc': LABELS[m.ep_label].color, '--from': m.ep_best, '--to': m.ep_after } as CSSProperties}>
                    <span />
                  </span>
                </span>
                <svg className="key-chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {['mistake', 'miss', 'blunder'].includes(m.ep_label) && <button type="button" className="key-practice" onClick={() => onPractice(m.ply)}>Try this position before seeing the answer →</button>}
            </div>))}
          </section>
        )}

        <section className="sum-section" aria-label="Phases">
          <h3 className="sum-h">Phases <InfoTip label="Phases">Each grade summarizes move accuracy during the opening, middlegame or endgame. The number is that phase’s accuracy; a dash means there were no moves to grade.</InfoTip></h3>
          <div className="phase-grid">
            {PHASES.map(([ph, name]) => (
              <div className="phase-row" key={ph}>
                <Grade g={ws.phases?.[ph] ?? null} />
                <span className="phase-name">{name}</span>
                <Grade g={bs.phases?.[ph] ?? null} />
              </div>
            ))}
          </div>
        </section>

        <p className="fine-print">
          {(!ws.estimated_rating || !bs.estimated_rating) && 'Game rating needs at least 10 moves by each player; a dash means that player made too few moves. '}
          {converted
            ? `Chess.com ratings converted to the Lichess scale for the model (${review.white_elo} → ~${review.white_model_elo}, ${review.black_elo} → ~${review.black_model_elo}). `
            : ''}
          Stockfish depth {review.engine_depth}. Move labels use a board-focused, rating-aware model. Chances also uses available clock information.
          {(!review.headers.WhiteElo || !review.headers.BlackElo) && ' Missing player ratings were estimated as 1500.'}
          {review.moves.every((m) => m.clock_sec === null) && ' No per-move clocks were available for this game.'}
        </p>
      </div>
    </div>
  )
}
