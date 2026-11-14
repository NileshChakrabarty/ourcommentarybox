// Smoke test: confirms GEMINI_API_KEY and SARVAM_API_KEY work. Never prints key values.
// Run: node --env-file=.env scripts/smoke.mjs
const G = process.env.GEMINI_API_KEY?.trim();
const S = process.env.SARVAM_API_KEY?.trim();
const scrub = (s) => String(s).split(G || '\u0000').join('[GEMINI_KEY]').split(S || '\u0000').join('[SARVAM_KEY]');
const out = (name, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${scrub(detail)}`);
let failures = 0;

async function gemini() {
  if (!G) { failures++; return out('gemini', false, 'GEMINI_API_KEY missing in env'); }
  const base = 'https://generativelanguage.googleapis.com/v1beta';
  const h = { 'x-goog-api-key': G, 'content-type': 'application/json' };
  const lr = await fetch(`${base}/models?pageSize=200`, { headers: h });
  if (!lr.ok) { failures++; return out('gemini list-models', false, `HTTP ${lr.status}`); }
  const models = (await lr.json()).models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace('models/', ''));
  const flash = models.filter((m) => /^gemini-[\d.]+-flash(-lite)?$/.test(m) || /flash(-lite)?-latest$/.test(m));
  out('gemini list-models', true, `HTTP 200 · flash-class: ${flash.join(', ') || '(none)'}`);
  const pick = process.env.GEMINI_MODEL_FAST || 'gemini-3.5-flash';
  const t0 = Date.now();
  const r = await fetch(`${base}/models/${pick}:generateContent`, {
    method: 'POST', headers: h, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with exactly: ok' }] }], generationConfig: { thinkingConfig: { thinkingBudget: 0 } } }),
  });
  const ok = r.ok;
  const txt = ok ? (await r.json()).candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() : `HTTP ${r.status}`;
  if (!ok) failures++;
  out('gemini generate', ok, `model=${pick} · ${Date.now() - t0}ms · reply="${String(txt).slice(0, 40)}"`);
}

async function sarvam() {
  if (!S) { failures++; return out('sarvam', false, 'SARVAM_API_KEY missing in env'); }
  const t0 = Date.now();
  const r = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST', headers: { 'api-subscription-key': S, 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Six! Into the stands at Hamilton.', language_code: 'en-IN', model: 'bulbul:v4-flash', speaker: 'ashwin_en_sports' }),
  });
  if (!r.ok) { failures++; return out('sarvam tts', false, `HTTP ${r.status} ${(await r.text()).slice(0, 160)}`); }
  const wav = Buffer.from((await r.json()).audios[0], 'base64');
  out('sarvam tts', true, `model=bulbul:v4-flash · ${Date.now() - t0}ms · ${wav.length} bytes wav`);

  const fd = new FormData();
  fd.append('file', new Blob([wav], { type: 'audio/wav' }), 'smoke.wav');
  fd.append('model', 'saaras:v4');
  fd.append('language_code', 'en-IN');
  const t1 = Date.now();
  const s = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': S }, body: fd });
  if (!s.ok) { failures++; return out('sarvam stt', false, `HTTP ${s.status} ${(await s.text()).slice(0, 160)}`); }
  out('sarvam stt', true, `model=saaras:v4 · ${Date.now() - t1}ms · transcript="${(await s.json()).transcript}"`);
}

await gemini().catch((e) => { failures++; out('gemini', false, e.message); });
await sarvam().catch((e) => { failures++; out('sarvam', false, e.message); });
process.exit(failures ? 1 : 0);
