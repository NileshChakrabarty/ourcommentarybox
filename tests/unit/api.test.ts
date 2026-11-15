// @vitest-environment node
// §17.3 API tests with mocked upstreams.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const gem = (body: unknown, status = 200) => new Response(JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] } : { error: {} }), { status });
const req = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://x/api/${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-forwarded-for': String(Math.random()), ...headers } });
const linesBody = { kind: 'tease', moment: { ruleId: 'R1', headline: 'Kishan out', fact: 'Kishan out for 61.' }, speaker: { name: 'You' }, target: { name: 'Ritu' }, matchState: 'IND 116/3' };
const en = (display: string) => ({ display, speech: display });

beforeEach(() => {
  vi.restoreAllMocks(); vi.resetModules();
  process.env.GEMINI_API_KEY = 'test-key'; process.env.SARVAM_API_KEY = 'test-key-2';
  delete process.env.ALLOWED_ORIGIN;
});

describe('/api/lines', () => {
  it('English: 200 with safe, short {display, speech} lines (speech = display)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gem({ lines: [en('Ritu, your hero walked off early!'), en('Sorry Ritu, Kishan is gone.'), en('what a fucking shot')] })));
    const { POST } = await import('../../api/lines');
    const r = await POST(req('lines', { ...linesBody, language: 'en' }));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.lines).toEqual([en('Ritu, your hero walked off early!'), en('Sorry Ritu, Kishan is gone.')]); // unsafe line dropped
    expect(j.language).toBe('en');
  });
  it('Hinglish is the default: every line has Roman display + Devanagari speech; bad scripts and unsafe lines are dropped', async () => {
    const f = vi.fn(async () => gem({ lines: [
      { display: 'Arre Ritu, tera hero toh chal diya!', speech: 'अरे Ritu, तेरा hero तो चल दिया!' },
      { display: 'Ritu, Kishan gaya yaar', speech: 'Ritu, Kishan gaya yaar' },          // speech not in Devanagari → dropped
      { display: 'अरे Ritu', speech: 'अरे Ritu' },                                       // display not Roman → dropped
      { display: 'Ritu, saala kya shot tha', speech: 'Ritu, साला क्या shot था' },        // profanity → dropped
      { display: 'Ritu, ek masala dosa kha le', speech: 'Ritu, एक मसाला डोसा खा ले' },   // "masala" is fine
    ] }));
    vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/lines');
    const j = await (await POST(req('lines', linesBody))).json();
    expect(j.language).toBe('hi');
    expect(j.lines.map((l: { display: string }) => l.display)).toEqual(['Arre Ritu, tera hero toh chal diya!', 'Ritu, ek masala dosa kha le']);
    for (const l of j.lines) { expect(l.display).not.toMatch(/[\u0900-\u097F]/); expect(l.speech).toMatch(/[\u0900-\u097F]/); }
    const sent = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.systemInstruction.parts[0].text).toMatch(/HINGLISH/);
    expect(sent.systemInstruction.parts[0].text).toMatch(/religion, caste, region/);
  });
  it('400 on invalid body, never calls upstream', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/lines');
    expect((await POST(req('lines', { kind: 'nope' }))).status).toBe(400);
    expect((await POST(req('lines', '{bad json'))).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
  it('413 on oversized body', async () => {
    const { POST } = await import('../../api/lines');
    expect((await POST(req('lines', { ...linesBody, pad: 'x'.repeat(20_000) }))).status).toBe(413);
  });
  it('429 when every model is rate limited; 502 on upstream errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gem({}, 429)));
    let { POST } = await import('../../api/lines');
    expect((await POST(req('lines', linesBody))).status).toBe(429);
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async () => gem({}, 500)));
    ({ POST } = await import('../../api/lines'));
    expect((await POST(req('lines', linesBody))).status).toBe(502);
  });
  it('falls through the model chain on 429', async () => {
    const f = vi.fn().mockResolvedValueOnce(gem({}, 429)).mockResolvedValue(gem({ lines: [en('Ritu, tough luck!')] }));
    vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/lines');
    const r = await POST(req('lines', { ...linesBody, language: 'en' }));
    expect(r.status).toBe(200);
    expect(f.mock.calls.length).toBe(2);
  });
  it('504 on timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_, rej) => init.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))))));
    const { generateJSON } = await import('../../api/_lib/gemini');
    await expect(generateJSON({ system: 's', user: 'u', timeoutMs: 50 }, (x) => x)).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('403 from a foreign origin when ALLOWED_ORIGIN is set', async () => {
    process.env.ALLOWED_ORIGIN = 'https://apnacommentarybox.example';
    const { POST } = await import('../../api/lines');
    expect((await POST(req('lines', linesBody, { origin: 'https://evil.example' }))).status).toBe(403);
  });
});

