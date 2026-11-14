# ADR-0006: "The commentary box" redesign

**Status:** accepted, 14 Nov 2026. Context: `docs/review/AUDIT.md` (C1–C4, H1–H4, H7–H8) and `docs/review/REDESIGN.md`.

**Options considered.**
- A, floodlit refined: cheap, but it keeps the chat-app shape.
- B, Lord's scorecard paper: cream and serif is the most generic look, and a light panel glares beside a TV picture.
- **C, the commentary box (chosen):** a ball rail with voices hanging off the ball they were said on, one prompt at a
  time in the dock, and one big mic.

**Design system.** `src/styles/tokens.css` holds:
- colour: ink, chalk, one action colour (marigold), red for wickets only, and the gang colours
- type: a 7-step scale
- space: 4-pt
- radius: 3 radii plus pill
- motion: 4 durations plus 2 easings
- layout

Components use tokens only. A grep in the review found no colour literals outside `tokens.css`. Control borders
(`--rule-strong`) are ≥ 3:1. The "Live"-style red text now sits on `--red-strong` (5.3:1).

**Product decisions.**
- **Zero typing during play.** The text box is gone. You hold Space or the mic, tap a reaction, or send the line the gang
  hands you. With the mic denied, reactions and lines still work.
- **One-tap start.** The landing and setup screens merge. All friends back India (v1.2). Your hero is an optional chip
  row (default Rohit). Your villain defaults to Topley.
- **The wicket slab** is the one bold element. Wickets also flash the panel edge and vibrate (where supported).
- **One prompt at a time** in the dock, in priority order: catch-up, then the line card, then Up next, then the Gang Call.
- **The line card** shows one big line, with "Another line" (1/3) and "Send it". It expires after 30 s or at the next ball.
- **Away and call-back** replace the feed inside the panel. The match is never dimmed or covered.
- **The fake browser frame is removed:** the real embed makes it unnecessary.
- **Avatars** are cricket balls in the friend's colour, with a seam.

**Cut.** The typing box, the "Gang commentary" title, and the hero/villain text under every avatar (the hero name stays).
