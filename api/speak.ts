// POST /api/speak — friend voice via Sarvam Bulbul TTS. Speaker must be in the gang allowlist. Returns audio/mpeg.
import { handler, readJson, ApiError } from './_lib/http';
import { SpeakReq, parse } from './_lib/schemas';
import { tts } from './_lib/sarvam';
import { SPEAKERS } from '../src/content/gang';
import { isSafe } from './_lib/safety';

const cache = new Map<string, Uint8Array>(); // per function instance

export const POST = handler('speak', async (req) => {
  const body = parse(SpeakReq, await readJson(req));
  if (!SPEAKERS.includes(body.speaker)) throw new ApiError('BAD_REQUEST', 'Unknown speaker');
  if (!isSafe(body.text)) throw new ApiError('BAD_REQUEST', 'Text not allowed');
  const key = `${body.speaker}|${body.text}`;
  let audio = cache.get(key);
  if (!audio) {
    audio = await tts(body.text, body.speaker);
    if (cache.size > 300) cache.clear();
    cache.set(key, audio);
  }
  return new Response(audio, { status: 200, headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
});