describe('/api/react', () => {
  it('returns {display, speech} per beat and per card option, in the requested language', async () => {
    const f = vi.fn(async () => gem({ lines: { b1: { display: 'Gaya Rohit! Topley ne kar diya kaam.', speech: 'गया Rohit! Topley ने कर दिया काम।' } },
      cards: { c1: [{ display: 'Dev, ek wicket se match nahi banta.', speech: 'Dev, एक wicket से match नहीं बनता।' }] } }));
    vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/react');
    const j = await (await POST(req('react', { matchState: 'IND 4/1', beats: [{ id: 'b1', friendId: 'dev', intent: 'lull', fact: 'Rohit out.' }],
      cards: [{ id: 'c1', kind: 'comeback', headline: 'Rohit out', fact: 'Rohit lbw.' }] }))).json();
    expect(j.lines.b1).toEqual({ display: 'Gaya Rohit! Topley ne kar diya kaam.', speech: 'गया Rohit! Topley ने कर दिया काम।' });
    expect(j.cards.c1[0].speech).toMatch(/[\u0900-\u097F]/);
  });
  it('rejects unknown friends and unknown intents', async () => {
    const { POST } = await import('../../api/react');
    expect((await POST(req('react', { matchState: 'x', beats: [{ id: 'b', friendId: 'mallory', intent: 'tease', fact: 'f' }] }))).status).toBe(400);
    expect((await POST(req('react', { matchState: 'x', beats: [{ id: 'b', friendId: 'dev', intent: 'insult', fact: 'f' }] }))).status).toBe(400);
  });
});

describe('/api/speak and /api/transcribe', () => {
  it('rejects speakers outside the gang allowlist, and voices from the other language', async () => {
    const { POST } = await import('../../api/speak');
    expect((await POST(req('speak', { text: 'hi', speaker: 'someone_else' }))).status).toBe(400);
    expect((await POST(req('speak', { text: 'hi', speaker: 'dev_en_conversational', language: 'hi' }))).status).toBe(400);
    expect((await POST(req('speak', { text: 'hi', speaker: 'ratan_hi_sports', language: 'en' }))).status).toBe(400);
  });
  it('voices Hinglish with hi-IN and a Hindi persona, English with en-IN', async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify({ audios: [Buffer.from('ID3fake').toString('base64')] })));
    vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/speak');
    const r = await POST(req('speak', { text: 'अरे यार, क्या over था', speaker: 'ratan_hi_sports' }));
    expect(r.status).toBe(200); expect(r.headers.get('content-type')).toBe('audio/mpeg'); expect(r.headers.get('x-voice-model')).toBe('bulbul:v4-flash');
    const body = JSON.parse(f.mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({ language_code: 'hi-IN', speaker: 'ratan_hi_sports', model: 'bulbul:v4-flash' });
    await POST(req('speak', { text: 'Bhai, what an over', speaker: 'dev_en_conversational', language: 'en' }));
    expect(JSON.parse(f.mock.calls[1][1]!.body as string)).toMatchObject({ language_code: 'en-IN', speaker: 'dev_en_conversational' });
  });
  it('blocks unsafe Devanagari text before it reaches the voice', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/speak');
    expect((await POST(req('speak', { text: 'तू साला', speaker: 'ratan_hi_sports' }))).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
  it('transcribe: Hinglish asks Sarvam for Roman script (saaras:v3 translit, auto language); English uses saaras:v4 en-IN', async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify({ transcript: 'Arre Dev, tera Kohli kahan hai' })));
    vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/transcribe');
    const mk = (lang?: string) => { const fd = new FormData(); fd.append('audio', new Blob([new Uint8Array(2000)], { type: 'audio/webm' }), 'c'); if (lang) fd.append('language', lang); return new Request('http://x/api/transcribe', { method: 'POST', body: fd, headers: { 'x-forwarded-for': String(Math.random()) } }); };
    expect((await (await POST(mk())).json()).text).toBe('Arre Dev, tera Kohli kahan hai');
    const hi = f.mock.calls[0][1]!.body as FormData;
    expect([hi.get('model'), hi.get('mode'), hi.get('language_code')]).toEqual(['saaras:v3', 'translit', 'unknown']);
    await POST(mk('en'));
    const enFd = f.mock.calls[1][1]!.body as FormData;
    expect([enFd.get('model'), enFd.get('mode'), enFd.get('language_code')]).toEqual(['saaras:v4', null, 'en-IN']);
  });
  it('transcribe: 415 for unsupported type, 413 for too large, 200 for webm', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ transcript: 'Ritu your hero is gone' }))));
    const { POST } = await import('../../api/transcribe');
    const mk = (blob: Blob) => { const fd = new FormData(); fd.append('audio', blob, 'c'); return new Request('http://x/api/transcribe', { method: 'POST', body: fd, headers: { 'x-forwarded-for': String(Math.random()) } }); };
    expect((await POST(mk(new Blob(['x'], { type: 'text/plain' })))).status).toBe(415);
    expect((await POST(mk(new Blob([new Uint8Array(600_000)], { type: 'audio/webm' })))).status).toBe(413);
    const ok = await POST(mk(new Blob([new Uint8Array(2000)], { type: 'audio/webm' })));
    expect(ok.status).toBe(200); expect((await ok.json()).text).toBe('Ritu your hero is gone');
  });
});

