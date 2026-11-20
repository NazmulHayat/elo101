import { useEffect, useRef, type ReactNode } from 'react'
import { BOARD_THEMES, type BoardThemeSpec } from '../lib/settings'
import type { Label } from '../types'
import { LABELS } from '../labels'
import { ThemedBoard } from './BoardArea'
import { LabelIcon } from './LabelIcon'
import { AddToChrome, STORE_URL } from './ChromeExtension'

const BASE = import.meta.env.BASE_URL
const GITHUB = 'https://github.com/NazmulHayat/elo101'

// Morphy's Opera Game before 13.Rxd7: Stockfish +5.2, but the win needs a rook and a queen sacrifice.
// The Opera Game's final position, after 17.Rd8#: the finished game the extension preview shows.
const MATE_FEN = '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17'
const MATE_MOVES = [['15.', 'Bxd7+', 'Nxd7'], ['16.', 'Qb8+', 'Nxb8'], ['17.', 'Rd8#', '']]

const DEEP_FEN = '3rkb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR3R w k - 3 13'
// White's chance of winning there in a 10-minute game, from the Chances model (ep_model/models_finetuned).
const CHANCES = [
  { who: 'Two 2400s', note: 'They see it', pct: 93 },
  { who: 'Two 1600s', note: 'Some of the time', pct: 84 },
  { who: 'Two 800s', note: 'Usually miss it', pct: 69, low: true },
]

// Opera Game reviewed at 1500 vs 1500, 10+0: White's chances after each ply, and the labelled moves.
const OPERA = [54.5, 54.1, 53.1, 54.6, 56.2, 55.5, 61.8, 61.5, 67.6, 66.1, 67.8, 63.9, 69.8, 69.6, 70.0, 69.0, 68.9, 68.4,
  72.5, 73.4, 82.4, 85.4, 82.0, 82.7, 87.2, 82.0, 89.2, 89.0, 91.9, 92.1, 96.9, 98.0, 98.1, 100.0]
type Mark = { ply: number; san: string; label: Label; note?: string }
const MARKS: Mark[] = [
  { ply: 6, san: '3…Bg4', label: 'inaccuracy' }, { ply: 8, san: '4…Bxf3', label: 'inaccuracy' },
  { ply: 12, san: '6…Nf6', label: 'inaccuracy' }, { ply: 18, san: '9…b5', label: 'inaccuracy' },
  { ply: 20, san: '10…cxb5', label: 'mistake', note: 'Opens the b-file for White' },
  { ply: 24, san: '12…Rd8', label: 'inaccuracy' }, { ply: 26, san: '13…Rxd7', label: 'inaccuracy' },
  { ply: 27, san: '14.Rd1', label: 'great', note: 'The quiet move that wins' },
  { ply: 30, san: '15…Nxd7', label: 'inaccuracy' },
  { ply: 31, san: '16.Qb8+', label: 'brilliant', note: 'Gives up the queen. Mate next move.' },
]

