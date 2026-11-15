// POST /api/speak — friend voice via Sarvam Bulbul TTS. The speaker must be in the gang allowlist FOR THAT LANGUAGE
// (a persona's language must match language_code, ADR-0013). Returns audio/mpeg; x-voice-model says which model voiced it.
import { handler, preflight, readJson, ApiError } from './_lib/http';
import { SpeakReq, parse } from './_lib/schemas';
import { tts, TTS_MODEL } from './_lib/sarvam';
import { SPEAKERS_BY_LANG } from '../src/content/gang';
import { isSafe } from './_lib/safety';

const cache = new Map<string, Uint8Array>(); // per function instance

export const POST = handler('speak', async (req) => {
  const body = parse(SpeakReq, await readJson(req));
  if (!SPEAKERS_BY_LANG[body.language].includes(body.speaker)) throw new ApiError('BAD_REQUEST', 'Unknown speaker');
  if (!isSafe(body.text)) throw new ApiError('BAD_REQUEST', 'Text not allowed');
  const key = `${body.language}|${body.speaker}|${body.text}`;
  let audio = cache.get(key);
  if (!audio) {
    audio = await tts(body.text, body.speaker, body.language);
    if (cache.size > 300) cache.clear();
    cache.set(key, audio);
  }
  return new Response(audio, { status: 200, headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store', 'x-voice-model': TTS_MODEL() } });
});

export const OPTIONS = preflight;
