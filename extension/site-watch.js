// Reads coarse game state from Chess.com and Lichess pages: whether a game is
// being played, how it ended, and whether Chess.com's review paywall is up.
// Fair play: this never reads the board, the moves or the position. It only
// looks at clocks ticking, the player's own game buttons and the result text.
const Elo101Site = (() => {
  const host = location.hostname.replace(/^www\./, "");
  const site = host.endsWith("chess.com") ? "chesscom" : host === "lichess.org" ? "lichess" : null;

  const SEL = {
    chesscom: {
      clocks: ".clock-component, [class*='clock-time-monospace']",
      // Only the person playing has these. Spectators and archive pages do not.
      playerControls: "[aria-label='Resign' i], [aria-label='Abort' i], [title='Resign' i], " +
        "[data-cy*='resign' i], [data-cy*='abort' i], [class*='resign-button'], [class*='abort-button']",
      gameOver: ".game-over-modal-content, [class*='game-over-modal'], [class*='game-over-header'], " +
        "[data-cy*='game-over']",
      board: "wc-chess-board, chess-board, #board-single, #board-play-computer, .board",
      bottomName: "#board-layout-player-bottom [data-test-element='user-tagline-username'], " +
        "#board-layout-player-bottom .user-username-component, .player-bottom .user-username-component",
      topName: "#board-layout-player-top [data-test-element='user-tagline-username'], " +
        "#board-layout-player-top .user-username-component, .player-top .user-username-component",
    },
    lichess: {
      clocks: ".rclock .time",
      playerControls: ".rcontrols .ricons button, .rcontrols .resign, .rcontrols .abort",
      gameOver: ".result-wrap",
      board: ".cg-wrap",
    },
  };

  const sel = SEL[site] ?? {};
  const q = (s) => (s ? document.querySelector(s) : null);

  function clockText() {
    if (!sel.clocks) return "";
    return Array.from(document.querySelectorAll(sel.clocks), (el) => el.textContent.trim()).join("|");
  }

  function isPlayer() {
    return Boolean(q(sel.playerControls));
  }

  function bottomColor() {
    const board = q(sel.board);
    if (!board) return "white";
    if (site === "lichess") return board.classList.contains("orientation-black") ? "black" : "white";
    return board.classList.contains("flipped") ? "black" : "white";
  }

  // Returns "win" | "loss" | "draw" | "aborted" | "unknown", or null if no result is shown.
  function readResult() {
    const el = q(sel.gameOver);
    if (!el) return null;
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (!text) return null;
    if (/abort/i.test(text)) return "aborted";

    const mine = bottomColor();
    const winnerColor = (color) => (color === mine ? "win" : "loss");

    if (site === "lichess") {
      if (/white is victorious/i.test(text)) return winnerColor("white");
      if (/black is victorious/i.test(text)) return winnerColor("black");
      if (/draw|stalemate/i.test(text)) return "draw";
      if (/\b1-0\b/.test(text)) return winnerColor("white");
      if (/\b0-1\b/.test(text)) return winnerColor("black");
      if (/½-½/.test(text)) return "draw";
      return "unknown";
    }

    if (/\byou won\b/i.test(text)) return "win";
    if (/\byou lost\b/i.test(text)) return "loss";
    if (/\bdraw|stalemate|\bdrawn\b/i.test(text)) return "draw";
    if (/\bwhite won\b/i.test(text)) return winnerColor("white");
    if (/\bblack won\b/i.test(text)) return winnerColor("black");
    const name = (s) => q(s)?.textContent.trim().toLowerCase();
    const lower = text.toLowerCase();
    const bottom = name(sel.bottomName);
    const top = name(sel.topName);
    if (bottom && lower.includes(`${bottom} won`)) return "win";
    if (top && lower.includes(`${top} won`)) return "loss";
    return "unknown";
  }

  // Chess.com's "Daily limit reached" / "Get Unlimited Game Review" modal.
  // Returns the modal's bounding box, or null. We only look at it, never touch it.
  function findPaywall() {
    if (site !== "chesscom") return null;
    for (const el of document.querySelectorAll("[class*='modal']")) {
      const text = el.textContent;
      if (!/daily limit reached|unlimited game review/i.test(text)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 200 || rect.width > 900 || rect.height < 200) continue;
      return rect;
    }
    return null;
  }

  return { site, clockText, isPlayer, readResult, findPaywall };
})();
