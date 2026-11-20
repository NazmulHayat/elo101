const Elo101GameLink = (() => {
  const APP_URL = "https://elo101.vercel.app/";
  // Eight-letter Lichess pages that look like game ids.
  const LICHESS_PAGES = new Set(["analysis", "practice", "training", "tutorial", "streamer", "features",
    "password", "contacts", "calendar", "insights", "settings", "playlist",
    // Twelve letters, which would look like a game id plus a player id.
    "subscription", "notification", "broadcasters"]);

  function canonicalGameUrl(rawUrl) {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return null;
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "chess.com") {
      const gamePage = url.pathname.match(/^\/game\/(\d+)\/?$/i);
      if (gamePage) return `https://www.chess.com/game/live/${gamePage[1]}`;
      // Also matches review/analysis sub-pages, e.g. /analysis/game/live/123/analysis.
      const match = url.pathname.match(/^\/(?:game|analysis\/game)\/(live|daily)\/(\d+)(?:\/[^/]*)?\/?$/i);
      return match ? `https://www.chess.com/game/${match[1].toLowerCase()}/${match[2]}` : null;
    }

    if (host === "lichess.org") {
      // /<id>, /<id>/black, /<id><playerId> (a player's own link: 8 + 4 characters) and the same under
      // /game/, which is where Lichess now redirects player links (e.g. /game/qgA6NdTezHzz).
      const match = url.pathname.match(/^\/(?:game\/)?([a-z0-9]{8})(?:[a-z0-9]{4})?(?:\/[^/]*)?\/?$/i);
      const segment = url.pathname.replace(/^\/(?:game\/)?/, "").split("/")[0].toLowerCase();
      if (!match || LICHESS_PAGES.has(match[1].toLowerCase()) || LICHESS_PAGES.has(segment)) return null;
      return `https://lichess.org/${match[1]}`;
    }

    return null;
  }

  function chessUsername(doc) {
    const links = doc.querySelectorAll('a[href*="/member/"], a[href*="/members/"]');
    for (const link of links) {
      try {
        const match = new URL(link.href).pathname.match(/^\/members?\/([^/]+)/i);
        if (match) return match[1];
      } catch {
        // Ignore malformed page links.
      }
    }
    return null;
  }

  function destination(gameUrl, username) {
    const url = new URL(APP_URL);
    if (gameUrl?.includes("/game/daily/")) url.searchParams.set("import", "pgn");
    else {
      if (gameUrl) url.searchParams.set("game", gameUrl);
      if (username) url.searchParams.set("user", username);
    }
    return url.toString();
  }

  return { canonicalGameUrl, chessUsername, destination };
})();
