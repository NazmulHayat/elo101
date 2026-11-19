const message = document.getElementById("message");
const reviewButton = document.getElementById("review");
let gameUrl = null;
let playerUsername = null;

chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  gameUrl = Elo101GameLink.canonicalGameUrl(tab?.url ?? "");
  if (!gameUrl) {
    message.textContent = "Open a Chess.com or Lichess game to review it.";
    reviewButton.querySelector("span").textContent = "Open Elo101";
    reviewButton.disabled = false;
    return;
  }
  if (gameUrl.includes("/game/daily/")) {
    message.textContent = "Daily games need a copied PGN. Open Elo101 to paste it.";
    reviewButton.querySelector("span").textContent = "Open PGN import";
    reviewButton.disabled = false;
    return;
  }

  if (new URL(gameUrl).hostname.endsWith("chess.com") && tab?.id != null) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const links = document.querySelectorAll('a[href*="/member/"], a[href*="/members/"]');
          for (const link of links) {
            try {
              const match = new URL(link.href).pathname.match(/^\/members?\/([^/]+)/i);
              if (match) return match[1];
            } catch { /* Ignore malformed page links. */ }
          }
          return null;
        },
      });
      playerUsername = result;
    } catch {
      // The game URL can still be handed off; Elo101 will offer its manual fallback.
    }
  }

  message.textContent = playerUsername
    ? `Ready to review ${playerUsername}'s game.`
    : "Game link ready to review.";
  reviewButton.disabled = false;
});

reviewButton.addEventListener("click", () => {
  chrome.tabs.create({ url: Elo101GameLink.destination(gameUrl, playerUsername) });
});
