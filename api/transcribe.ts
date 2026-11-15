// POST /api/transcribe — user's clip → text via Sarvam Saaras STT. Audio is not stored.
// v1.3: language "hi" (default) accepts Hindi, English and code-mixed speech and returns Roman-script Hinglish
// (saaras:v3, mode translit); "en" uses saaras:v4 en-IN (ADR-0013).
import { handler, preflight, json, ApiError } from './_lib/http';
import { stt } from './_lib/sarvam';

const MAX_BYTES = 500_000;
const OK_TYPES = /^audio\/(webm|ogg|mp4|mpeg|wav|x-wav|aac|m4a)/;

export const POST = handler('transcribe', async (req) => {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_BYTES + 10_000) throw new ApiError('TOO_LARGE', 'Clip too large.');
  let fd: FormData;
  try { fd = await req.formData(); } catch { throw new ApiError('BAD_REQUEST', 'Expected multipart form data.'); }
  const file = fd.get('audio');
  if (!(file instanceof Blob)) throw new ApiError('BAD_REQUEST', 'Missing audio.');
  if (file.size > MAX_BYTES) throw new ApiError('TOO_LARGE', 'Clip too large.');
  if (!OK_TYPES.test(file.type)) throw new ApiError('UNSUPPORTED', 'Unsupported audio type.');
  const ext = file.type.includes('mp4') || file.type.includes('aac') || file.type.includes('m4a') ? 'm4a' : file.type.includes('ogg') ? 'ogg' : file.type.includes('wav') ? 'wav' : file.type.includes('mpeg') ? 'mp3' : 'webm';
  const lang = fd.get('language') === 'en' ? 'en' : 'hi';
  const text = await stt(file, `clip.${ext}`, lang);
  return json({ text });
});

export const OPTIONS = preflight;
