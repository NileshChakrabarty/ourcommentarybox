# ADR-0016: "Behind the scenes" log and the /how-it-works page

**Date:** 2026-11-16 · **Status:** Accepted (v1.3 amendment §2–3)

## Behind the scenes (X-ray mode)

- **The toggle.** "Behind the scenes" in the app bar is off by default. It opens a read-only log in its own column
  beside the panel (stacked under the panel on phones), never over the match. In the extension it swaps with the
  panel.
- **What it logs.** The engine always writes the log; it is capped at 400 entries and is cheap. Each entry is stamped
  with the ball on screen (over.ball) and says what the system did:
  - **Ball sync:** "Video 13949.4 s → ball 2.4 (read off the scorebug at 13949.0 s)", and whether that ball's time
    was hand-tagged, read off the scorebug or interpolated. Jumps (hidden tab, a seek in the extension) are logged as
    jumps.
  - **Moment rules:** which rule fired and why ("R1 fired: Rohit out for 0 — your hero. Why: a gang member's hero is
    out.").
  - **AI lines:** where each line came from: *prefetched* (and how long before it was needed), *live* (how long we
    waited), or *fallback* (prepared earlier, or a template). The same for the comeback card, replies, the catch-up
    and the wrap.
  - **Prefetch:** each Gemini batch, which balls it covers, how long it took and which model answered.
  - **Voice:** Sarvam model, persona, language code and how long it took to make. When the clip plays, its duration.
  - **Ducking:** the match ducked to 20%, and restored.
  - **Broadcast:** the join point, and corrections (a paused or drifting player put back on live).
  - **Away:** stepping away, the tab hidden, coming back, and what was missed.
- **What it never shows:** API keys, prompts, request bodies, or the viewer's words. A voice note is logged as "Your
  3.2 s clip → Sarvam saaras:v3 … 7 words", never its text. A test asserts that no entry contains anything key-like.

## /how-it-works

- **Where.** A real URL; Vercel already rewrites every path to `index.html`. It is linked from the start-screen
  footer. In the room it opens in a new tab, so the broadcast keeps running and you get a catch-up when you're back.
- **The diagram.** One inline SVG with real text (not an image of text), styled from the design tokens so it works
  in both themes. It has an `aria-label` describing the whole flow: match video + ball-by-ball data → ball sync →
  moment rules → Gemini → Sarvam → gang panel, with your voice going in through Sarvam speech-to-text and a dashed
  box for "our API: keys stay on the server".
- **Four short sections, about a two-minute read:**
  - how ball sync works;
  - how it runs on any streaming app as an extension: read the `<video>` time, a live ball-by-ball feed, per-friend
    stream-delay calibration;
  - what the AI does;
  - what is real and what is simulated in this demo.
- **Language.** The Hinglish/English toggle applies here too; it is the same stored setting as the room. The page is
  lazy-loaded, so it adds nothing to the room's first load.
