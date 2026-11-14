// Gemini via REST (fetch) with JSON output, hard timeout, and a model chain (ADR-0004):
// free-tier quotas are per model (5 RPM), so a 429 cools that model for 60 s and the next model is tried.
// Hedging: if a model hasn't answered after hedgeMs, the next one starts too; first valid answer wins.
import { ApiError } from './http';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const HEDGE_MS = 2_500;

interface GenOpts { system: string; user: string; temperature?: number; maxTokens?: number; timeoutMs?: number; model?: string; hedgeMs?: number }

const COOLDOWN_MS = 60_000;
const cooling = new Map<string, number>(); // model → until (per function instance)
const isLite = (m: string) => /lite/.test(m);

export function modelChain(preferred?: string): string[] {
  const env = (k: string) => process.env[k]?.trim() || undefined;
  const chain = [preferred, env('GEMINI_MODEL_FAST') ?? 'gemini-3.5-flash', env('GEMINI_MODEL_FALLBACK') ?? 'gemini-3.6-flash',
    ...(env('GEMINI_MODEL_EXTRA') ?? 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest').split(',').map((x) => x.trim())]
    .filter((m): m is string => !!m);
  const uniq = [...new Set(chain)];
  const now = Date.now();
  const ready = uniq.filter((m) => (cooling.get(m) ?? 0) <= now);
  // ready models first; cooling ones stay as a last resort so one 503 can't leave the chain empty
  return [...ready, ...uniq.filter((m) => !ready.includes(m))];
}

async function callModel(model: string, o: GenOpts, signal: AbortSignal): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new ApiError('UPSTREAM_ERROR', 'AI not configured.');
  const r = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST', signal,
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: o.system }] },
      contents: [{ role: 'user', parts: [{ text: o.user }] }],
      generationConfig: {
        temperature: o.temperature ?? 0.9, maxOutputTokens: o.maxTokens ?? 300, responseMimeType: 'application/json',
        ...(isLite(model) ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
      },
    }),
  });
  if (r.status === 429 || r.status === 503) cooling.set(model, Date.now() + COOLDOWN_MS);
  if (!r.ok) throw new ApiError(r.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR', `Gemini ${r.status}`);
  const data = await r.json();
  const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  try { return JSON.parse(text); } catch { throw new ApiError('UPSTREAM_ERROR', 'Gemini returned non-JSON'); }
}

/** Try models in order; start the next one on failure or after HEDGE_MS (max 3 attempts). First valid answer wins. */
export async function generateJSON<T>(o: GenOpts, validate: (x: unknown) => T): Promise<{ data: T; model: string }> {
  const chain = modelChain(o.model).slice(0, 3);
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), o.timeoutMs ?? 8_000);
  const timers: ReturnType<typeof setTimeout>[] = [];
  try {
    return await new Promise((resolve, reject) => {
      let done = false, next = 0, failed = 0;
      let lastErr: unknown = new ApiError('UPSTREAM_ERROR', 'AI failed');
      const launch = () => {
        if (done || next >= chain.length) return;
        const m = chain[next++];
        callModel(m, o, ctl.signal).then((x) => ({ data: validate(x), model: m })).then(
          (v) => { if (!done) { done = true; resolve(v); } },
          (e) => {
            lastErr = e; failed++;
            if (failed >= chain.length) { if (!done) { done = true; reject(lastErr); } } else launch();
          },
        );
        timers.push(setTimeout(launch, o.hedgeMs ?? HEDGE_MS));
      };
      launch();
      ctl.signal.addEventListener('abort', () => { if (!done) { done = true; reject(new ApiError('TIMEOUT', 'AI timed out')); } });
    });
  } finally {
    clearTimeout(timeout); timers.forEach(clearTimeout);
    ctl.abort();
  }
}
