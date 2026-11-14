# ADR-0004: Living with Gemini free-tier limits

**Finding (2026-11-14).** The project's free tier allows **5 requests/minute per model** for `gemini-3.5-flash` and
`gemini-3.6-flash`; a single run initially made ~30 calls and hit 429s within a minute.

**Decision.**
1. *Batch*: `/api/react` generates every friend line **and** every user card line for the next ~60 s of replay in one call
   (look-ahead prefetch). A run now makes ~5–8 Gemini calls plus replies, catch-up and wrap.
2. *Model chain with cooldown*: quotas are per model, so a 429/503 cools that model for 60 s and the next one is tried:
   3.5-flash → 3.6-flash → 3.5-flash-lite → 3.1-flash-lite → flash-lite-latest. Live replies hedge after 2.5 s; prefetch after 6 s.
3. *Safety net*: `npm run precompute` stores lines + Sarvam audio for every planned beat/card (default loyalties).
   Order at runtime: live → precomputed → template. The UI tags each line "live AI", "AI, prepared" or "fallback".

**Recommendation to owner.** Enable billing on the Google AI Studio project before submission (several reviewers at once
would otherwise mostly see the safety net). This is a cost decision for the owner.
