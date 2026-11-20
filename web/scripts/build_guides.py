"""Static, crawlable guide pages for search engines.

Writes web/public/<slug>/index.html for each page below and regenerates web/public/sitemap.xml.
The app itself is a single JavaScript page; these give Google real text for the searches people make
("free chess game review", "chess.com game review", "what does miss mean in chess"...).

    python3 web/scripts/build_guides.py
"""

from __future__ import annotations

import html
import json
from datetime import date
from pathlib import Path

SITE = "https://elo101.vercel.app"
PUBLIC = Path(__file__).resolve().parents[1] / "public"
GITHUB = "https://github.com/NazmulHayat/elo101"
TODAY = date.today().isoformat()

NAV = [
    ("free-chess-game-review", "Free game review"),
    ("chess-com-game-review", "Chess.com"),
    ("lichess-game-review", "Lichess"),
    ("chess-move-labels", "Move labels"),
    ("how-it-works", "How it works"),
]

LABEL_ROWS = [
    ("brilliant", "Brilliant", "!!", "The best move, and a real sacrifice: your opponent takes the material, you stay material down, and the position still holds. Rare: about once in 40 games."),
    ("great", "Great", "!", "The only good move, or the one move that keeps you winning (or keeps you from losing)."),
    ("best", "Best", "★", "The engine's top move."),
    ("excellent", "Excellent", "", "Not the top move, but gives away less than 2% of your expected score."),
    ("good", "Good", "", "Gives away 2–5% of your expected score."),
    ("book", "Book", "", "A known opening move."),
    ("inaccuracy", "Inaccuracy", "?!", "Gives away 5–10%."),
    ("mistake", "Mistake", "?", "Gives away 10–20%."),
    ("miss", "Miss", "", "Your opponent just made a mistake and you didn't take advantage of it."),
    ("blunder", "Blunder", "??", "Gives away 20% or more of your expected score."),
]


def label_table() -> str:
    rows = "".join(
        f'<tr><td><span class="pill {k}">{html.escape(sym + " " if sym else "")}{name}</span></td><td>{html.escape(text)}</td></tr>'
        for k, name, sym, text in LABEL_ROWS
    )
    return f'<div class="tablewrap"><table><thead><tr><th>Label</th><th>What it means</th></tr></thead><tbody>{rows}</tbody></table></div>'


CTA = '<p class="cta-row"><a class="btn" href="/">Review a game now</a><span>Free · no account · runs in your browser</span></p>'

SHOTS = """
<div class="shots">
  <figure><img src="/home/shot-blunder.jpg" width="2560" height="1440" loading="lazy" alt="elo101 game review: Bxd1 is labelled a blunder that allows mate in 2, Nxe5 was best, with a Retry button"><figcaption>Every move gets a label and a plain explanation.</figcaption></figure>
  <figure><img src="/home/shot-correct.jpg" width="2560" height="1440" loading="lazy" alt="elo101 Retry mode: Nxe5 is correct, the strongest move Stockfish found"><figcaption>Then retry the position until you find the better move.</figcaption></figure>
</div>"""

