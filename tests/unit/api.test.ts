// @vitest-environment node
// §17.3 API tests with mocked upstreams.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const gem = (body: unknown, status = 200) => new Response(JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] } : { error: {} }), { status });
const req = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://x/api/${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-forwarded-for': String(Math.random()), ...headers } });
const linesBody = { kind: 'tease', moment: { ruleId: 'R1', headline: 'Kishan out', fact: 'Kishan out for 61.' }, speaker: { name: 'You' }, target: { name: 'Ritu' }, matchState: 'IND 116/3' };

beforeEach(() => {
  vi.restoreAllMocks(); vi.resetModules();
  process.env.GEMINI_API_KEY = 'test-key'; process.env.SARVAM_API_KEY = 'test-key-2';
  delete process.env.ALLOWED_ORIGIN;
});

describe('/api/lines', () => {
  it('200 with safe, short lines', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gem({ lines: ['Ritu, your hero walked off early!', 'Sorry Ritu, Kishan is gone.', 'what a fucking shot'] })));
    const { POST } = await import('../../api/lines');
    const r = await POST(req('lines', linesBody));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.lines).toEqual(['Ritu, your hero walked off early!', 'Sorry Ritu, Kishan is gone.']); // unsafe line dropped
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
    const f = vi.fn().mockResolvedValueOnce(gem({}, 429)).mockResolvedValue(gem({ lines: ['Ritu, tough luck!'] }));
    vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/lines');
    const r = await POST(req('lines', linesBody));
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

describe('/api/speak and /api/transcribe', () => {
  it('rejects speakers outside the gang allowlist', async () => {
    const { POST } = await import('../../api/speak');
    expect((await POST(req('speak', { text: 'hi', speaker: 'someone_else' }))).status).toBe(400);
  });
  it('returns mp3 audio for an allowed speaker', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ audios: [Buffer.from('ID3fake').toString('base64')] }))));
    const { POST } = await import('../../api/speak');
    const r = await POST(req('speak', { text: 'Bhai, what an over', speaker: 'dev_en_conversational' }));
    expect(r.status).toBe(200); expect(r.headers.get('content-type')).toBe('audio/mpeg');
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
    const f = vi.fn().mockResolvedValueOnce(gem({}, 503)).mockResolvedValueOnce(gem({}, 503)).mockResolvedValue(gem({ lines: ['Ritu, ouch!'] }));
    vi.stubGlobal('fetch', f);
    const { POST } = await import('../../api/lines');
    expect((await POST(req('lines', linesBody))).status).toBe(200);
    const { modelChain } = await import('../../api/_lib/gemini');
    expect(modelChain().length).toBe(5); // nothing dropped, cooled ones moved to the back
  });
});
