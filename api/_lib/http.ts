// Shared HTTP helpers for the AI proxy: JSON responses, errors, per-IP rate limit, origin check, body limits.
export type ErrCode = 'RATE_LIMITED' | 'BAD_REQUEST' | 'UPSTREAM_ERROR' | 'TIMEOUT' | 'TOO_LARGE' | 'UNSUPPORTED' | 'FORBIDDEN';
const STATUS: Record<ErrCode, number> = { RATE_LIMITED: 429, BAD_REQUEST: 400, UPSTREAM_ERROR: 502, TIMEOUT: 504, TOO_LARGE: 413, UNSUPPORTED: 415, FORBIDDEN: 403 };

export class ApiError extends Error { constructor(public code: ErrCode, message: string) { super(message); } }

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export const fail = (code: ErrCode, message: string) => json({ error: { code, message } }, STATUS[code]);

// In-memory sliding window per function instance (best-effort on serverless; fine for a demo).
const hits = new Map<string, number[]>();
export function rateLimit(req: Request, bucket: string) {
  const perMin = Number(process.env.RATE_LIMIT_PER_MIN || 60);
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= perMin) throw new ApiError('RATE_LIMITED', 'Too many requests, slow down.');
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5_000) hits.clear();
}

/** ALLOWED_ORIGIN: comma-separated origins, e.g. "https://apnabox.example,chrome-extension://<id>" (ADR-0017). */
const allowedOrigins = () => (process.env.ALLOWED_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function checkOrigin(req: Request) {
  const list = allowedOrigins();
  if (!list.length) return; // dev / unset → allow
  const origin = req.headers.get('origin');
  if (origin && !list.includes(origin)) throw new ApiError('FORBIDDEN', 'Origin not allowed.');
}

/** CORS for the Chrome extension's side panel (a chrome-extension:// origin). Production: only listed origins.
 *  Dev (ALLOWED_ORIGIN unset): only localhost and chrome-extension origins, so the unpacked extension works locally. */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin) return {};
  const list = allowedOrigins();
  const ok = list.length ? list.includes(origin) : /^chrome-extension:\/\/[a-p]{32}$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return ok ? { 'access-control-allow-origin': origin, vary: 'origin', 'access-control-expose-headers': 'x-voice-model' } : {};
}
const withHeaders = (res: Response, h: Record<string, string>) => {
  if (!Object.keys(h).length) return res;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(h)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
};

/** OPTIONS preflight (the extension sends JSON, so the browser asks first). */
export async function preflight(req: Request): Promise<Response> {
  try { checkOrigin(req); } catch { return fail('FORBIDDEN', 'Origin not allowed.'); }
  const h = corsHeaders(req);
  if (!h['access-control-allow-origin']) return new Response(null, { status: 204 });
  return new Response(null, { status: 204, headers: { ...h, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '600' } });
}

export async function readJson<T>(req: Request, maxBytes = 16_000): Promise<T> {
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new ApiError('TOO_LARGE', 'Request body too large.');
  try { return JSON.parse(new TextDecoder().decode(buf)) as T; } catch { throw new ApiError('BAD_REQUEST', 'Invalid JSON.'); }
}

/** Wrap a handler: method check, origin, rate limit, uniform errors, latency log (no user content logged). */
export function handler(name: string, fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const t0 = Date.now();
    try {
      checkOrigin(req);
      rateLimit(req, name);
      const res = await fn(req);
      console.log(`[api] ${name} ${res.status} ${Date.now() - t0}ms`);
      return withHeaders(res, corsHeaders(req));
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('UPSTREAM_ERROR', 'Upstream failed.');
      console.warn(`[api] ${name} ${err.code} ${Date.now() - t0}ms ${e instanceof ApiError ? e.message : (e as Error).name}`); // reason only, never user content
      return withHeaders(fail(err.code, err.message), err.code === 'FORBIDDEN' ? {} : corsHeaders(req));
    }
  };
}
