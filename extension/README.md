# Elo101 Game Review extension

A Manifest V3 Chrome extension that recognizes completed Chess.com and Lichess game pages, then opens elo101 with the canonical game URL in the `game` query parameter. On Chess.com it also passes a player name when found on the current page.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `extension/` directory.
4. Open a completed game on Chess.com or Lichess and select the Elo101 extension icon.

The app imports the game and runs the existing review algorithms in the browser. Chess.com live games require a username for public archive lookup; if it cannot be found automatically, the app asks for it. Daily links currently require pasted PGN.

## Store package

From the repository root, create a ZIP containing only the manifest, popup files, and `icons/` directory. The 128px PNG icon is required for the Chrome Web Store. Store listing copy and submission notes are in `store/CHROME_WEB_STORE.md`.
