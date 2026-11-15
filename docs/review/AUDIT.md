# Apna Commentary Box (then Fun-Banter, later Our Commentary Box) v1.1 — Audit

Date: 14 Nov 2026. Build audited: commit `bfab59b` (v1.1, IND v NZ stylised replay).
Method: I ran the app in Chromium at 1440×900, 1280×720 and 390×844, captured every screen and state with a scripted
tour (`tests/tour/tour-v1.spec.ts`), and read every source file. I critiqued the screens with the
`design-critique` and `accessibility-review` frameworks, computed contrast ratios from the tokens, and took
API latencies from the dev-server log of the earlier live runs (n = 166 calls).
The screenshots are in `docs/review/screenshots/before/`.

Severity: **Critical** = breaks a product truth or the 5-minute review. **High** = the reviewer will notice and
mark us down. **Medium** = polish or a robustness gap. **Low** = nice to have.

---

## 1. The reviewer journey, second by second (v1.1, AI live, 1×)

| t | What the reviewer sees | Verdict |
|---|---|---|
| 0 s | Landing: a giant yellow wordmark (the product was then called Fun-Banter), a lede, 3 numbered steps, a CTA and a disclosure paragraph. The gang quotes animate in on the right after about 0.5 s (`01-landing`). | The purpose is clear. The disclosure is a 4-line paragraph that most people won't read. |
| ~8 s | Setup: team, hero and villain dropdowns, "Pick for me", Test mic, and a gang card list (`02/03-setup`). | **Three decisions before anything happens.** The reviewer has to understand "hero" and "villain" before seeing why they matter. |
| ~20 s | Live: a fake browser frame, a stylised floodlit pitch, the scorebar, and the panel showing "The gang is warming up…" (`04-live-empty`). | **There is no real match.** The pitch is a stand-in, so "beside the match" is only implied. |
| 20–50 s | Balls fly past at up to 4/s in "Fast-forwarding quiet balls". The panel stays **empty** until India 8.5 overs (`05-first-banter`). | **Dead air.** For about 30 s the product does nothing. |
| ~60 s | First moment card: a headline plus 3 lines of 15–20 words, each with "Send". The card covers about 50% of the panel (`08-moment-card`). | Not glanceable. Reading three sentences mid-ball defeats "voice-first". |
| ~90 s | Gang Call card, then the nudge to step away. | Too many cards compete in the same dock. |
| ~2:20 | Step away: the **whole stream dims and greys out** (`10-away`). | **It covers the match.** This breaks the v1.2 truth. |
| ~3:00 | Call-back: a modal over the stream with the friend's line and "Back to the match" (`11-callback`). | Strong moment, but it sits over the match. |
| ~3:05 | Catch-up: another modal over the stream (`12-catchup`). | Same problem. The text is good. |
| ~4:15 | Wrap: a huge headline, roast of the night, reel, loudest moment, numbers (`14-wrap`). | Good bones. The fallback title just restates the result. "1 calls won" is a grammar bug. |
| ~4:30 | Memory shelf (`15-shelf`). | Works. Visually plain. |

---

## 2. Findings

### Critical

| # | Area | Finding | Evidence |
|---|---|---|---|
| C1 | Product | The "match" is a synthetic scoreboard animation, so the core claim "beside the match" is never felt. v1.2 requires the real ECB video. | `04-live-empty`, `BroadcastView.tsx` |
| C2 | UX | The away dim layer, call-back modal and catch-up modal are drawn **over the stream**, breaking "the match is never covered". | `10/11/12`, `AwayLayer.tsx` grid-area 1/1 over `.broadcast` |
| C3 | UX | **About 30 s of dead air** at the start: the first gang line comes at India 8.5, after a quarter of the replay. The reviewer's first impression of the live panel is an empty box. | `05-first-banter`, `director.ts` only speaks on rule moments |
| C4 | Product | A **typing box is always visible during play** ("Can't talk? Type to the gang"). It breaks "zero typing during play" and takes prime space in the dock. | `Panel.tsx` Composer |
| C5 | System | The engine is hard-wired to `ReplayClock` and *holds the clock* (3.5 s per beat, 45 s for the call-back, 20 s for catch-up) and speeds it to 4× while away. None of that is possible with a real video, which can't be held or sped up invisibly. A time-source abstraction is required. | `engine.ts` L61–77, 208, 216, 375, 396 |

