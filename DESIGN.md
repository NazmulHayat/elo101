---
name: elo101
description: Free in-browser chess game review. "Classic, made ours": a familiar board-left / panel-right review on warm neutrals, an ice-marble board, ice-blue actions and elo101's own squircle move badges.
colors:
  brand: "#3b8cff"
  brand-hover: "#5299ff"
  on-brand: "#ffffff"
  page-dark: "#1c1b19"
  topbar-dark: "#242320"
  panel-dark: "#262421"
  well-dark: "#2f2d2a"
  row-dark: "#2b2926"
  field-dark: "#1f1e1b"
  line-dark: "rgba(255,255,255,.07)"
  ink-dark: "#ffffff"
  ink-2-dark: "#c9c7c4"
  plain-move-dark: "rgba(255,255,255,.86)"
  muted-dark: "#8f8d8a"
  button-dark: "#383633"
  button-highlight-dark: "rgba(255,255,255,.06)"
  current-move-dark: "#4a4744"
  clock-idle-dark: "#2c2a27 / #8f8d8a"
  clock-active-dark: "#ffffff / #1c1b19"
  tab-track-dark: "#1f1e1b"
  tab-on-dark: "#3a3835"
  graph-black: "#403d39"
  graph-white: "#f4f3f1"
  eval-black: "#403d39"
  eval-white: "#ffffff"
  last-move-ice: "rgba(98,200,255,.5)"
  coord-on-light-ice: "#6e8fae"
  coord-on-dark-ice: "#eef3f7"
  label-brilliant: "#14b8c8"
  label-great: "#4f86f7"
  label-best: "#3fb86b"
  label-excellent: "#86c25a"
  label-good: "#9aae8f"
  label-book: "#b08d6b"
  label-inaccuracy: "#f2b33d"
  label-mistake: "#f5893b"
  label-miss: "#e0628a"
  label-blunder: "#e5383b"
typography:
  display:
    fontFamily: "Geist, Figtree, system-ui, sans-serif"
    fontSize: "46px"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, Figtree, system-ui, sans-serif"
    fontSize: "16-18px"
    fontWeight: 800
  numeral:
    fontFamily: "Geist, Figtree, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    fontFeature: "tnum"
  body:
    fontFamily: "Figtree, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  move:
    fontFamily: "Figtree"
    fontSize: "15px"
    fontWeight: 700
    fontFeature: "tnum"
  figurine:
    fontFamily: "Noto Sans Symbols 2"
    fontSize: "17px"
rounded:
  button: "10px"
  panel: "12px"
  board: "6px"
  eval-bar: "5px"
  current-move: "4px"
spacing:
  panel-padding: "16px"
  layout-gap: "24px"
  board-gutter: "28px (20px eval bar + 8px gap)"
---

# Design System: elo101

## Overview

"Classic, made ours." The review keeps the layout and label language Chess.com players already read without thinking (board left, panel right, Brilliant → Blunder), and makes everything else elo101's own: an ice-marble board, warm-neutral surfaces, ice blue for every action, and squircle move badges in elo101's palette. The site is dark only (light mode was removed on 2026-11-19).

Source of truth for values: `web/src/index.css` (tokens on `:root`), `web/src/labels.ts` (label colours), `web/src/lib/settings.ts` (board themes).

## Colour

- **Brand / action:** ice blue `#3b8cff`. Primary buttons (Retry this move, Start review, Find games), the play control, graph cursor, focus ring, winner outline, toggles and progress. Green is not an action colour; it only means "Best".
- **Surfaces:** page → top bar → panel → well (coach bubble, cards) → zebra row, all warm neutrals. Lines are 7–8% ink.
- **Move labels:** brilliant #14b8c8, great #4f86f7, best #3fb86b, excellent #86c25a, good #9aae8f, book #b08d6b, inaccuracy #f2b33d, mistake #f5893b, miss #e0628a, blunder #e5383b. Same in both themes.
- **Graph and eval bar** use the same dark/white pair in both themes so the chart reads identically everywhere.

## Typography

Figtree for UI and body; Geist 700–800 for display (headline, panel titles, coach title, accuracy numbers, brand, Start review); Noto Sans Symbols 2 only for move-list figurines and captured pieces. Numbers are tabular.

## Components

- **Buttons:** flat. `background: button`, `box-shadow: inset 0 1px 0 <highlight>, 0 0 0 1px <line>`, radius 10px, 800 weight. Primary = brand blue with a soft blue glow. No 3D bottom lip.
- **Segmented tabs:** tab track with a raised "on" pill (import sources, Chances | Engine).
- **Board:** Ice marble picture (or a flat theme), radius 6px, no frame. Coordinates inside the corner squares (rank top-left on the left file, file bottom-right on the bottom rank). Last move tinted per theme. Badge: squircle at the destination square's top-right with a drop shadow.
- **Eval bar:** 20px column left of the board, radius 5px. Shows Chances % or the engine score, following the graph tab.
- **Player bars:** 38px avatar tile with the side's king, name bold with rating muted, captured pieces and material lead, clock on the right (active clock = side to move).
- **Summary page:** title + result/moves, area graph, a `label | white | icon | black` grid (players with winner outline, accuracy boxes, game rating, ten label rows), Start review, then overview, key moments, phases, fine print.
- **Review page:** back + title + flip, coach (44px squircle, bubble with eval chip and "move **is a blunder**" headline), Retry this move / Show best, move list, Chances | Engine graph, five equal controls.
- **Move list:** Figtree 700 15px, 34px rows, zebra, 48px number column. Squircle icon only for brilliant, great, best, book, inaccuracy, mistake, miss, blunder; those moves take the label colour. Piece moves use figurines (filled for White, outlined for Black). Current move sits on the current-move fill.
- **Graph:** area chart (white share over the dark ground), mid line, notable moves as a dot on a stem to the mid line, 2px blue current cursor, dashed hover cursor, black tooltip pill with value and move.
- **Popovers / settings / tour:** panel surface, 12px radius, soft shadow with a 1px line.

## Do's and Don'ts

- Do keep label meaning and order identical to what Chess.com players expect.
- Do use brand blue only for things you can press or the current position.
- Do keep buttons flat and the board unframed.
- Don't reintroduce label colours as action colours, or green for primary buttons.
- Don't add a second evaluation switch; the graph tab drives the eval bar.
