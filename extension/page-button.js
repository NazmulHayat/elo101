(() => {
  if (document.getElementById("elo101-launcher")) return;

  const host = document.createElement("div");
  host.id = "elo101-launcher";
  host.style.cssText = "all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647";
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    button { all: unset; display: flex; align-items: center; gap: 8px; min-height: 38px;
      padding: 0 13px 0 10px; border: 1px solid #cbd9cf; border-radius: 8px;
      background: #fff; box-shadow: 0 3px 12px #102a1a24; color: #17261d;
      font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer; white-space: nowrap; }
    button:hover { background: #f2f8f3; border-color: #72a885; }
    button:focus-visible { outline: 3px solid #4f9d69; outline-offset: 3px; }
    .mark { width: 21px; height: 21px; display: grid; place-items: center; border-radius: 5px;
      background: #195e3a; color: white; font: 16px/1 Georgia, serif; }
    @media (max-width: 540px) { button { padding-right: 10px; } .label { display: none; } }
  `;
  const button = document.createElement("button");
  button.type = "button";
  button.innerHTML = '<span class="mark" aria-hidden="true">♞</span><span class="label"></span>';
  const label = button.querySelector(".label");

  function update() {
    const gameUrl = Elo101GameLink.canonicalGameUrl(location.href);
    host.style.display = gameUrl ? "block" : "none";
    const daily = gameUrl?.includes("/game/daily/");
    label.textContent = daily ? "Paste daily PGN in Elo101" : "Review with Elo101";
    button.title = daily ? "Open Elo101 to paste this daily game's PGN" : "Open this game in Elo101";
    button.setAttribute("aria-label", button.title);
  }

  button.addEventListener("click", () => {
    const gameUrl = Elo101GameLink.canonicalGameUrl(location.href);
    const username = gameUrl?.includes("chess.com") ? Elo101GameLink.chessUsername(document) : null;
    window.open(Elo101GameLink.destination(gameUrl, username), "_blank", "noopener");
  });

  shadow.append(style, button);
  document.documentElement.append(host);
  update();

  // Both chess sites change routes without always reloading the document.
  let lastUrl = location.href;
  const timer = setInterval(() => {
    if (!host.isConnected) {
      clearInterval(timer);
      return;
    }
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      update();
    }
  }, 1000);
})();
