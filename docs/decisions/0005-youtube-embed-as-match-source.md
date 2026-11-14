# ADR-0005: YouTube embed as the match source (v1.2)

**Status:** accepted, 14 Nov 2026 (owner change request v1.2; details decided by the build).

**Decision.** The demo match is England v India, 2nd ODI, Lord's, 14 July 2022, played from the official ECB upload
(`UnRMj4ZC12o`, "ODI IN FULL", 6:21:28) with the YouTube IFrame Player API. Ball facts come from Cricsheet match 1276908
(ODC-By). The stylised scoreboard replay stays as an automatic fallback.

**Options considered.**
1. Keep the synthetic scoreboard (v1.1). Rejected: the product promise, "beside the match", is never felt.
2. Highlights video. Rejected: highlights skip most balls, so ball-pinned sync has nothing to pin to.
3. **The full-match embed** (chosen). Every ball is on screen, so we can pin every line to it.

**Rules we follow.**
- Embed only: the video is never downloaded, re-hosted, clipped or overlaid. YouTube's controls and branding stay visible.
- Our panel sits *next to* the player, and notes (fallback, autoplay hint) sit above it or in the panel.
- Credits in the app footer: "Match video © England & Wales Cricket Board, played from YouTube"; Cricsheet (ODC-By).

**`MatchSource`** (`src/services/source/`) is the only way the app reads or controls the match:
`getCurrentTime, play, pause, seekTo, setVolume, getVolume, getState, onStateChange`.
- `YouTubeSource` maps player states. Buffering, unstarted and cued count as paused. During an ad, the content time
  doesn't advance, so no ball is revealed.
- `ScoreboardSource` runs on **the same timeline** in virtual seconds, so chapters, sync and the journey are identical
  when it takes over.
- Fallback triggers: the IFrame API doesn't load within 10 s, the player isn't ready within 12 s, or any `onError`
  (2, 100, 101, 150) before or during play, at the same video time. Error 5 is sometimes transient (seen once in four
  headless runs), so the embed is retried once before falling back.

**Ball ↔ video time (`timeline.json`).** You can't watch the video in CI, but you can read its scorebug.
- On 14 Nov 2026 the build sampled the embedded player's scorebug in an automated Chrome (viewing only). It sampled
  every 4 s across the three chapter windows and every ~10 minutes elsewhere, and resolved each reading
  (overs + score) to a Cricsheet delivery.
- 88 readings resolved, 0 unresolved, which also cross-checks the data.
- Evidence: `data/matches/eng-ind-2022-odi2/scorebug-observations.json`. Builder: `npm run timeline`.
- Every ball inside the demo chapters is anchored (±3 s). The other 449 balls are interpolated (`tagged:false`).
- Manual tags from `/dev/tag` (`src:"tag"`) always win over scorebug anchors.
- No frames are kept: crops lived only in a temporary folder, and committed screenshots mask the player.

**Ducking.** Cross-origin iframe audio can't be routed through Web Audio, so a `Ducker` steps `player.setVolume()` down to 20
over 200 ms (8 steps) while a gang clip plays, and restores the user's volume afterwards. If the user moved the slider
mid-clip, their new value wins. The synthesized crowd is only used by the scoreboard fallback.

**Consequences.**
- The review depends on YouTube being reachable. The fallback covers it, with the same journey.
- Real video can't pause for AI, so the engine no longer holds the clock (ADR-0008).
