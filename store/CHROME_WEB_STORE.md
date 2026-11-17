# Chrome Web Store submission copy

## Listing

Name: Elo101 Game Review

Short description: Open completed Chess.com or Lichess games in elo101 for a free, local move review.

Detailed description:
Review a completed chess game in elo101 with one click.

Open a completed Chess.com or Lichess game, click the Elo101 icon, and select Review game. Elo101 opens in a new tab, imports the game, then analyzes it with Stockfish and its rating-aware review models in your browser. Explore the turning points, move labels, accuracy, and retry your mistakes.

No elo101 account is required. The extension does not run on every page or monitor your browsing in the background. It only checks the active page when you open its popup.

Chess.com public game lookup may need a player username. Daily games are not supported by the link importer yet; you can paste their PGN in elo101.

Elo101 is independent and is not affiliated with Chess.com or Lichess.

Category: Productivity
Language: English
Homepage: https://elo101.vercel.app/
Privacy policy: https://elo101.vercel.app/privacy.html
Support: https://github.com/NazmulHayat/elo101/issues

## Privacy tab

Single purpose: Open the currently viewed completed Chess.com or Lichess game in elo101 for browser-based chess review.

Permission justifications:
- activeTab: Read the current tab URL only after the user opens the extension popup, to identify a supported game.
- scripting: On Chess.com, read a player name from the current game page after the popup opens, so the app can find that game in public archives.

Data handling: The extension reads the current game URL and, for Chess.com, may read a player name from page links. When the user selects Review game, it opens elo101.vercel.app with those values in the URL. The app fetches public game data directly from Chess.com or Lichess, analyzes it locally, and saves recent PGNs and preferences in the browser's local storage. No advertising or analytics are used.

The extension does not collect credentials, payment data, or browsing history, and does not sell user data.

## Test instructions

1. Open a completed public Lichess game, such as https://lichess.org/nMuWq0F1.
2. Click the extension icon and select Review game.
3. Elo101 opens in a new tab, imports the PGN, and shows analysis progress followed by a review.
4. For Chess.com, open a completed standard live game. If player detection fails, enter either player's username in the Game link form. Daily games require PGN paste.

## Submission checklist

- Deploy the web app privacy page before submitting, and verify the privacy URL is public.
- Install this exact ZIP unpacked in Chrome and test Lichess and Chess.com handoff.
- Capture at least one genuine 1280x800 or 640x400 product screenshot for the store listing.
- Upload the ZIP, complete Store Listing, Privacy, Distribution and Test instructions, then submit for review.
