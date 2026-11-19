import { highlight } from '../lib/highlight'
import type { BoardThemeSpec } from '../lib/settings'
import { ThemedBoard } from './BoardArea'

// Final position of the sample game: Légal's mate, 7.Nd5#.
const SAMPLE_MATE = 'r2q1bnr/ppp1kBpp/2np4/3NN3/4P3/8/PPPP1PPP/R1BbK2R b KQ - 2 7'

export function Welcome({ theme }: { theme: BoardThemeSpec }) {
  return (
    <div className="welcome">
      <h1>Free game review, right in your browser</h1>
      <p className="welcome-pitch">See where your game turned, what you should have played, and retry your mistakes with Stockfish. Labels judge board quality at your rating; Chances estimates the result using available clocks. Everything runs on your computer.</p>
      <figure className="welcome-board">
        <div className="board">
          <ThemedBoard
            theme={theme}
            id="welcome-board"
            position={SAMPLE_MATE}
            arePiecesDraggable={false}
            areArrowsAllowed={false}
            customSquareStyles={{ c3: highlight(), d5: highlight() }}
          />
        </div>
        <figcaption>The sample game ends in Légal’s mate: <strong>7.Nd5#</strong></figcaption>
      </figure>
      <section className="method-summary" aria-label="How the review works">
        <h2>How your review is judged</h2>
        <p><strong>Move labels</strong> compare your move with Stockfish’s best at your rating. <strong>Chances</strong> estimates the expected result using ratings and available clocks. <strong>Accuracy</strong> summarizes engine-based move quality; game rating estimates one-game performance from it.</p>
        <a href="https://github.com/NazmulHayat/ChessCoach/blob/main/docs/methodology.md" target="_blank" rel="noopener noreferrer">Read the methodology ↗</a>
      </section>
    </div>
  )
}
