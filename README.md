# Fun-Banter

Your gang's voice commentary, synced to the ball, floating beside whatever you're streaming.
Demo for the Dream11 FDE intern assignment: a replay of the **5th T20I, New Zealand v India, Hamilton, 1 Nov 2026**,
with three **simulated** friends whose lines are written live by Google Gemini and voiced by Sarvam AI.

## Run locally

```bash
npm install
cp .env.example .env      # then put GEMINI_API_KEY and SARVAM_API_KEY in .env (never commit it)
npm run smoke             # checks both keys work (prints PASS/FAIL only, never the keys)
npm run dev               # http://localhost:5173  (add ?speed=4 to fast-forward while testing)
```

## Test

```bash
npm test                  # unit + API tests (Vitest): rules R1–R7, sync, pacing, clock, data vs scorecard, safety, endpoints
npm run test:e2e          # Playwright: full journey (live AI), AI-offline journey, mic denied, reload-resume, hold-to-talk
E2E_NO_LIVE=1 npm run test:e2e   # skip the live-AI journey (no API usage)
npm run build             # typecheck + build + fails if any key/auth header leaks into dist/
```

## Data and AI

- `npm run data` converts `data/raw/1539436.json` (Cricsheet, ODC-By, attribution in the app footer) into `public/data/match.json`.
  Ball descriptions are original, facts-only text.
- `npm run precompute` builds the **safety net** (`public/data/precomputed.json`, `public/audio/friends/*.mp3`) with the same prompts
  as the live path. It is used only when a live call is late or fails. Review: `docs/precomputed-review.md`.
- AI proxy endpoints (`api/`): `react` (batched friend lines + user cards), `lines`, `reply`, `speak`, `transcribe`, `catchup`, `wrap`.
  All validate input (Zod), rate-limit per IP, filter unsafe lines, and degrade to fallbacks.

## Deploy (Vercel)

Set in project settings: `GEMINI_API_KEY`, `SARVAM_API_KEY`, `ALLOWED_ORIGIN` (the production URL), and optionally the model vars
from `.env.example`. `vercel.json` builds with `npm run build` and serves `dist/` plus `api/*.ts` functions.

## Structure

`src/core` pure logic (no React/DOM) · `src/panel` the portable product panel (never imports `src/shell`) · `src/shell` demo-only
fake browser + broadcast · `src/services` side effects (AI client, audio, storage, engine) · `api/` serverless proxy ·
`docs/decisions` ADRs · `docs/progress.md` task log.
