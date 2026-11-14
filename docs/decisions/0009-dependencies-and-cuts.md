# ADR-0009: Dependencies and cuts in v1.2

- **No new runtime dependencies.** The YouTube IFrame API is loaded from youtube.com at runtime, which is the official
  way to embed. Playwright's Chrome channel (already a dev dependency) is used for the real-embed tour, because
  Chromium builds can differ in codec support.
- **Dev-only tools never ship.** `/dev/tag` is a separate HTML entry that is not a Vite build input.
  `scripts/check-bundle.mjs` now fails the build if `dev/tag`, `dev-probe` or the dev store hook appears in `dist/`.
- **Cut: the IND v NZ match data.** It is in git history (`bfab59b`) and recorded in spec Appendix B as superseded.
- **Cut: the typing box during play.** It broke "zero typing during play". Mic-denied users still have reactions and the
  gang's lines.
- **Cut: the synthesized crowd on YouTube.** The real broadcast has a real crowd. The synth stays for the scoreboard
  fallback only.
