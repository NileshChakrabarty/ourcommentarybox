# ADR-0001: Static SPA + thin serverless AI proxy

Status: accepted (2026-11-14)

**Context.** One reviewer, simulated friends, a static past match, and "the link must always work" (spec §7, §8.1).

**Decision.** Vite + React + TypeScript single-page app, with Vercel Functions in `api/` written in the Web signature
(`export async function POST(req: Request): Promise<Response>`). In local dev a small Vite middleware (`vite.config.ts`) serves
the same files so there is one code path. Keys exist only in the function environment; `scripts/check-bundle.mjs` fails the build
if a key, key name or auth header appears in `dist/` (FR-025).

**Consequences.** No database or real-time server. Memories live in the viewer's IndexedDB. Gemini is called with `fetch`
rather than the `@google/genai` SDK to keep full control of timeouts, model fallback and response format.
`src/content/gang.ts` is shared by client and server (the server uses it as the persona source and TTS speaker allowlist),
instead of `public/data/gang.json`, so personas cannot be injected from the client.
