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
    const match = url.pathname.match(/^\/(?:game|analysis\/game)\/(live|daily)\/(\d+)\/?$/i);
    if (!match) return null;
    return `https://www.chess.com/game/${match[1].toLowerCase()}/${match[2]}`;
  }

  if (host === "lichess.org") {
    const match = url.pathname.match(/^\/([a-z0-9]{8})(?:\/[^/]*)?\/?$/i);
    if (!match) return null;
    return `https://lichess.org/${match[1]}`;
  }

  return null;
}

const message = document.getElementById("message");
const reviewButton = document.getElementById("review");
let gameUrl = null;
let playerUsername = null;

chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  gameUrl = canonicalGameUrl(tab?.url ?? "");
  if (!gameUrl) {
    message.textContent = "Open a completed Chess.com or Lichess game to start a review.";
    return;
  }

  if (new URL(gameUrl).hostname.endsWith("chess.com") && tab?.id != null) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const links = [...document.querySelectorAll('a[href*="/member/"], a[href*="/members/"]')];
          const match = links.map((link) => new URL(link.href).pathname.match(/^\/members?\/([^/]+)/i)).find(Boolean);
          return match?.[1] ?? null;
        },
      });
      playerUsername = result;
    } catch {
      // The game URL can still be handed off; Elo101 will offer its manual fallback.
    }
  }

  message.textContent = playerUsername
    ? `Game found for ${playerUsername}. Open it in Elo101 for your review.`
    : "Game found. Open it in Elo101 for your review.";
  reviewButton.disabled = false;
});

reviewButton.addEventListener("click", () => {
  if (!gameUrl) return;
  const destination = new URL(APP_URL);
  destination.searchParams.set("game", gameUrl);
  if (playerUsername) destination.searchParams.set("user", playerUsername);
  chrome.tabs.create({ url: destination.toString() });
});