PAGES = [
    {
        "slug": "free-chess-game-review",
        "title": "Free Chess Game Review: Unlimited, No Account · elo101",
        "description": "Review unlimited chess games free. Import from Chess.com, Lichess or PGN, see every move labelled Brilliant to Blunder, check accuracy and retry mistakes.",
        "h1": "Free chess game review, as many games as you like",
        "lede": "Import a game from Chess.com, Lichess or a PGN, and elo101 labels every move, shows both players' accuracy and the moment the game turned, then lets you retry your mistakes. No account, no daily limit.",
        "body": f"""
{CTA}
<h2>What you get</h2>
<ul class="ticks">
  <li><b>Every move labelled</b> from Brilliant to Blunder, judged for players of your rating, with the better move shown on the board.</li>
  <li><b>A plain explanation</b> of what went wrong, such as "allows mate in 2", and what was best instead.</li>
  <li><b>Accuracy and game rating</b> for both players.</li>
  <li><b>A chances graph</b> showing who was likely to win after every move.</li>
  <li><b>Retry mode:</b> jump back to your mistakes and find the better move yourself.</li>
  <li><b>Works on your phone</b> and on any computer with a modern browser.</li>
</ul>
{SHOTS}
<h2>How to review a game</h2>
<ol class="steps">
  <li><b>Open <a href="/">elo101</a>.</b> Nothing to install or sign up for.</li>
  <li><b>Pick your game.</b> Type your Chess.com or Lichess username and choose a recent game, paste a game link, or paste a PGN.</li>
  <li><b>Read the review.</b> Step through the moves, open the summary, and press Retry on any mistake.</li>
</ol>
<h2>Why it's free and unlimited</h2>
<p>The chess engine (Stockfish 18) runs inside your browser, using your own computer's processor. There's no server analysing your games, so there's nothing to ration. Your games are never uploaded for analysis.</p>
<h2>Labels for your level, not a grandmaster's</h2>
<p>Most reviews give one engine score whoever is playing. elo101 learned from millions of real Lichess games how often players at each rating actually win from a position, and judges moves by that. A move that throws away a win for a 1200 player is labelled like it. <a href="/how-it-works/">How it works →</a></p>
""",
        "faq": [
            ("Is elo101 really free and unlimited?", "Yes. There's no account, no subscription and no daily limit. The analysis runs on your own device, so reviewing more games costs nothing."),
            ("Do I need an account?", "No. Type a Chess.com or Lichess username to list recent public games, paste a game link, or paste a PGN."),
            ("How accurate is it?", "On a fixed benchmark of 450 real games, every blunder elo101 flags is also a blunder on Lichess, and all 64 hand-checked test positions get the right label. Accuracy scores use Lichess's published formula and land within about 3 points of Lichess's."),
            ("Are my games uploaded?", "No. Games are fetched from Chess.com or Lichess and analysed in your browser. The site uses anonymous usage analytics; see the privacy page."),
            ("Which chess engine does it use?", "Stockfish 18, compiled to WebAssembly so it runs in the browser on every CPU core."),
        ],
    },
    {
        "slug": "chess-com-game-review",
        "title": "Free Chess.com Game Review With No Daily Limit · elo101",
        "description": "Review Chess.com games free, with no daily limit. Enter your username, pick a game and see Brilliant, Great, Miss and Blunder moves, plus accuracy.",
        "h1": "Review your Chess.com games for free",
        "lede": "Enter your Chess.com username, pick a game, and get a full review: every move labelled with the same names Chess.com uses, accuracy for both players, a chances graph and a retry mode. No daily limit.",
        "body": f"""
{CTA}
<h2>Three ways to bring in a Chess.com game</h2>
<ol class="steps">
  <li><b>By username.</b> Choose the Chess.com tab on <a href="/">elo101</a>, type your username and pick from your recent games.</li>
  <li><b>By link.</b> Paste a <code>chess.com/game/live/…</code> link. elo101 asks for one of the players' usernames to find it in Chess.com's public archive.</li>
  <li><b>With the Chrome extension.</b> When your game ends, an elo101 button appears on Chess.com. One click opens the review. It also appears next to Chess.com's "Daily limit reached" message.</li>
</ol>
<p class="note">Chess.com's public archive can take a few minutes to update after a game ends. Daily (correspondence) games aren't supported by link yet; paste the PGN instead.</p>
{SHOTS}
<h2>The labels you know</h2>
<p>elo101 uses the move labels Chess.com players are used to: Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss and Blunder. The rules behind them are elo101's own, published openly, and moves are judged for your rating. <a href="/chess-move-labels/">What every label means →</a></p>
<h2>What's different from Chess.com Game Review</h2>
<ul class="ticks">
  <li><b>No daily limit</b> and no membership.</li>
  <li><b>Runs on your device:</b> the analysis happens in your browser.</li>
  <li><b>Open methods:</b> the model, the label rules and the test results are all on <a href="{GITHUB}">GitHub</a>.</li>
  <li><b>Accuracy uses Lichess's published formula</b>, because Chess.com's is private. Expect elo101's accuracy to differ from Chess.com's by several points on the same game.</li>
</ul>
""",
        "faq": [
            ("Is this Chess.com's Game Review?", "No. elo101 is an independent, free tool and isn't affiliated with Chess.com. It reads your public games from Chess.com's public archive and reviews them in your browser."),
            ("Is there a daily limit?", "No. You can review as many Chess.com games as you like."),
            ("Will the labels match Chess.com's exactly?", "Not always. elo101 uses the same label names and bands, but its own published rules and model, so a few moves can come out differently. Blunders and mistakes usually agree."),
            ("Why can't it find my game?", "Chess.com's public archive can take a little while to update after a game ends. Try again in a few minutes, enter either player's username, or paste the PGN."),
            ("Can I review Chess.com daily games?", "Not by link yet. Download or copy the game's PGN from Chess.com and paste it into elo101."),
        ],
    },
    {
        "slug": "lichess-game-review",
        "title": "Lichess Game Review With Move Labels and Accuracy · elo101",
        "description": "Review Lichess games with Brilliant, Great, Best, Miss and Blunder labels judged for your rating, plus accuracy, game rating and a retry mode. Free, no account.",
        "h1": "Lichess game review, with labels for your rating",
        "lede": "Lichess's computer analysis marks inaccuracies, mistakes and blunders. elo101 adds the rest: Brilliant, Great, Best and Miss, labels judged for your rating, a game rating for both players and a mode to retry your mistakes.",
        "body": f"""
{CTA}
<h2>Bring in a Lichess game</h2>
<ol class="steps">
  <li><b>By username.</b> Choose the Lichess tab on <a href="/">elo101</a>, type your username and pick a recent game.</li>
  <li><b>By link.</b> Paste any <code>lichess.org/…</code> game link.</li>
  <li><b>With the Chrome extension.</b> When your game ends on Lichess, click the elo101 button to open its review.</li>
</ol>
{SHOTS}
<h2>What elo101 adds to Lichess analysis</h2>
<ul class="ticks">
  <li><b>Ten move labels</b> instead of three, including Brilliant, Great and Miss. <a href="/chess-move-labels/">What they mean →</a></li>
  <li><b>Judged for your rating:</b> the model learned from millions of Lichess games how often players at each level actually win from a position.</li>
  <li><b>Chances, not just centipawns:</b> a graph of who was likely to win, using both ratings and the clocks.</li>
  <li><b>Game rating:</b> roughly what rating each player played like in this game.</li>
  <li><b>Retry mode</b> to find the better move yourself.</li>
</ul>
<h2>Close to Lichess where it should be</h2>
<p>Accuracy uses Lichess's published formula. On a benchmark of real games, elo101's accuracy is within about 3 points of Lichess's, and every blunder elo101 flags is also a blunder on Lichess. The engine runs in your browser, so a review doesn't depend on Lichess's server analysis being requested.</p>
""",
        "faq": [
            ("How is this different from Lichess's computer analysis?", "Lichess shows inaccuracies, mistakes and blunders from one engine score. elo101 adds Brilliant, Great, Best, Excellent, Good, Book and Miss, judges moves for the players' ratings, and adds a game rating and a retry mode."),
            ("Does it use Lichess's own analysis?", "No. elo101 runs its own Stockfish 18 in your browser on every move, so any game can be reviewed right away."),
            ("Is the accuracy the same as on Lichess?", "It uses the same published formula on elo101's own engine evaluations, so it lands close: within about 3 points on average."),
            ("Do I need a Lichess account?", "No. Public games can be found by username or link without logging in anywhere."),
        ],
    },
    {
        "slug": "chess-move-labels",
        "title": "Brilliant, Great, Miss, Blunder: Chess Move Labels Explained",
        "description": "What do Brilliant, Great, Best, Book, Inaccuracy, Mistake, Miss and Blunder mean in a chess game review? Every move label explained in plain words.",
        "h1": "Chess move labels explained",
        "lede": "Game reviews label every move, from Brilliant (!!) to Blunder (??). Here is what each label means, how it's decided, and why the same move can get a different label at a different rating.",
        "body": f"""
<h2>Every label at a glance</h2>
<p>Each move is compared with the engine's best move. Most labels depend on how much of your <b>expected score</b> the move gave away. Expected score is how many points you'd expect from the position: a win is 1, a draw ½ and a loss 0, so 0.70 means you'd score about 70%.</p>
{label_table()}
<h2>What makes a move Brilliant?</h2>
<p>A Brilliant move is a real sacrifice that works. In elo101 it must be the engine's best move, give up at least two points of material (a minor piece for a pawn, or more), and the engine's main line must show the opponent taking the material while you stay down for at least three more moves, or deliver mate. A quick trick that wins the piece straight back is Best or Great, not Brilliant.</p>
<h2>What makes a move Great?</h2>
<p>Great marks the only good move: every alternative is much worse, or it's the one move that keeps you winning or out of a losing position. Forced moves, simple recaptures and mate in one don't count.</p>
<h2>What does Miss mean?</h2>
<p>Miss means your opponent just made a real mistake, and your reply gave most of that gift back. You didn't necessarily blunder: you simply didn't punish their error.</p>
<h2>Mistake vs Blunder</h2>
<p>Both lose something. A <b>mistake</b> gives away 10–20% of your expected score, like going from clearly better to roughly equal. A <b>blunder</b> gives away 20% or more, like hanging a piece or allowing mate.</p>
<h2>Why the label depends on your rating</h2>
<p>The same engine evaluation means different things at different levels. Being a piece up is almost always a win for two 2200 players, but much less certain for two 800 players. elo101 learned from millions of real games how often players at each rating win from each position, so a move is judged by what it costs players like you. <a href="/how-it-works/">How it works →</a></p>
{CTA}
""",
        "faq": [
            ("What is a brilliant move in chess?", "A brilliant move (!!) is a sound sacrifice: the best move in the position, which gives up material that the opponent takes, while the position still holds or wins."),
            ("What is a great move in chess?", "A great move (!) is the only good move in the position, or the one move that keeps a winning position or avoids a losing one."),
            ("What does Miss mean in a chess game review?", "Miss means your opponent made a mistake and your reply failed to take advantage of it, giving back most of what they gave away."),
            ("What is the difference between a mistake and a blunder?", "A mistake gives away 10–20% of your expected score; a blunder gives away 20% or more, such as losing a piece or allowing mate."),
            ("What is a book move?", "A book move is a known opening move, taken from an opening book of established theory."),
            ("What is an inaccuracy in chess?", "An inaccuracy (?!) is a small error that gives away 5–10% of your expected score: not losing, but not the best."),
        ],
    },
    {
        "slug": "how-it-works",
        "title": "How elo101 Reviews Chess Games: Expected Points and Accuracy",
        "description": "How elo101 judges chess moves: a model trained on millions of Lichess games predicts expected score from the engine score, ratings and clocks.",
        "h1": "How elo101 reviews a chess game",
        "lede": "A chess engine scores a position with one number, whoever is playing. elo101 turns that number into what really matters: how often players like you score from here.",
        "body": f"""
<h2>The idea: the same position isn't the same for everyone</h2>
<p>In one famous position the engine says White is clearly winning (+5.2), but the win needs a rook sacrifice and then a queen sacrifice. elo101's model gives White a 93% chance for two 2400-rated players, 84% for two 1600s and 69% for two 800s, in a 10-minute game. A plain engine score treats all three the same.</p>
<h2>Expected points</h2>
<p>elo101 predicts each player's <b>expected points</b> from a position: a win is 1, a draw ½, a loss 0. The model (gradient-boosted trees, LightGBM) learned this from millions of real Lichess games, using the Stockfish evaluation, both ratings, the time control, both clocks and the stage of the game. On positions from games it never saw, it predicts results 11.5% better than the formula Lichess uses, and its percentages are calibrated: when it says 70%, players score about 70%.</p>
<h2>From expected points to move labels</h2>
<ol class="steps">
  <li>Stockfish scores the position after your move, and after the best move.</li>
  <li>The model turns both scores into expected points for players of your rating.</li>
  <li>The difference is what your move cost. Small costs are Excellent or Good; large ones are Mistakes or Blunders. Special checks find Brilliant sacrifices, Great only-moves and Misses. <a href="/chess-move-labels/">All labels →</a></li>
</ol>
<p>Moves are judged by a model that looks only at the board, not the clock, so hanging a queen in a bullet game is still a blunder.</p>
<h2>Accuracy and game rating</h2>
<p><b>Accuracy</b> uses Lichess's published formula, which weighs moves in sharp positions more and isn't hidden by one big blunder among good moves. <b>Game rating</b> estimates what rating each player played like in this game, from their accuracy and the players' average rating. The more accurate player never gets the lower game rating.</p>
<h2>Runs in your browser</h2>
<p>Stockfish 18 runs as WebAssembly on every CPU core, and the trained model runs as plain JavaScript. Your game is never sent to a server for analysis, which is why elo101 can be free with no limit.</p>
<h2>Tested in the open</h2>
<p>Every change is checked against a fixed benchmark of 450 real games, 300 puzzles and 64 hand-checked positions. The code, the model and the full results are on <a href="{GITHUB}">GitHub</a>.</p>
{CTA}
""",
        "faq": [
            ("What are expected points in chess?", "Expected points is the score a player can expect from a position: 1 for a win, ½ for a draw and 0 for a loss, averaged over how games like it actually end. 0.70 means about 70%."),
            ("How is elo101's accuracy calculated?", "With Lichess's published accuracy formula, applied to elo101's own Stockfish evaluations in your browser."),
            ("Is elo101 open source?", "Yes. The code, model training pipeline and benchmark results are on GitHub under the MIT license."),
        ],
    },
]

