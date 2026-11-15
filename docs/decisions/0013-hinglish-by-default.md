# ADR-0013: Hinglish by default, verified Sarvam parameters

**Date:** 2026-11-16 · **Status:** Accepted (v1.3 change request §2)

## Decision

The banter is **Hinglish by default**, with a small toggle for English (app bar, and on `/how-it-works`). The choice is
stored in this browser (`localStorage`, key `acb-lang`). Switching mid-match keeps what was already said and
re-requests everything not yet said in the new language.

**Every spoken line is `{display, speech}`.**
- `display` is what the panel shows. It is Roman script for both languages.
- `speech` is what Sarvam voices. For Hinglish it is the same line with Hindi words in **Devanagari**; English and
  cricket words and player names may stay in Latin script.
- For English, `speech` equals `display`.

This applies to `/api/react` (friend lines and card options), `/api/lines` and `/api/reply`. The catch-up and the wrap
are read, not voiced, so they stay display-only (Roman Hinglish).

**Safety is checked on both forms.**
- The blocklist now covers Hindi in Roman script and in Devanagari: religion, caste, region, body, family, profanity,
  betting.
- Devanagari terms are bounded by "not a Devanagari letter", so "मसाला" (masala) is not caught by "साला".
- A Hinglish line is dropped if its `display` contains Devanagari or its `speech` has none.
- The prompts ask for natural, desi, wholesome, cricket-literate banter, and forbid religion, region, caste and body.

## Sarvam parameters (checked against docs.sarvam.ai on 2026-11-16, then with live calls)

| | Hinglish | English |
|---|---|---|
| TTS `language_code` | `hi-IN` | `en-IN` |
| TTS model | `bulbul:v4-flash` | `bulbul:v4-flash` |
| STT | `saaras:v3`, `mode: "translit"`, `language_code: "unknown"` | `saaras:v4`, `language_code: "en-IN"` |

- **The request field is `language_code`.** The change request said `target_language_code`; the current API calls it
  `language_code`, as ADR-0002 already noted.
- **Personas are per language.** bulbul:v4-flash personas are named `<name>_<lang>_<style>`, and the docs pair `_hi_`
  personas with `hi-IN`. Each friend therefore has one voice per language, and `/api/speak` only accepts the persona
  allowed for the requested language.
- **Romanised Hindi sounds bad.** The docs say romanised Hindi input "significantly reduces output quality". That is
  why `speech` uses Devanagari.
- **Only saaras:v3 gives Roman script.** `mode` exists only on `saaras:v3`. `translit` returns Roman (Latin) script for
  Hindi, English and code-mixed speech, which is what the panel shows. `saaras:v4` returns native script, so it is used
  only for English.

| Friend | English voice | Hinglish voice | Why |
|---|---|---|---|
| Dev (loud optimist) | `dev_en_conversational` | `ratan_hi_sports` | No `dev_hi_*` persona exists; a "sports" style suits the loud fan |
| Ritu (deadpan) | `ritu_en_reels` | `ritu_hi_reels` | Same persona family, Hindi variant |
| Sunny (pessimist) | `sunny_en_social` | `sunny_hi_reels` | Same persona family, Hindi variant |

Verified live on 2026-11-16:
- All three Hindi voices returned mp3 for a Devanagari + English line, in about 1 s each.
- That audio went back through STT and came out as *"Are yaar Rohit out. Yeh topli toh aaj aag ugal raha hai."*:
  Roman Hinglish, as intended.

## Consequences

- The safety net (`npm run precompute`) is generated in both languages and keyed `${lang}:${id}`. Template lines
  exist in both languages too.
- The owner should listen to the three Hindi voices (`docs/voice-samples/` can be regenerated) and swap a persona in
  `src/content/gang.ts` if one doesn't fit.
