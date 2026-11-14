// Sarvam AI: Bulbul TTS and Saaras STT (REST). Formats verified on docs.sarvam.ai 2026-11-14 (ADR-0002).
import { ApiError } from './http';

const key = () => {
  const k = process.env.SARVAM_API_KEY?.trim();
  if (!k) throw new ApiError('UPSTREAM_ERROR', 'Voice not configured.');
  return k;
};

export async function tts(text: string, speaker: string, timeoutMs = 6_000): Promise<Uint8Array> {
  const r = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST', signal: AbortSignal.timeout(timeoutMs),
    headers: { 'api-subscription-key': key(), 'content-type': 'application/json' },
    body: JSON.stringify({
      text, speaker, language_code: 'en-IN',
      model: process.env.SARVAM_TTS_MODEL?.trim() || 'bulbul:v4-flash',
      output_audio_codec: 'mp3', speech_sample_rate: 24000,
    }),
  }).catch((e) => { throw new ApiError(e.name === 'TimeoutError' ? 'TIMEOUT' : 'UPSTREAM_ERROR', 'TTS failed'); });
  if (!r.ok) throw new ApiError(r.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR', `TTS ${r.status}`);
  const data = await r.json();
  const b64: string | undefined = data.audios?.[0];
  if (!b64) throw new ApiError('UPSTREAM_ERROR', 'TTS empty');
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

export async function stt(file: Blob, filename: string, timeoutMs = 8_000): Promise<string> {
  const fd = new FormData();
  fd.append('file', file, filename);
  fd.append('model', process.env.SARVAM_STT_MODEL?.trim() || 'saaras:v4');
  fd.append('language_code', 'en-IN');
  const r = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST', signal: AbortSignal.timeout(timeoutMs), headers: { 'api-subscription-key': key() }, body: fd,
  }).catch((e) => { throw new ApiError(e.name === 'TimeoutError' ? 'TIMEOUT' : 'UPSTREAM_ERROR', 'STT failed'); });
  if (!r.ok) throw new ApiError(r.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR', `STT ${r.status}`);
  const data = await r.json();
  return String(data.transcript ?? '').trim();
}
