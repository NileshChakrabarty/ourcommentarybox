# ADR-0014: A recorded match played as a live broadcast, to the last ball

**Date:** 2026-11-16 · **Status:** Accepted (v1.3 §1, amended: open-ended live match). Supersedes ADR-0007 (chapters)
and the time-skip parts of ADR-0008.

## Decision

- **Join point (`public/data/live.json`).** The evaluator joins India's chase in progress, `joinLeadSec` (6 s) before
  ball 317 (2.3, Topley to Rohit), at video 13,911 s. Rohit's lbw (2.4) is hand-anchored at 13,949 s, so the first
  wicket lands **about 38 s after "Join the box"**, inside the required 30–45 s.
- **It runs to the last ball.** The broadcast plays to `endBallSeq` (ball 536, the last of the match): about 2 h 29 min
  of real time. "Leave the box" opens the wrap at any time, and the wrap also opens by itself at the end. The
  change request's `sessionLengthSec: ~180` was dropped by the amendment. The first three minutes are now
  `guaranteeWindowSec` (180), and the tests hold the journey beats to it.
- **The live clock is the wall clock.**
  - `liveTime = joinT + (now − joinedAt) × rate`.
  - `LiveBroadcast` wraps the player, so a mid-match fallback to the scoreboard keeps the same clock.
  - It ignores `pause()` and `seekTo()`.
  - If the player is paused anyway (a click on the video, the browser suspending a hidden tab), it is resumed.
  - If it drifts more than 4 s from live, it is moved back.
  - The clock keeps running while the tab is hidden or you step away.
  - A reload rejoins the same room on the original `joinedAt`.
  - `?speed=N` (≤ 50) scales the clock for tests only; it is not a control in the UI.
- **No controls on the embed.** The YouTube player uses `controls=0`, `disablekb=1`, `rel=0`, `iv_load_policy=3` and
  `fs=0`. `modestbranding=1` is requested "where allowed": YouTube no longer hides its logo for it, so the branding
  stays visible. We never overlay the player.
  - Mute and volume are our own controls, beside the player.
  - If the browser blocks autoplay, the panel shows "Start the broadcast", because the embed has no play button now.
- **A live scoreboard strip** sits above the player: the score, overs, need, batters, bowler and this over at the ball
  on screen (Cricsheet). It never runs ahead of the broadcast.
- **Stepping away.**
  - The video is no longer time-skipped; the broadcast just keeps going.
  - About 8 s after you step away, a friend remarks on it. Every line said while you're gone is saved as "missed".
  - On return, the catch-up card appears and up to three missed voice clips play.
  - A hidden tab counts as stepping away: there is no away screen, and the catch-up shows when you're back (or nothing,
    if nothing happened).
  - If a wicket falls while you're away, a friend calls you back.
- **Removed from the main flow:** chapters, "Jump to moment", "Up next", rewatch and every seek. `/dev/tag` stays
  dev-only and now lists the live window's balls.

## Pacing (`live.json` → `pacing`)

A real gang is busy on big moments, quiet on dot balls, and never spammy.

- **Big balls always get a voice:** wickets, fours and sixes. A wicket or a six gets two friends. Moments that hit the
  gang's loyalties (rules R1–R7) come first.
- **Ordinary balls only speak after a quiet spell.**
  - 110 s for a single; 1.5× that (165 s) for a dot ball.
  - In the first 7 minutes (`warmSec`), it is 45 s, so a new viewer feels the gang at once.
  - Never two lines within 12 s, unless it's a big ball.
- **Long breaks get timed lines, anchored to video time instead of a ball:** replays, a new batter walking out,
  drinks.
  - A gap of 70 s or more between balls gets one line, 45 s in.
  - A gap of 140 s or more also gets a second line 35 s before play restarts. It names the incoming batter if one is
    walking out, because that is on screen before the ball.
- **Result over the whole chase:** 87 lines, about one every 2 minutes on average. The longest silence is 3.4 minutes.
  95% or more of wickets and boundaries are voiced, and at most 30% of dot balls.
- **The first five minutes:**

| Time after joining | What happens |
|---|---|
| 0:01 | Dev sets the scene |
| 0:38 | Rohit is out; Dev and Ritu tease you |
| ~1:00 | Your comeback card |
| 1:23 | Ritu talks over the replays |
| 2:00 | Sunny's nudge: "Step away for 20 s and come back" |
| 3:03 | Dev: "Kohli is walking out" |

  After that, chatter every 1–2 minutes.

## Why not a shorter clip, or seeking to the action?

- A real live match can't be skipped.
- The step-away/catch-up loop only means something if the match carries on without you.
- Choosing the join point gives the evaluator the action within 40 s without breaking the live illusion.