function TurnGraph({ narrow }: { narrow: boolean }) {
  const w = 1000
  const h = narrow ? 560 : 300
  const bottom = h - (narrow ? 56 : 32)
  const fs = narrow ? 28 : 13
  const icon = narrow ? 44 : 24
  const pad = narrow ? 18 : 12
  const x = (i: number) => (i * w) / (OPERA.length - 1)
  const y = (v: number) => (1 - v / 100) * bottom
  const area = `M0 ${bottom} ${OPERA.map((v, i) => `L${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} L${w} ${bottom}Z`
  return (
    <svg className={narrow ? 'turn-graph turn-graph-narrow' : 'turn-graph turn-graph-wide'} viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label="White's chances over Morphy's Opera Game, rising from 55% to a win, with every labelled move">
      <defs><clipPath id={`tg-${narrow ? 'n' : 'w'}`}><rect width={w} height={bottom} rx={8} /></clipPath></defs>
      <g clipPath={`url(#tg-${narrow ? 'n' : 'w'})`}>
        <rect width={w} height={bottom} fill="var(--graph-black)" />
        <path d={area} fill="var(--graph-white)" />
      </g>
      <line x1={0} x2={w} y1={y(50)} y2={y(50)} stroke="#8f8d8a" strokeDasharray="5 5" strokeWidth={1.2} opacity={0.8} />
      {[1, 5, 10, 15].map((n) => (
        <text key={n} x={x((n - 1) * 2 + 1)} y={h - 6} textAnchor={n === 1 ? 'start' : 'middle'} fontSize={fs} fill="var(--muted)">{n === 1 ? 'Move 1' : n}</text>
      ))}
      {MARKS.map((m) => {
        const cx = Math.min(x(m.ply), w - icon / 2)
        const cy = Math.max(y(OPERA[m.ply]), icon / 2)
        const color = LABELS[m.label].color
        const big = m.label !== 'inaccuracy'
        return (
          <g key={m.ply}>
            <title>{`${m.san}: ${LABELS[m.label].name}`}</title>
            <line x1={cx} x2={cx} y1={cy} y2={y(50)} stroke={color} strokeWidth={big ? 2 : 1.5} opacity={big ? 1 : 0.8} />
            {big
              ? <svg x={cx - icon / 2} y={cy - icon / 2} width={icon} height={icon} viewBox="0 0 20 20"><LabelIcon label={m.label} size={20} /></svg>
              : <circle cx={cx} cy={cy} r={narrow ? 9 : 5.5} fill={color} stroke="var(--panel)" strokeWidth={2} />}
          </g>
        )
      })}
      <text x={pad} y={fs + pad - 2} fontSize={fs} fontWeight={700} fill="var(--ink-2)">Black winning</text>
      <text x={pad} y={bottom - pad} fontSize={fs} fontWeight={700} fill="#6f6c68">White winning</text>
    </svg>
  )
}

