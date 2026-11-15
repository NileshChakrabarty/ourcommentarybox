// Sarvam AI: Bulbul TTS and Saaras STT (REST). Parameters verified on docs.sarvam.ai on 2026-11-16 (ADR-0013):
//  - TTS: language_code hi-IN | en-IN; bulbul:v4-flash personas are "<name>_<lang>_<style>" and must match the language.
//    Hindi words should arrive in Devanagari (romanised Hindi "significantly reduces output quality").
//  - STT: saaras:v3 with mode "translit" returns Roman (Latin) script for Hindi, English and code-mixed speech;
//    language_code "unknown" auto-detects. saaras:v4 has no mode (native script), so it is used for English only.
import { ApiError } from './http';

export type Lang = 'hi' | 'en';
export const TTS_LANG: Record<Lang, string> = { hi: 'hi-IN', en: 'en-IN' };
export const TTS_MODEL = () => process.env.SARVAM_TTS_MODEL?.trim() || 'bulbul:v4-flash';
export const STT_CONFIG: Record<Lang, { model: string; mode?: string; language_code: string }> = {
  hi: { model: 'saaras:v3', mode: 'translit', language_code: 'unknown' },
  en: { model: 'saaras:v4', language_code: 'en-IN' },
};

const key = () => {
  const k = process.env.SARVAM_API_KEY?.trim();
  if (!k) throw new ApiError('UPSTREAM_ERROR', 'Voice not configured.');
  return k;
};

export async function tts(text: string, speaker: string, lang: Lang = 'en', timeoutMs = 6_000): Promise<Uint8Array> {
  const r = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST', signal: AbortSignal.timeout(timeoutMs),
    headers: { 'api-subscription-key': key(), 'content-type': 'application/json' },
    body: JSON.stringify({
      text, speaker, language_code: TTS_LANG[lang], model: TTS_MODEL(),
      output_audio_codec: 'mp3', speech_sample_rate: 24000,
    }),
  }).catch((e) => { throw new ApiError(e.name === 'TimeoutError' ? 'TIMEOUT' : 'UPSTREAM_ERROR', 'TTS failed'); });
  if (!r.ok) throw new ApiError(r.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR', `TTS ${r.status}`);
  const data = await r.json();
  const b64: string | undefined = data.audios?.[0];
  if (!b64) throw new ApiError('UPSTREAM_ERROR', 'TTS empty');
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

export async function stt(file: Blob, filename: string, lang: Lang = 'en', timeoutMs = 8_000): Promise<string> {
  const cfg = STT_CONFIG[lang];
  const fd = new FormData();
  fd.append('file', file, filename);
  fd.append('model', lang === 'en' ? process.env.SARVAM_STT_MODEL?.trim() || cfg.model : cfg.model);
  if (cfg.mode) fd.append('mode', cfg.mode);
  fd.append('language_code', cfg.language_code);
  const r = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST', signal: AbortSignal.timeout(timeoutMs), headers: { 'api-subscription-key': key() }, body: fd,
  }).catch((e) => { throw new ApiError(e.name === 'TimeoutError' ? 'TIMEOUT' : 'UPSTREAM_ERROR', 'STT failed'); });
  if (!r.ok) throw new ApiError(r.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR', `STT ${r.status}`);
  const data = await r.json();
  return String(data.transcript ?? '').trim();
}
