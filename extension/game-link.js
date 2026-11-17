const Elo101GameLink = (() => {
  const APP_URL = "https://elo101.vercel.app/";

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
      const match = url.pathname.match(/^\/(?:game|analysis\/game)\/(live|daily)\/(\d+)\/?$/i);
      return match ? `https://www.chess.com/game/${match[1].toLowerCase()}/${match[2]}` : null;
    }

    if (host === "lichess.org") {
      const match = url.pathname.match(/^\/(?:game\/)?([a-z0-9]{8})(?:\/[^/]*)?\/?$/i);
      return match ? `https://lichess.org/${match[1]}` : null;
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
    if (gameUrl) url.searchParams.set("game", gameUrl);
    if (username) url.searchParams.set("user", username);
    return url.toString();
  }

  return { canonicalGameUrl, chessUsername, destination };
})();
