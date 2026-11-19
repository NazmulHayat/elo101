// Elo101 on Chess.com and Lichess: a review pill in the corner, a chat bubble
// when the game ends, and a free-review offer beside Chess.com's review paywall.
// Fair play: while your game is being played nothing elo101 is on screen at all.
(() => {
  if (document.getElementById("elo101-launcher")) return;

  const AVATAR = chrome.runtime.getURL("icons/icon-128.png");
  const TICK_MS = 1000;
  const END_CONFIRM_TICKS = 3; // clocks stopped and controls gone this long = game over
  const BUBBLE_MS = 12000;
  const STREAK = 3;

  // ---------- storage (fails soft: no storage = defaults, no streaks) ----------
  const prefs = { popups: true, lastShown: {}, recent: [] };
  const store = chrome.storage?.local;
  store?.get(["popups", "lastShown", "recent"]).then((saved) => {
    if (typeof saved.popups === "boolean") prefs.popups = saved.popups;
    prefs.lastShown = saved.lastShown ?? {};
    prefs.recent = Array.isArray(saved.recent) ? saved.recent : [];
  }).catch(() => {});
  chrome.storage?.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.popups) prefs.popups = changes.popups.newValue !== false;
  });
  const save = (data) => store?.set(data).catch(() => {});

  // ---------- DOM ----------
  const hostEl = document.createElement("div");
  hostEl.id = "elo101-launcher";
  hostEl.style.cssText = "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647";
  const shadow = hostEl.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    /* Off-game: bright brand-blue pill that's hard to miss. Live: quiet and dark. */
    .pill { all: unset; pointer-events: auto; position: fixed; right: 20px; bottom: 20px; display: flex;
      align-items: center; gap: 10px; height: 50px; padding: 0 20px 0 8px; border-radius: 999px;
      background: linear-gradient(180deg, #4d98ff, #2f7cf0); border: 1px solid rgba(255,255,255,.28);
      box-shadow: 0 10px 30px rgba(59,140,255,.45), 0 2px 6px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.25);
      color: #fff; font: 700 15.5px/1 Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer; white-space: nowrap; transition: transform .15s ease, box-shadow .15s ease, filter .15s ease; }
    .pill:hover { transform: translateY(-2px); filter: brightness(1.08);
      box-shadow: 0 14px 36px rgba(59,140,255,.55), 0 2px 6px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.25); }
    .pill:active { transform: translateY(0) scale(.98); }
    .pill:focus-visible, .say button:focus-visible, .x:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
    .pill img { width: 36px; height: 36px; border-radius: 11px; box-shadow: 0 0 0 2px rgba(255,255,255,.9); }
    .pill .arrow { font-size: 17px; opacity: .9; margin-left: -2px; }
    .pill::after { content: ""; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
      box-shadow: 0 0 0 0 rgba(59,140,255,.6); }
    .pill.nudge::after { animation: ring 1.6s ease-out 3; }
    @keyframes ring { 0% { box-shadow: 0 0 0 0 rgba(59,140,255,.6); } 100% { box-shadow: 0 0 0 16px rgba(59,140,255,0); } }
    .pill[hidden], .chat[hidden] { display: none; }

    .chat { pointer-events: auto; position: fixed; right: 20px; bottom: 82px; display: flex; align-items: flex-end;
      gap: 10px; animation: pop .42s cubic-bezier(.2,.9,.3,1.25) both; }
    .chat.leaving { animation: out .2s ease-in both; }
    .chat.side { flex-direction: row-reverse; }
    .avatar { width: 52px; height: 52px; flex: none; border-radius: 16px; border: 2px solid #fff;
      box-shadow: 0 8px 24px rgba(0,0,0,.45); }
    .say { position: relative; max-width: 250px; padding: 12px 30px 12px 14px; border-radius: 16px 16px 4px 16px;
      background: #262421; border: 1px solid rgba(255,255,255,.14); box-shadow: 0 14px 40px rgba(0,0,0,.5);
      color: #fff; font: 700 15.5px/1.3 Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .chat.side .say { border-radius: 16px 16px 16px 4px; }
    .say p { margin: 0; }
    .say button.cta { all: unset; display: block; margin-top: 10px; height: 36px; padding: 0 16px; border-radius: 10px;
      background: #3b8cff; color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; line-height: 36px; text-align: center;
      cursor: pointer; box-shadow: inset 0 -2px 0 rgba(0,0,0,.18); }
    .say button.cta:hover { background: #5299ff; }
    .say button.cta[hidden] { display: none; }
    .x { all: unset; position: absolute; top: 6px; right: 8px; width: 20px; height: 20px; border-radius: 6px;
      display: grid; place-items: center; color: #8f8d8a; font: 16px/1 sans-serif; cursor: pointer; }
    .x:hover { background: #383633; color: #fff; }
    @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
    @keyframes out { to { opacity: 0; transform: translateY(6px); } }
    @media (prefers-reduced-motion: reduce) { .chat, .chat.leaving, .pill.nudge::after { animation: none; } .pill { transition: none; } }
    @media (max-width: 540px) { .pill .label, .pill .arrow { display: none; } .pill { padding: 0 7px; } .say { max-width: 200px; } }
  `;

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "pill";
  pill.hidden = true;
  pill.innerHTML = `<img alt=""><span class="label">elo101</span><span class="arrow" aria-hidden="true">→</span>`;
  pill.querySelector("img").src = AVATAR;
  const pillLabel = pill.querySelector(".label");

  const chat = document.createElement("div");
  chat.className = "chat";
  chat.hidden = true;
  chat.setAttribute("role", "status");
  chat.innerHTML = `<div class="say"><button class="x" type="button" aria-label="Close">×</button>` +
    `<p></p><button class="cta" type="button"></button></div><img class="avatar" alt="elo101">`;
  chat.querySelector(".avatar").src = AVATAR;
  const chatLine = chat.querySelector("p");
  const chatCta = chat.querySelector(".cta");

  shadow.append(style, chat, pill);
  document.documentElement.append(hostEl);

  // ---------- bubble ----------
  let hideTimer = null;
  let ctaAction = null;

  function hideChat() {
    if (chat.hidden) return;
    clearTimeout(hideTimer);
    chat.classList.add("leaving");
    setTimeout(() => { chat.hidden = true; chat.classList.remove("leaving"); }, 200);
  }

  // pool: a key in Elo101Lines.POOLS. anchor: a DOMRect to sit beside, or null for the corner.
  function showChat(pool, { ms = BUBBLE_MS, anchor = null, action = openReview } = {}) {
    const { line, cta, index } = Elo101Lines.pick(pool, prefs.lastShown);
    prefs.lastShown = { ...prefs.lastShown, [pool]: index };
    save({ lastShown: prefs.lastShown });

    chatLine.textContent = line;
    chatCta.hidden = !cta;
    chatCta.textContent = cta ?? "";
    ctaAction = action;
    placeChat(anchor);
    chat.classList.remove("leaving");
    chat.hidden = false;
    chat.style.animation = "none";
    void chat.offsetHeight;
    chat.style.animation = "";
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideChat, ms);
  }

  function placeChat(anchor) {
    chat.classList.toggle("side", Boolean(anchor));
    chat.style.left = chat.style.top = chat.style.right = chat.style.bottom = "";
    if (!anchor) return;
    const width = 330;
    const spaceRight = window.innerWidth - anchor.right;
    if (spaceRight >= width + 24) {
      chat.style.left = `${Math.round(anchor.right + 14)}px`;
      chat.style.top = `${Math.round(Math.max(16, anchor.top + anchor.height * 0.3))}px`;
      chat.style.right = "auto";
      chat.style.bottom = "auto";
    } else {
      chat.classList.remove("side"); // no room beside it: use the corner, never on top of their modal
    }
  }

  chat.querySelector(".x").addEventListener("click", hideChat);
  chatCta.addEventListener("click", () => { hideChat(); ctaAction?.(); });

  // ---------- review handoff ----------
  function openReview() {
    const gameUrl = Elo101GameLink.canonicalGameUrl(location.href);
    const username = gameUrl?.includes("chess.com") ? Elo101GameLink.chessUsername(document) : null;
    window.open(Elo101GameLink.destination(gameUrl, username), "_blank", "noopener");
  }

  pill.addEventListener("click", openReview);

  // ---------- game state ----------
  let phase = "idle"; // idle -> live -> ended
  let lastClocks = "";
  let quietTicks = 0;
  let wasPlayer = false;
  let paywallShownFor = null;
  let checks = 0;

  function nudge() {
    pill.classList.remove("nudge");
    void pill.offsetWidth;
    pill.classList.add("nudge");
  }
  pill.addEventListener("animationend", () => pill.classList.remove("nudge"));

  function updatePill() {
    const wasHidden = pill.hidden;
    const gameUrl = Elo101GameLink.canonicalGameUrl(location.href);
    // Hidden during play, and until two checks have confirmed no game is in progress.
    pill.hidden = !gameUrl || phase === "live" || checks < 2;
    const daily = gameUrl?.includes("/game/daily/");
    pillLabel.textContent = daily ? "Paste daily PGN in Elo101" : "Review with Elo101";
    pill.title = daily ? "Open Elo101 to paste this daily game's PGN" : "Open this game in Elo101";
    pill.setAttribute("aria-label", pill.title);
    if (wasHidden && !pill.hidden) nudge();
  }

  function outcomeToPool(result) {
    if (result === "win" || result === "loss" || result === "draw") {
      prefs.recent = [...prefs.recent, result].slice(-5);
      save({ recent: prefs.recent });
      const tail = prefs.recent.slice(-STREAK);
      if (result === "loss" && tail.length === STREAK && tail.every((r) => r === "loss")) return "streak";
      return result;
    }
    return "neutral";
  }

  function onGameEnd(result) {
    phase = "ended";
    updatePill();
    nudge();
    if (!wasPlayer || result === "aborted" || !prefs.popups) return;
    // Let the site's own result screen land first.
    setTimeout(() => showChat(outcomeToPool(result)), 1500);
  }

  function tick() {
    if (!hostEl.isConnected) { clearInterval(timer); return; }
    if (checks < 2 && ++checks === 2) updatePill();

    const clocks = Elo101Site.clockText();
    const ticking = clocks !== "" && lastClocks !== "" && clocks !== lastClocks;
    lastClocks = clocks;
    const player = Elo101Site.isPlayer();
    const result = Elo101Site.readResult();
    const live = (ticking || player) && result === null;

    if (live) {
      quietTicks = 0;
      wasPlayer = wasPlayer || player;
      if (phase !== "live") {
        phase = "live";
        hideChat();
        updatePill();
      }
    } else if (phase === "live") {
      if (result !== null) onGameEnd(result);
      else if (++quietTicks >= END_CONFIRM_TICKS) onGameEnd("unknown");
    }

    if (prefs.popups && phase !== "live") {
      const paywall = Elo101Site.findPaywall();
      if (paywall && paywallShownFor !== location.pathname) {
        paywallShownFor = location.pathname;
        showChat("paywall", { anchor: paywall, ms: 20000 });
      }
    }
  }

  // Both sites change routes without reloading; reset per game.
  let lastPath = location.pathname;
  function onRoute() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    // Chess.com moves from /play/online to /game/<id> as a game starts; keep a live game live.
    if (phase === "ended") { phase = "idle"; wasPlayer = false; }
    updatePill();
  }

  updatePill();
  const timer = setInterval(() => { onRoute(); tick(); }, TICK_MS);
})();