CSS = """
:root{--page:#f6f5f3;--panel:#fff;--well:#efedea;--line:rgba(0,0,0,.09);--ink:#1c1b19;--ink2:#46433f;--muted:#64615d;--brand:#1a66d6;--btn:#1a66d6;--brand-ink:#fff}
@media (prefers-color-scheme:dark){:root{--page:#1c1b19;--panel:#262421;--well:#2f2d2a;--line:rgba(255,255,255,.08);--ink:#fff;--ink2:#d4d2cf;--muted:#a3a19e;--brand:#3b8cff}}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink2);font:17px/1.65 Figtree,system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--brand)}
.top{border-bottom:1px solid var(--line);background:var(--panel)}
.top-in,.foot-in,main{max-width:860px;margin:0 auto;padding:0 16px}
.top-in{display:flex;align-items:center;gap:18px;min-height:58px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:8px;font:800 19px/1 Geist,Figtree,sans-serif;color:var(--ink);text-decoration:none}
.logo img{width:28px;height:28px;border-radius:7px}
.top nav{display:flex;gap:14px;flex-wrap:wrap;font-size:15px;margin-left:auto}
.top nav a{color:var(--ink2);text-decoration:none}.top nav a:hover,.top nav a[aria-current]{color:var(--ink)}
.top nav a[aria-current]{font-weight:700}
main{padding-top:40px;padding-bottom:64px}
.crumbs{font-size:14px;color:var(--muted);margin:0 0 10px}.crumbs a{color:var(--muted)}
h1,h2,h3{font-family:Geist,Figtree,sans-serif;color:var(--ink);letter-spacing:-.02em;line-height:1.15}
h1{font-size:clamp(30px,5vw,44px);margin:0 0 14px}
h2{font-size:24px;margin:44px 0 12px}
.lede{font-size:19px;max-width:66ch;margin:0 0 22px}
.cta-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:22px 0}
.cta-row span{color:var(--muted);font-size:15px}
.btn{display:inline-block;background:var(--btn);color:var(--brand-ink);font-weight:800;text-decoration:none;padding:12px 22px;border-radius:12px}
.btn:hover{filter:brightness(1.08)}
ul.ticks,ol.steps{padding-left:22px}ul.ticks li,ol.steps li{margin:8px 0}
b,strong{color:var(--ink)}
code{font-family:ui-monospace,monospace;font-size:.86em;background:var(--well);padding:1px 6px;border-radius:6px}
.note{background:var(--well);border-radius:12px;padding:12px 16px;font-size:15px}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:26px 0}
.shots figure{margin:0}.shots img{width:100%;height:auto;border-radius:12px;border:1px solid var(--line);display:block}
.shots figcaption{font-size:14px;color:var(--muted);margin-top:6px}
@media (max-width:640px){.shots{grid-template-columns:1fr}.top nav{margin-left:0}}
.tablewrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:16px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.pill{display:inline-block;white-space:nowrap;font-weight:800;font-size:14px;padding:3px 10px;border-radius:8px;color:#fff}
.brilliant{background:#0b7a85}.great{background:#3b6fd9}.best{background:#23804a}.excellent{background:#4c7a2e}.good{background:#5c6d55}
.book{background:#8a6a4c}.inaccuracy{background:#f2b33d;color:#1c1b19}.mistake{background:#ad5418}.miss{background:#c2416c}.blunder{background:#c9282b}
.faq details{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:10px 0}
.faq summary{cursor:pointer;font-weight:700;color:var(--ink)}
.faq p{margin:8px 0 0}
.more{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:12px}
.more a{display:block;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;text-decoration:none;color:var(--ink);font-weight:700}
.more a span{display:block;font-weight:400;color:var(--muted);font-size:14px;margin-top:4px}
.foot{border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
.foot-in{display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between;padding-top:20px;padding-bottom:28px}
.foot a{color:var(--muted)}.foot nav{display:flex;gap:14px;flex-wrap:wrap}
"""

