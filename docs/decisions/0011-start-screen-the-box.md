# ADR-0011: Start screen, "your gang is in the box"

**Date:** 2026-11-15 · **Status:** Accepted · Refines ADR-0006 (tokens unchanged) and the start-screen notes in ADR-0010.

The start screen is the first thing anyone sees under the new name. Its one job is to get you into the box in one tap,
after you've met the gang. It now shows the product idea instead of describing it.

- **The name is a box.** The wordmark sits inside a thick marigold outline, which echoes the rounded-square favicon.
  It's outlined, not filled, so "Watch with the gang" stays the only filled marigold (one action colour, ADR-0006).
  The words stack one per line, with the box sized to "Commentary". At its largest it is 80px; the first pass was
  108px and pushed the button below the fold on a 768px laptop.
- **The gang is in the box.** Sunny, Dev and Ritu's cricket-ball avatars sit on the box's bottom edge, like heads in a
  commentary window, next to one empty dashed seat: yours. This is the brand's one bold element, and it puts
  "Your gang is in the box" on screen without saying it.
- **The fixture reads like a scoreboard.** It shows "England 246" and "India need 247 off 50 overs" in the display face,
  each with a small team-colour square, and the date and venue in small text under it. A fan wants the equation first.
  The result is in the data but is never shown: it would spoil the match.
- **The gang's chatter is a transcript, not chat bubbles.** The bubble cards were the stock card-kit look. Each line
  now hangs off a rail, the same visual language as the panel's ball rail. The rail is drawn seat to seat, so it always
  ends at your empty seat. Sunny says "Welcome to the box", Dev boasts, Ritu files it away, and the last row is
  "Your seat. Hold to talk once the match starts." The verb matches the "Hold to talk" button.
- **Removed:** the all-caps "WELCOME TO THE BOX" label from ADR-0010. It was stock template chrome, and the welcome
  now comes from a friend. Also removed: the left rule on the fixture, because two vertical rails competed and only
  the transcript's carries meaning (the order things were said).
- **The AI-friends disclosure** moved under the transcript, next to the friends it describes. At 1366×768 it is
  now above the fold.
- **Motion:** one moment only. The transcript lines arrive in turn, 420ms apart. The global reduced-motion rule
  already covers it.

Checked at 1440×900, 1366×768 and 390×844. The axe WCAG 2.1 AA scan passes.
