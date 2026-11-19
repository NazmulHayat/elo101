// Short, rotating lines for the Elo101 page bubble. One line and one button
// label are picked per moment, never repeating the line shown last time.
const Elo101Lines = (() => {
  const POOLS = {
    win: {
      lines: ["Nice win 🔥", "Clean game.", "W secured.", "That's how it's done.", "GG, you cooked.",
        "Big win. Proud of you.", "Too easy?", "Smooth.", "Victory! 🏆", "You made that look easy."],
      ctas: ["Let's analyse", "See your best moves", "Relive it", "Was it perfect?", "Show me"],
    },
    loss: {
      lines: ["Tough one.", "We got you.", "Shake it off.", "It happens to everyone.", "Let's bounce back.",
        "Not your day? Let's fix it.", "Lessons incoming.", "One bad move? Let's find it.",
        "Chin up, champ.", "Next one's yours."],
      ctas: ["Free review", "Fix my mistakes", "What went wrong?", "Let's fix it", "Show me"],
    },
    draw: {
      lines: ["So close.", "Half a point.", "Was there more?", "Even fight.", "Stalemate vibes.", "A win was hiding."],
      ctas: ["Check it out", "Find the win", "Let's look", "Free review"],
    },
    streak: {
      lines: ["Rough patch?", "Let's break the streak.", "Take a breath.", "Time to level up.",
        "Same mistake again?", "Let's turn it around."],
      ctas: ["Let's level up", "Fix the pattern", "Free review"],
    },
    // Used when the game clearly ended but the result could not be read.
    neutral: {
      lines: ["GG!", "That's a wrap.", "Game over.", "How'd it go?"],
      ctas: ["Free review", "Let's analyse", "Check it out"],
    },
    paywall: {
      lines: ["Out of reviews? We got you.", "Limit hit? Not here.", "No limits here.",
        "Free review, any time.", "Still wanna review?", "We don't do limits."],
      ctas: ["Free review", "Review free", "Review it here"],
    },
  };

  function pickIndex(length, avoid) {
    if (length <= 1) return 0;
    let index = Math.floor(Math.random() * (length - 1));
    if (index >= avoid && avoid >= 0) index += 1;
    return index;
  }

  // lastShown: { [pool]: index } from storage; returns the new index to save.
  function pick(poolName, lastShown = {}) {
    const pool = POOLS[poolName] ?? POOLS.neutral;
    const index = pickIndex(pool.lines.length, lastShown[poolName] ?? -1);
    const cta = pool.ctas.length ? pool.ctas[Math.floor(Math.random() * pool.ctas.length)] : null;
    return { line: pool.lines[index], cta, index };
  }

  return { POOLS, pick };
})();
