// Content safety for generated banter (spec §12.6, v1.3): blocklist (Roman + Devanagari) + length + script checks.
// Lines failing any check are dropped; the client then falls back to prepared or template lines.
import type { Lang } from './sarvam';

const BLOCK = [
  // identity / protected traits
  /\b(religio\w*|hindu|muslim|christian|sikh|jain|caste|dalit|brahmin|race|racist|madrasi|bihari|chinki)\b/i,
  /\b(gay|lesbian|transgender|girly|girlish|like a girl|woman|women|female)\b/i,
  /\b(fat|ugly|bald|dark[- ]skinned|fair[- ]skinned|kaala|kaali|mota|moti)\b/i,
  /\b(mother|mom|mum|maa|sister|behen|father|dad|wife|family)\b/i,
  // profanity / slurs (English + common Hindi in Roman script)
  /\b(fuck\w*|shit\w*|bitch\w*|bastard|asshole|dick|cunt|retard\w*|chutiya|bc|mc|bsdk|bhosd\w*|madarchod|behenchod|gandu|saala|saali|harami|kamina|kutta|kutti)\b/i,
  // betting / money
  /\b(bet|bets|betting|wager|odds|bookie|money|rupees?|₹|\$|lakh|crore|gambl\w*|satta|paisa|paise)\b/i,
  // violence
  /\b(suicide|murder|kill yourself)\b/i,
];
// Devanagari forms of the same families. \b does not work on Devanagari in JS, so whole words are bounded by
// "not a Devanagari letter or sign" on both sides ("साला" is blocked, "मसाला" is not).
const BLOCK_DEV = /(?<![\u0900-\u097F])(हिंदू|हिन्दू|मुस्लिम|मुसलमान|ईसाई|सिख|जाति|दलित|ब्राह्मण|धर्म|मज़हब|चूतिया|चुतिया|मादरचोद|बहनचोद|भोसड़ी|गांडू|साला|साली|हरामी|कमीना|कुत्ता|कुत्ती|मोटा|मोटी|काला|काली|माँ|मां|बहन|बाप|पत्नी|बीवी|सट्टा|पैसा|पैसे|रुपये|रुपया|लाख|करोड़)(?![\u0900-\u097F])/;
const DEVANAGARI = /[ऀ-ॿ]/;

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export function isSafe(s: string): boolean { return !BLOCK.some((re) => re.test(s)) && !BLOCK_DEV.test(s); }

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/^["'“]+|["'”]+$/g, '').trim();

/** A display-only line (Roman script for both languages). */
export function cleanLine(s: unknown, maxWords: number): string | null {
  if (typeof s !== 'string') return null;
  const t = tidy(s);
  if (!t || wordCount(t) > maxWords || t.length > 160 || !isSafe(t) || DEVANAGARI.test(t)) return null;
  return t;
}

export interface LinePair { display: string; speech: string }

/** A spoken line {display, speech}. Hinglish speech must contain Devanagari; English speech equals display. */
export function cleanPair(x: unknown, maxWords: number, lang: Lang): LinePair | null {
  if (!x || typeof x !== 'object') return null;
  const display = cleanLine((x as { display?: unknown }).display, maxWords);
  if (!display) return null;
  if (lang === 'en') return { display, speech: display };
  const raw = (x as { speech?: unknown }).speech;
  if (typeof raw !== 'string') return null;
  const speech = tidy(raw);
  if (!speech || speech.length > 240 || !DEVANAGARI.test(speech) || !isSafe(speech)) return null;
  return { display, speech };
}