### High

| # | Area | Finding |
|---|---|---|
| H1 | UX | The moment card is 3 long options with Send buttons, so a fan can't take it in within 1 s. It should be one big line to say out loud, with alternatives one tap away. |
| H2 | Visual | Feed items are heavy. Each clip is a name row, a waveform pill and a 2-line transcript, so 3 items fill the viewport. The ball marker repeats the broadcast's ball text. Wickets look like every other row. |
| H3 | UX | Setup asks for team, hero, villain and a mic test. For a 5-minute review this is friction. With v1.2's "India fans", one tap ("I'm with India") plus an optional hero is enough. |
| H4 | Visual | The panel header has 5 competing elements: title, sync claim, Simulated tag, Step away and the nudge text. Nothing tells you the current ball. |
| H5 | System | `RoomEngine` is a 500-line class that mixes timing, AI, audio, Gang Calls, persistence and wrap. It is hard to change safely, and the fallback path is tangled with the live path. |
| H6 | AI | The batched `/api/react` call averages **4.4 s (max 11.6 s)**, and **13 of 37 calls failed** (5 rate-limited, 6 upstream errors, 2 timeouts) on the free tier, which allows 5 requests per minute per model. The 60 s look-ahead is too short for a slow, flaky upstream. With real video, balls are about 35–45 s apart, so we can look several minutes ahead. |
| H7 | Visual | Wickets don't feel like events in the panel. Only the stage burst shows them, and the stage is going away. |
| H8 | Mobile | At 390 px the panel sits under a tall stage, and the talk button and feed are below the fold (`18-live-mobile`). |

### Medium

| # | Area | Finding |
|---|---|---|
| M1 | A11y | The "Live" badge is white on `#ff4d4d`: **3.27:1** for 13 px text. It fails 1.4.3. |
| M2 | A11y | Control boundaries (`--line #2a4466` on `--night-2`) are **1.58:1**. Inputs, emoji buttons and the select borders fail 1.4.11 (needs 3:1). |
| M3 | Copy | "1 calls won" on the wrap screen (pluralisation). |
| M4 | UX | The fallback wrap title ("New Zealand won by 7 wickets. What a night.") is a match report, not a gang story. |
| M5 | UX | The Gang Call result toast is centred at the bottom of the window, which puts it **over the stream**. |
| M6 | UX | Recording shows only a ring and a countdown, with no live waveform, so the user can't tell whether the mic hears them. |
| M7 | UX | Reactions are just an emoji row in the feed, with no burst or other feedback on tap. |
| M8 | Security | `checkOrigin` allows requests with **no Origin header**, so curl or a script can use our Gemini/Sarvam quota. The rate limit is in memory per instance, which is best effort. |
| M9 | Robustness | There is no React error boundary, so one render error gives a blank page with no way back. |
| M10 | System | Store and engine share `room()` global access everywhere, which makes the engine hard to unit test. Only pure core modules are tested. |

### Low

| # | Area | Finding |
|---|---|---|
| L1 | Visual | Avatars are single letters on tinted circles, so "You" shows "Y". The gang has no visual personality. |
| L2 | Visual | Spacing, radius and type sizes are hard-coded per component (e.g. 21 px, 13 px, 14 px, 18 px), with no scale. The token set covers colour only. |
| L3 | UX | "In sync with your stream" is a claim with no evidence. It should show the ball the panel is pinned to. |
| L4 | Repo | There are two copies of the spec (root `PROJECT MASTER SPECIFICATION.md` and `docs/`). |
| L5 | Tests | E2E runs take 5+ minutes of real time and are slow to iterate on. |

---

## 3. Visual design critique (design-critique framework)

**Overall impression.** The night palette and the condensed display face give it a sports-broadcast identity,
and the marigold talk button is the right hero action. The biggest opportunity is to make the panel
*glanceable*: today it reads like a chat app beside a scoreboard demo.

**First impression (2 s).** On landing the wordmark wins, which is correct. In the live view the eye goes to the
stage's giant "OUT", which is ours rather than the match, then to the moment card. The current ball, and who is
talking, never wins.

**Hierarchy.** Panel reading order is title → sync claim → tags → gang avatars (5 lines of metadata) → feed → a card
that pushes the feed up → emoji → text box → talk. Too much chrome sits above the content.

