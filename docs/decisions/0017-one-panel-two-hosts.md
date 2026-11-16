# ADR-0017: One panel, two hosts (web demo + Chrome extension)

**Date:** 2026-11-16 · **Status:** Accepted (v1.3 amendment §4)

## Decision

- **The panel is host-agnostic.** `src/panel/` (the panel, wrap, shelf, dock, feed and log) depends only on the
  store, the engine and `src/panel/commands.ts`. The engine depends only on the `MatchSource` interface. A unit test
  fails if anything in `src/panel/` imports from `stage/`, `hosts/`, or a concrete player source.
- **Web host** (`src/hosts/web/`, `src/stage/`): our YouTube embed wrapped in `LiveBroadcast` (ADR-0014), the
  scoreboard fallback, the start screen and the room layout.
- **Extension host** (`src/hosts/extension/`, `extension/`), Manifest V3:
  - **Side panel.** `sidepanel.html` renders the same `Panel`, `WrapScreen`, `Shelf` and `XrayLog`.
  - **Source.** `VideoElementSource` turns reports from the content script into a `MatchSource`. Between reports it
    extrapolates; it goes stale after 2.5 s; an ad counts as a pause; reports from other videos are ignored.
    `play`, `pause` and `seekTo` do nothing, because the viewer owns the player and YouTube's normal controls apply.
    Volume is the one thing it sets, for ducking.
  - **Content script** (plain JS, about 40 lines, auditable). It runs on `youtube.com/watch*` but only acts on
    `v=UnRMj4ZC12o`. It posts `{t, paused, rate, ad, volume, muted}` over a `chrome.runtime` port every 250 ms. The
    side panel validates every message before use.
  - **Permissions:** `sidePanel` only. The brief allowed "the youtube.com host only"; a `content_scripts` match is
    enough to run there, so no `host_permissions` are requested at all.
  - **Stable ID.** The manifest carries a public key, so the ID is always `aoiegnfccbedbnhagelbfojlbapjlfid`. The
    private key was not kept; unpacked loading doesn't need it, and a Web Store listing gets its own.
  - **No keys in the extension.** AI calls go to `ACB_API_BASE` (our Vercel endpoints; default `http://localhost:5173`
    for local testing). `npm run build:extension` runs the same bundle check as the web build.
  - **Bundled:** the match data and the prepared voices. The safety net works even if the API is down.
- **CORS on the API.** `ALLOWED_ORIGIN` is now a comma-separated list. Every route answers the `OPTIONS` preflight
  and adds `access-control-allow-origin` (and exposes `x-voice-model`) only for listed origins. With `ALLOWED_ORIGIN`
  unset (dev), only `http://localhost:*` and `chrome-extension://<32 a–p>` get CORS headers.

## Verified on 2026-11-16

`tests/extension/verify.mjs` loaded `extension/dist` unpacked in Playwright's Chromium, opened the real match on
youtube.com, and opened the side panel page:
- The panel offered "Join the box" once it saw the video.
- 8 of 8 time samples matched the timeline: ball 2.3, then 2.4 at about 13,950 s.
- After seeking past 13,949 s, the wicket slab appeared with live Hinglish teases from the dev API, through CORS from
  the extension's origin.

The side panel was opened as a tab, because automation can't click the toolbar icon. It is the same page and the same
port connection.

## Deployment

**Not done.** It needs the owner's Vercel login (TASK-027), so the extension was built and tested against the local
dev server. After deploying:
1. Set `ALLOWED_ORIGIN` as above.
2. Rebuild with `ACB_API_BASE=https://<app>.vercel.app npm run build:extension`.
