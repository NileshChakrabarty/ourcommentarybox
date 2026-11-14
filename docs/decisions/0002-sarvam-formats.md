# ADR-0002: Sarvam API formats and models (verified 2026-11-14)

Verified on docs.sarvam.ai and with a live smoke test (`npm run smoke`):

- TTS: `POST https://api.sarvam.ai/text-to-speech`, header `api-subscription-key`. The language field is **`language_code`**
  (the spec's `target_language_code` is outdated). Model **`bulbul:v4-flash`** (latest; v4 speakers are named like
  `dev_en_conversational`). Response JSON `{ audios: [base64] }`. We request `output_audio_codec: "mp3"` at 24 kHz
  (~40 KB per line).
- STT: `POST https://api.sarvam.ai/speech-to-text`, multipart `file`, `model: "saaras:v4"` (current default), `language_code: "en-IN"`.
  Response `{ transcript }`. Accepts WebM/Opus and MP4 from MediaRecorder.

Voices chosen (owner to approve): Dev `dev_en_conversational`, Ritu `ritu_en_reels`, Sunny `sunny_en_social`.
