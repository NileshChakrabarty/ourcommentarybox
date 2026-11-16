# Apna Commentary Box: Chrome extension

The same gang panel as the web demo, in Chrome's side panel, beside the match playing in **your own YouTube tab**.
YouTube's normal controls apply: pause, seek and volume are yours. The gang follows your video, ball by ball.

## Build

```bash
npm install
npm run build:extension                                   # → extension/dist, AI calls go to http://localhost:5173
ACB_API_BASE=https://<your-app>.vercel.app npm run build:extension   # → AI calls go to the deployed app
```

The build bundles the match data and the prepared friend voices. It contains **no API keys**: the build fails if any
key, key name or auth header ends up in `extension/dist`. Every AI call goes through our own `/api/*` endpoints.

## Load it unpacked

1. Open `chrome://extensions` and switch on **Developer mode** (top right).
2. Click **Load unpacked** and choose the `extension/dist` folder.
3. The extension ID is always `aoiegnfccbedbnhagelbfojlbapjlfid`: the manifest carries a public key, so the ID is the
   same on every machine.
4. Pin "Apna Commentary Box" from the puzzle-piece menu, if you like.

**API access.** The API must accept the extension's origin.
- **Local:** run `npm run dev` (port 5173). The dev server accepts `chrome-extension://` origins.
- **Deployed:** add the extension's origin to `ALLOWED_ORIGIN` on Vercel. It is a comma-separated list:

  ```
  ALLOWED_ORIGIN=https://<your-app>.vercel.app,chrome-extension://aoiegnfccbedbnhagelbfojlbapjlfid
  ```

## Demo it (about 2 minutes)

1. Open the match: <https://www.youtube.com/watch?v=UnRMj4ZC12o&t=13925s>. That is India's chase, just before Rohit
   faces Topley.
2. Click the Apna Box icon in the toolbar. The side panel opens and says **"Join the box"** once it sees the video.
   (If it says "Waiting for the video…", press play on YouTube.)
3. Click **Join the box**, and play the video if it isn't playing.
   - The panel's ball counter follows your video.
   - At about 13,949 s Rohit is lbw: the wicket slab appears, and Dev and Ritu tease you in Hinglish, with the video
     ducked while they talk.
   - Your comeback card follows.
4. Try YouTube's own controls:
   - **Pause:** the gang waits.
   - **Seek back:** nothing is said twice.
   - **Seek forward a few overs:** what you skipped arrives as "missed" lines.
5. **Behind the scenes** shows the engine log: ball sync, rules, AI sources, voices, ducking. **Leave the box** opens
   the wrap.

## What it can access

- **Permissions:** `sidePanel` only. There are no host permissions.
- **The content script** runs on `https://www.youtube.com/watch*`, and only does anything on the demo video
  (`v=UnRMj4ZC12o`). It reads the `<video>` element's time, play state, ad state and volume four times a second and
  sends them to the side panel. It never reads anything else on the page and sends nothing off the machine. The only
  thing the panel asks it to do is set the video's volume, to duck the match while a friend talks.
- **The side panel** calls our API for AI lines and voices, and stores memories in its own IndexedDB.

## Known limits

- **Hold-to-talk.** Chrome can't show the microphone permission prompt inside a side panel. If the mic is blocked, the
  panel says so and you can still react or send the gang's suggested lines.
- **Only this one match.** A real product would read a live ball-by-ball feed and let each friend calibrate their
  stream delay once (see `/how-it-works`).
- **Ads.** If YouTube plays an ad inside the video, the panel treats it as a pause.

## Files

- `public/manifest.json`, `public/background.js`, `public/content.js`, `public/icons/`
  - The icons are drawn by `scripts/make-icons.mjs`.
- `sidepanel.html` loads the side-panel app from `src/hosts/extension/`, which reuses `src/panel/` (the same panel as
  the web demo).
- `src/services/source/video.ts` is the `VideoElementSource` that turns `<video>` time into balls.
- `tests/extension/verify.mjs` loads this extension in Chromium against the real YouTube page and checks the sync.
