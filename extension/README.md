# Elo101 Game Review extension

A small Manifest V3 Chrome extension that recognizes completed game pages on Chess.com and Lichess, then opens Elo101 with the canonical game URL in the `game` query parameter.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `extension/` directory.
4. Open a completed game on Chess.com or Lichess and select the Elo101 extension icon.

The extension opens `https://elo101.vercel.app/?game=<encoded-canonical-game-url>` in a new tab.