MORE_BLURBS = {
    "free-chess-game-review": "Unlimited reviews, no account",
    "chess-com-game-review": "Review Chess.com games, no daily limit",
    "lichess-game-review": "More labels for your Lichess games",
    "chess-move-labels": "Brilliant, Great, Miss, Blunder explained",
    "how-it-works": "Expected points, accuracy, game rating",
}


def render(page: dict) -> str:
    slug = page["slug"]
    url = f"{SITE}/{slug}/"
    current = ' aria-current="page"'
    nav = "".join(f'<a href="/{s}/"{current if s == slug else ""}>{html.escape(n)}</a>' for s, n in NAV)
    faq_html = "".join(
        f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q, a in page["faq"]
    )
    more = "".join(
        f'<a href="/{s}/">{html.escape(n)}<span>{html.escape(MORE_BLURBS[s])}</span></a>' for s, n in NAV if s != slug
    )
    crumb_name = dict(NAV)[slug]
    ld = [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": page["title"],
            "description": page["description"],
            "url": url,
            "dateModified": TODAY,
            "isPartOf": {"@type": "WebSite", "name": "elo101", "url": f"{SITE}/"},
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "elo101", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": crumb_name, "item": url},
            ],
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in page["faq"]
            ],
        },
    ]
    ld_json = json.dumps(ld, ensure_ascii=False, indent=1).replace("</", "<\\/")
    t, d = html.escape(page["title"]), html.escape(page["description"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#1c1b19">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="elo101">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{SITE}/og-image.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;700;800&family=Geist:wght@700;800&display=swap" rel="stylesheet">
<style>{CSS}</style>
<script type="application/ld+json">{ld_json}</script>
</head>
<body>
<header class="top"><div class="top-in"><a class="logo" href="/"><img src="/apple-touch-icon.png" alt="" width="28" height="28">elo101</a><nav aria-label="Guides">{nav}</nav></div></header>
<main>
<p class="crumbs"><a href="/">elo101</a> › {html.escape(crumb_name)}</p>
<h1>{html.escape(page["h1"])}</h1>
<p class="lede">{html.escape(page["lede"])}</p>
{page["body"]}
<section class="faq"><h2>Questions</h2>{faq_html}</section>
<section><h2>More from elo101</h2><div class="more">{more}</div></section>
</main>
<footer class="foot"><div class="foot-in"><span>elo101 is free and open source. Not affiliated with Chess.com or Lichess.</span><nav><a href="/">Review a game</a><a href="/support.html">Support</a><a href="/privacy.html">Privacy</a><a href="{GITHUB}">GitHub</a></nav></div></footer>
</body>
</html>
"""


def sitemap() -> str:
    urls = [("/", "weekly", "1.0")] + [(f"/{p['slug']}/", "monthly", "0.8") for p in PAGES] + [
        ("/support.html", "monthly", "0.3"),
        ("/privacy.html", "yearly", "0.2"),
    ]
    body = "".join(
        f"  <url>\n    <loc>{SITE}{loc}</loc>\n    <lastmod>{TODAY}</lastmod>\n    <changefreq>{cf}</changefreq>\n    <priority>{pr}</priority>\n  </url>\n"
        for loc, cf, pr in urls
    )
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'


def main() -> None:
    for page in PAGES:
        out = PUBLIC / page["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(page), encoding="utf-8")
    (PUBLIC / "sitemap.xml").write_text(sitemap(), encoding="utf-8")
    print(f"wrote {len(PAGES)} guide pages and sitemap.xml")


if __name__ == "__main__":
    main()
