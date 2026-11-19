import type { Label } from '../types'

export const LABEL_HELP: Record<Label, string> = {
  brilliant: 'A sound sacrifice that keeps your position strong.',
  great: 'A critical move when the alternatives lose meaningful chances.',
  best: 'The strongest move found by the engine.',
  excellent: 'Very close to the strongest move, with almost no chances given away.',
  good: 'A reasonable move that keeps most of your chances.',
  book: 'A move from a known opening in the opening book.',
  inaccuracy: 'Gives away a small amount of your expected score on the board.',
  mistake: 'Loses a clear chunk of your expected score on the board.',
  miss: 'Misses an opportunity to punish your opponent’s last mistake.',
  blunder: 'Gives away a large amount of your expected score on the board.',
}

export const MODE_HELP = 'Chances estimates your expected score at these players’ ratings, clocks and time control; a draw counts as half a point. Engine shows Stockfish’s evaluation in pawns (+ favors White), or a forced mate.'
export const ACCURACY_HELP = 'A score from 0 to 100 based on how much engine-estimated winning chance each move gave away. It summarizes this game, not your overall chess strength, and may differ from other sites’ accuracy scores.'
export const RATING_HELP = '“Played like a …” estimates the rating of players who typically play this well. It is an estimate from one game, not a change to your actual rating.'
