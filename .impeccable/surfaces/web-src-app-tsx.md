---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/index.css"]
---

# Surface: elo101 app (import, analyzing, summary, review)

Mode: Operate. Primary user: club/online player (800–1800) reviewing their own game on a laptop right after playing; task is find the turning points and retry mistakes. Constraints: Chess.com move-label colours/icons and board-left/panel-right layout are binding; light/dark appearance and board themes stay user-switchable (Park is the default board). User asked for "easy, simple, understandable, like chess.com or lichess but our own design, nice and professional" (2026-11-19); those products set the craft bar, not the look.

## Direction contract

THESIS: The review happens on a park's granite chess table: the board is inlaid in a dark slate slab with engraved coordinates, and everything else is plain, quiet stone. Refuses grey-dark panels with a blue accent, letter avatars, and the old green-mat/buff-paper look.

OWN-WORLD: Granite ground (light #E4E2DC / dark #15181A), slate shell band and slab (#23282B / #2B3033) in both modes, limestone panels (#F7F6F2 / #1E2326) with slate ink, inlaid Park board (pale granite #DCD8CD, verdigris slate #6F8B84). Violet (#5B45D6 light, #8C7DFF dark) appears only on things you can press; slate pill marks where you are. Schibsted Grotesk throughout, tabular figures. Bevelled slab, engraved coordinates, no glow, no gradients.
Raise (warm consumer app): the action colour is reserved strictly for pressable elements; labels in plain language.
Raise (Crouwel grid): one 4px spacing grid; slab top and panel top share one edge.
Raise (transit diagram): the current move is the brightest thing in the move list; everything else recedes.

STORY: The player sees their game on a familiar board, reads one clear coach line, sees where the chances swung, and retries a mistake with the one violet button.

FIRST VIEWPORT: Slate top bar (brand, New game, help, settings). Left: player bar, board in the slate slab with engraved a–h / 1–8 and the eval channel in its margin, player bar. Right (~400px): limestone panel — title + Chances/Engine toggle, coach block (label + heading + body + Retry/Next mistake), graph, move list with slate current pill, nav controls with violet play. Start screen: headline and sample final position in the slab at left, import panel right.

FORM: Park granite table, grounded candidate 5 of 7; seed:a3b312c134c9aff7

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