describe('rate limit', () => {
  it('429 after the per-minute budget from one IP', async () => {
    process.env.RATE_LIMIT_PER_MIN = '3';
    const { POST } = await import('../../api/speak');
    const h = { 'x-forwarded-for': '9.9.9.9' };
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await POST(req('speak', { text: 'x', speaker: 'bad' }, h))).status);
    expect(codes).toEqual([400, 400, 400, 429]);
    delete process.env.RATE_LIMIT_PER_MIN;
  });
});

describe('model chain', () => {
  it('keeps cooling models as a last resort after a 503', async () => {
    const f = vi.fn().mockResolvedValueOnce(gem({}, 503)).mockResolvedValueOnce(gem({}, 503)).mockResolvedValue(gem({ lines: [en('Ritu, ouch!')] }));
    vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/lines');
    expect((await POST(req('lines', { ...linesBody, language: 'en' }))).status).toBe(200);
    const { modelChain } = await import('../../api/_lib/gemini');
    expect(modelChain().length).toBe(5); // nothing dropped, cooled ones moved to the back
  });
});

describe('CORS for the Chrome extension (ADR-0017)', () => {
  const EXT = 'chrome-extension://' + 'a'.repeat(32);
  const opt = (origin: string) => new Request('http://x/api/react', { method: 'OPTIONS', headers: { origin, 'x-forwarded-for': String(Math.random()) } });
  it('preflight: 204 with CORS headers for a listed origin, 403 for anyone else', async () => {
    process.env.ALLOWED_ORIGIN = `https://apnabox.example,${EXT}`;
    const { OPTIONS } = await import('../../api/react');
    const ok = await OPTIONS(opt(EXT));
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe(EXT);
    expect(ok.headers.get('access-control-allow-methods')).toBe('POST');
    expect((await OPTIONS(opt('chrome-extension://' + 'b'.repeat(32)))).status).toBe(403);
    expect((await OPTIONS(opt('https://evil.example'))).status).toBe(403);
  });
  it('responses carry the CORS header (and expose x-voice-model) only for allowed origins', async () => {
    process.env.ALLOWED_ORIGIN = EXT;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ audios: [Buffer.from('ID3').toString('base64')] }))));
    const { POST } = await import('../../api/speak');
    const r = await POST(req('speak', { text: 'हाँ', speaker: 'ritu_hi_reels' }, { origin: EXT }));
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBe(EXT);
    expect(r.headers.get('access-control-expose-headers')).toContain('x-voice-model');
    expect((await POST(req('speak', { text: 'हाँ', speaker: 'ritu_hi_reels' }, { origin: 'https://evil.example' }))).status).toBe(403);
  });
  it('dev (no ALLOWED_ORIGIN): only localhost and extension origins get CORS headers', async () => {
    const { OPTIONS } = await import('../../api/react');
    expect((await OPTIONS(opt(EXT))).headers.get('access-control-allow-origin')).toBe(EXT);
    expect((await OPTIONS(opt('http://localhost:5173'))).headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect((await OPTIONS(opt('https://evil.example'))).headers.get('access-control-allow-origin')).toBeNull();
  });
});
