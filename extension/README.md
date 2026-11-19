# Elo101 Game Review extension

A Manifest V3 Chrome extension that places a small Elo101 button on Chess.com and Lichess. When you finish a game it pops a short chat bubble ("Nice win 🔥 · Let's analyse"), and it offers a free review beside Chess.com's "Daily limit reached" popup. It shows nothing at all while your game is in progress: it never reads the board or moves, only whether clocks are ticking, your own resign/abort buttons and the result text. Bubbles can be turned off in the toolbar popup. On a game page, the button opens Elo101 with the canonical game URL in the `game` query parameter. The toolbar popup offers the same handoff. On Chess.com it also passes a player name when found on the current page.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `extension/` directory.
4. Open a completed game on Chess.com or Lichess and select the Elo101 button in the bottom-right corner, or use the extension icon.

The app imports the game and runs the existing review algorithms in the browser. Chess.com live games require a username for public archive lookup; if it cannot be found automatically, the app asks for it. Daily links currently require pasted PGN.

## Store package

From the `extension/` directory, create a ZIP containing the manifest, popup files, `game-link.js`, `coach-lines.js`, `site-watch.js`, `page-button.js`, and `icons/` directory. The 128px PNG icon is required for the Chrome Web Store. Store listing copy and submission notes are in `store/CHROME_WEB_STORE.md`.

## Files

- `game-link.js`: turns a page URL into a canonical game link and the Elo101 destination.
- `site-watch.js`: coarse game state per site (clocks ticking, player controls, result, Chess.com paywall). Selectors live in one `SEL` table.
- `coach-lines.js`: the rotating short lines and button labels.
- `page-button.js`: the pill and chat bubble (closed shadow DOM) and the idle → live → ended state machine.

## Manual test

1. Lichess: play a quick game against the computer or a friend. Expect nothing from elo101 on screen during play, then the blue pill and a bubble about 1.5 s after the result.
2. Chess.com: play a 1-minute game, then resign or flag. Same as above; lose 3 in a row to see the streak line.
3. Chess.com: open a game review after the daily free review is used up. The bubble sits to the right of the "Daily limit reached" modal.
4. Watch a game on Lichess TV: no bubbles.
5. Toolbar popup: untick "Pop up after games"; no more bubbles.
