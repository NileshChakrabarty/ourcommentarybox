// Content safety for generated banter (spec §12.6): blocklist + length checks. Lines failing are dropped.
const BLOCK = [
  // identity / protected traits
  /\b(religio\w*|hindu|muslim|christian|sikh|caste|dalit|brahmin|race|racist)\b/i,
  /\b(gay|lesbian|transgender|girly|girlish|like a girl|woman|women|female)\b/i,
  /\b(fat|ugly|bald|dark[- ]skinned|fair[- ]skinned)\b/i,
  /\b(mother|mom|mum|maa|sister|behen|father|dad|wife|family)\b/i,
  // profanity / slurs (English + common Hindi)
  /\b(fuck\w*|shit\w*|bitch\w*|bastard|asshole|dick|cunt|retard\w*|chutiya|bc|mc|bsdk|madarchod|behenchod|gandu|saala|saali)\b/i,
  // betting / money
  /\b(bet|bets|betting|wager|odds|bookie|money|rupees?|₹|\$|lakh|crore|gambl\w*|satta)\b/i,
  // violence
  /\b(suicide|murder|kill yourself)\b/i,
];
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export function isSafe(s: string): boolean { return !BLOCK.some((re) => re.test(s)); }
export function cleanLine(s: unknown, maxWords: number): string | null {
  if (typeof s !== 'string') return null;
  const t = s.replace(/\s+/g, ' ').trim().replace(/^["'“]+|["'”]+$/g, '').trim();
  if (!t || wordCount(t) > maxWords || t.length > 160 || !isSafe(t)) return null;
  return t;
}