**Consistency.**

| Element | Issue | Fix |
|---|---|---|
| Type | Display face at 19/21/24/28/64 px with no scale | A 5-step type scale as tokens |
| Radius | 4, 6, 10, 18, 20, 22, 999 px | 3 radii plus pill |
| Cards | Moment, Calls, Catch-up and Callback all use different border styles | One "prompt" component with variants |
| Source tags | "live AI", "AI, prepared", "fallback" | Keep, as one quiet chip style |

**What works.** The marigold hold-to-talk button, ball-pinned grouping, the source honesty chips, the call-back
copy, the catch-up that names every wicket, and the wrap structure.

---

## 4. Accessibility (WCAG 2.1 AA)

| Element | Fg | Bg | Ratio | Need | Pass |
|---|---|---|---|---|---|
| Body text | #f4f1e8 | #0d1b2e | 15.32 | 4.5 | ✅ |
| Muted on panel | #9fb2c8 | #12243b | 7.21 | 4.5 | ✅ |
| Muted on surface-2 | #9fb2c8 | #1e3756 | 5.57 | 4.5 | ✅ |
| Dev / Ritu / Sunny names on surface | #ff7a1a / #e879f9 / #38bdf8 | #172c47 | 5.41 / 5.74 / 6.59 | 4.5 | ✅ |
| Primary button | #2a1d00 | #ffc233 | 10.22 | 4.5 | ✅ |
| "Live" badge | #ffffff | #ff4d4d | **3.27** | 4.5 | ❌ |
| Control borders | #2a4466 | #12243b | **1.58** | 3.0 | ❌ |

- **Keyboard:** Space to talk works, and every control is a native button. ❌ The away, call-back and catch-up
  states don't move focus back to the panel when they close. ❌ There is no shortcut for "step away" or for the
  moment line.
- **Screen reader:** the feed is `aria-live=polite`, which is good. ❌ Each clip's play button reads "Play Dev's clip"
  without the line. ❌ Ball markers are read as raw "10.2 OUT! …" with no structure.
- **Motion:** `prefers-reduced-motion` is respected globally. ✅
- **Targets:** the emoji buttons are 33 px tall at 1280×720. They're fine for mouse, but under 44 px for touch.

---

## 5. System design

| Topic | State in v1.1 | Assessment |
|---|---|---|
| Architecture | `src/core` (pure), `src/services/engine.ts` (side effects), Zustand store, `api/` serverless proxy | The boundaries are right. The engine is too big (H5) and tied to one time source (C5). |
| Sync accuracy | Ball-pinned delivery (`DeliveryQueue`). Exact by construction, because the clock *is* the match. | With video, accuracy depends on the ball → video-time map. It needs a pure, tested time → ball tracker with seek rules. |
| AI latency | react 4.4 s avg / 11.6 s max. speak 1.3 s avg (n = 106). catchup 2.8 s. wrap 3.7 s. | Fine for a minute-ahead look-ahead. With video, prefetch the next 3–5 minutes. |
| AI reliability | 35% of react calls failed on the free tier. Precomputed and template fallbacks cover them. | The fallbacks work (the offline E2E passes), but the reviewer often sees "AI, prepared". |
| Failure handling | Live → precomputed → template for every line. Catch-up falls back after 3 s. The wrap has a fallback. | Good. There is no error boundary (M9) and no video-failure path yet (v1.2). |
| Persistence | IndexedDB stores rooms, blobs and live state. Resume works. | Good. Saved feeds are keyed by ball seq, which stays valid across sources. |
| Tests | 45 unit/API tests, 5 E2E. A bundle check fails the build if keys leak. | Good base. No tests yet for source or timeline logic (v1.2). |
| Security | Keys are server-only (verified by the bundle check). Zod validation. Speaker allowlist. Body limits. | M8: requests with no Origin header pass. The rate limit is per instance. |

---

## 6. Summary

- **Fix first (Critical):** C1 real video, C2 nothing over the match, C3 no dead air, C4 no typing during play,
  C5 a time-source abstraction.
- **Then (High):** a glanceable panel (H1, H2, H4, H7), one-tap setup (H3), a smaller engine (H5), a longer AI
  look-ahead (H6), and mobile (H8).
