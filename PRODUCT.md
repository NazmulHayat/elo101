# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: club and online players (roughly 800–1800) reviewing one of their own games right after playing it, usually on a laptop. They want to know where the game turned, which of their moves were bad, and what they should have played.

Secondary (not designed for first): recruiters and engineers arriving from the README who try the sample game.

## Product Purpose

elo101 is a free chess game review that runs entirely in the browser. It labels every move Chess.com-style (Brilliant → Blunder), reports accuracy and a game rating, and lets the player retry their mistakes on the board. Success: a player imports a game, understands its turning points in a minute, and retries at least one mistake.

## Positioning

Moves are judged by **board-focused expected points at the players' rating**, while the separate "Chances" view uses available clocks and time control to estimate expected score. The "Engine" view shows raw Stockfish.

## Operating Context

- Import: Chess.com username, Lichess username, or pasted PGN; or a built-in sample (Morphy's Opera Game).
- Analysis: Stockfish WASM runs locally; takes about a minute with a progress readout.
- Summary: result, coach line, eval/chances graph, accuracy per player, game rating, label counts.
- Review: board with eval bar, player bars with clocks and captured pieces, coach bubble per move, graph with label markers, move list, nav controls, Retry, a playable explanation line and variation, Next mistake, Show best.
- Keyboard: ← → Home End, Space play, F flip. Settings: board theme (Ice marble default), sounds, light/dark.

## Capabilities and Constraints

- React 19 + Vite + react-chessboard; plain CSS in `web/src/index.css` (no Tailwind). Hosted on Vercel.
- No account; analysis runs locally. Importing public game links contacts Chess.com or Lichess from the browser.
- Must stay familiar to Chess.com users: the move-label meaning and order (Brilliant !!, Great !, Best ★, … Blunder ??) and the board-left / panel-right review layout.

## Brand Commitments

- Name: elo101. Knight on an ice-blue tile, `web/public/favicon.svg`.
- Brand colour: ice blue `#3b8cff`, used for actions.
- Move labels use elo101's own palette and squircle icons (see `DESIGN.md`); their meaning, glyphs and order stay familiar to Chess.com users and are binding.

## Evidence on Hand

- Benchmark results and figures in `docs/benchmark.md`, `docs/images/`.
- No testimonials, user counts, or press exist; do not invent any.

## Product Principles

1. The board and the player's own mistakes are the point; everything else supports them.
2. Show the rating-aware "chances" idea; it is the reason elo101 exists.
3. Familiar where players rely on habit (labels, layout), distinct everywhere else.
4. Fast and local: no sign-up wall, no waiting UI that hides progress.