export function Home({ theme, children }: { theme: BoardThemeSpec; children: ReactNode }) {
  const video = useRef<HTMLVideoElement>(null)
  const importRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const v = video.current
    if (!v || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    v.pause()
    v.controls = true
  }, [])

  const toImport = () => {
    const box = importRef.current
    if (!box) return
    box.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    box.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus({ preventScroll: true })
  }

  return (
    <div className="home">
      <section className="home-hero home-wrap">
        <div className="home-hero-top">
          <div className="home-hero-copy">
            <h1>Review your chess game. Free.</h1>
            <p className="home-lede">See your best moves and your blunders, then try them again.</p>
            <div className="home-ext">
              <AddToChrome />
              <span>Adds a Review button to Chess.com and Lichess</span>
            </div>
          </div>
          <div className="home-import" ref={importRef}>{children}</div>
        </div>
        <figure className="home-video">
          <video ref={video} src={`${BASE}home/review.mp4`} poster={`${BASE}home/poster.jpg`} autoPlay muted loop playsInline preload="metadata"
            aria-label="Recording of an elo101 review: the summary, stepping through the moves, a blunder, then Retry and the correct move" />
        </figure>
      </section>

      <section className="home-band home-wrap" id="chances">
        <div className="home-head">
          <h2>The same position isn't the same for everyone</h2>
          <p>Stockfish gives one number. elo101 tells you how often players at your level actually win from here.</p>
        </div>
        <div className="chances-demo">
          <figure className="chances-board">
            <div className="board">
              <ThemedBoard theme={theme} id="home-chances-board" position={DEEP_FEN} arePiecesDraggable={false} areArrowsAllowed={false} />
            </div>
            <figcaption><span className="chances-sf">+5.2</span><span><b>White to play.</b> The win takes a rook sacrifice, then a queen sacrifice, four moves deep.</span></figcaption>
          </figure>
          <div>
            <ul className="chances-list" aria-label="White's chance of winning from this position">
              {CHANCES.map((c) => (
                <li key={c.who} className={c.low ? 'low' : undefined}>
                  <div><b>{c.who}</b><span>{c.note}</span></div>
                  <div className="chances-pct">{c.pct}%</div>
                  <div className="chances-bar"><i style={{ width: `${c.pct}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="chances-note">White's chance of winning in a 10-minute game, from elo101's Chances model, trained on millions of real Lichess games. Position: Morphy's Opera Game, before 13.Rxd7.</p>
          </div>
        </div>
      </section>

      <section className="home-band home-wrap">
        <div className="home-head">
          <h2>See the moment your game turned</h2>
          <p>Your chances after every move, with every label on the line.</p>
        </div>
        <div className="turn-card">
          <TurnGraph narrow={false} />
          <TurnGraph narrow />
        </div>
        <ul className="turn-moments">
          {MARKS.filter((m) => m.note).map((m) => (
            <li key={m.ply}><LabelIcon label={m.label} size={22} /><span><b>{m.san}</b> {LABELS[m.label].name}. {m.note}</span></li>
          ))}
        </ul>
      </section>

      <section className="home-band home-wrap">
        <div className="home-head">
          <h2>Learn from the move you'd take back</h2>
          <p>The coach tells you what went wrong. Then you find the better move yourself.</p>
        </div>
        <div className="home-shots">
          <figure>
            <img src={`${BASE}home/shot-blunder.jpg`} width={2560} height={1440} loading="lazy" alt="elo101 review: Bxd1 is a blunder, allows mate in 2, Nxe5 was best, with a Retry button" />
            <figcaption><b>See what went wrong</b><span>Every move gets a label and a plain explanation.</span></figcaption>
          </figure>
          <figure>
            <img src={`${BASE}home/shot-correct.jpg`} width={2560} height={1440} loading="lazy" alt="elo101 Retry mode: Nxe5 is correct, the strongest move Stockfish found" />
            <figcaption><b>Then get it right</b><span>Retry on the board until you find the move.</span></figcaption>
          </figure>
        </div>
      </section>

      <section className="home-band home-wrap" id="extension">
        <div className="ext-card">
          <div className="ext-copy">
            <h2>Review straight from Chess.com and Lichess with the Chrome extension</h2>
            <p>When your game ends, an elo101 button appears on the page. One click opens the full review. It stays out of the way while you play, and it's free.</p>
            <ol className="ext-steps">
              <li><span>Add elo101 to Chrome</span></li>
              <li><span>Finish a game on Chess.com or Lichess</span></li>
              <li><span>Click <b>Review</b></span></li>
            </ol>
            <AddToChrome className="btn-lg" />
          </div>
          <div className="ext-demo" aria-hidden="true">
            <div className="ext-page">
              <div className="ext-page-bar"><i /><i /><i /><span>Your game · 10 min</span></div>
              <div className="ext-page-body">
                <div className="ext-game">
                  <div className="ext-player"><b className="ext-avatar dark">♚</b><span>Opponent <em>(1488)</em></span><time>1:12</time></div>
                  <div className="ext-board">
                    <ThemedBoard theme={BOARD_THEMES.green} id="home-ext-board" position={MATE_FEN} arePiecesDraggable={false} areArrowsAllowed={false} />
                    <div className="ext-result"><strong>You won!</strong><span>by checkmate</span></div>
                  </div>
                  <div className="ext-player"><b className="ext-avatar">♔</b><span>You <em>(1503)</em></span><time className="on">4:36</time></div>
                </div>
                <div className="ext-side">
                  <p className="ext-side-head">Moves</p>
                  <ol>{MATE_MOVES.map(([n, w, b]) => <li key={n}><span>{n}</span><span>{w}</span><span>{b}</span></li>)}</ol>
                  <p className="ext-side-score">1–0</p>
                </div>
              </div>
              <div className="ext-corner">
                <div className="ext-bubble">Nice win 🔥 Let's analyse</div>
                <div className="ext-pill"><img src={`${BASE}favicon.svg`} alt="" width={22} height={22} /><span>Review with Elo101</span><i>→</i></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-closing">
        <div className="home-wrap home-closing-in">
          <div>
            <h2>Your last game is waiting</h2>
            <p>Free, no account, and everything runs on your computer. Tested against Lichess and Chess.com on thousands of real games. <a href={GITHUB} target="_blank" rel="noopener noreferrer">See how we built it</a></p>
          </div>
          <button type="button" className="btn btn-primary home-cta" onClick={toImport}>Review a game</button>
        </div>
      </section>

      <footer className="home-footer home-wrap">
        <span>elo101 is free and open source.</span>
        <nav aria-label="Guides and links">
          <a href={`${BASE}free-chess-game-review/`}>Free game review</a>
          <a href={`${BASE}chess-com-game-review/`}>Chess.com review</a>
          <a href={`${BASE}lichess-game-review/`}>Lichess review</a>
          <a href={`${BASE}chess-move-labels/`}>Move labels</a>
          <a href={`${BASE}how-it-works/`}>How it works</a>
          <a href={STORE_URL} target="_blank" rel="noopener">Chrome extension</a>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
          <a href={GITHUB} target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  )
}
