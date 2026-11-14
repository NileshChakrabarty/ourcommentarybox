// Deterministic fallback lines (spec §12.8). Used only when live AI and precomputed lines are unavailable.
import type { RuleId } from '../core/types';
import type { Intent } from '../core/friends/director';

type Vars = { target?: string; player?: string; runs?: string | number; need?: string | number; balls?: string | number };
const fill = (s: string, v: Vars) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k as keyof Vars] ?? ''));

export const CARD_TEMPLATES: Record<'tease' | 'comeback' | 'brag', Partial<Record<RuleId, string[]>> & { any: string[] }> = {
  tease: {
    R1: ['{player} gone for {runs}. {target}, any words?', '{target}, your hero just walked off. Tissues?', 'Shhh, {target}. Let it sink in.'],
    R3: ['{target}, your hero just gifted that over.', 'Is {player} bowling or doing charity, {target}?', '{target}, maybe switch heroes at the break?'],
    R4: ['{target}, that one is still in the air.', '{player} getting smashed, {target}. Thoughts?', 'Row Z says thanks, {target}.'],
    any: ['{target}, this is your moment to stay quiet.', 'Big one, {target}. Want to talk about it?', 'Somebody check on {target}.'],
  },
  comeback: {
    any: ['One over does not make a match.', 'Talk to me at the end of the innings.', 'Even legends have off days. Relax.'],
  },
  brag: {
    R2: ['Told you {player} would not last.', 'Called it. {player} gone.', 'That is the wicket I wanted.'],
    R5: ['{player}, take a bow. Told you all.', 'Write it down: {player} delivers.', 'Who doubted {player}? Hands up.'],
    any: ['Called it. Bow down.', 'Prediction king, right here.', 'Never doubt me again.'],
  },
};

export function cardTemplate(kind: 'tease' | 'comeback' | 'brag', rule: RuleId, v: Vars): string[] {
  const t = CARD_TEMPLATES[kind];
  return (t[rule] ?? t.any).map((s) => fill(s, v));
}

export const BEAT_TEMPLATES: Record<Intent, string[]> = {
  setup: ['Okay gang, phones down. This is the bit that matters.', 'Big moment coming up. Everyone watching?', 'Here we go. Nobody move from your seats.'],
  chatter: ['Tight stuff. Nobody breathe.', 'Come on India, one good over.', 'This is tense, bhai.', 'Hmm. Not loving this.', 'Okay, okay. Keep going.'],
  lament: ['No no no. Not now.', 'I cannot watch this.', 'Why does this always happen to me?'],
  tease: ['{target}, you okay there?', 'Oh {target}, that has to hurt.', '{target}, still confident?'],
  gloat: ['Gone! Exactly what I wanted.', 'Bye bye. Best ball of the day.', 'Told you all. Gone.'],
  brag: ['Yes! What a player.', 'Who doubted him? Hands up.', 'That is my guy. Take a bow.'],
  hype: ['Fine, fine, that was good.', 'Okay, I will give you that one.'],
  nudge_away: ['Quiet patch coming. Go grab a chai, we will call you when something happens.'],
  callback: ['Get back here, now! Something is happening.', 'Where are you? Come back, you need to see this.'],
  final: ['That is it. What a day.', 'Done. I need a minute.'],
  reply: ['Haha, we will see about that.', 'Big words. Let us see the next over.'],
  call_brag: ['Called it! Who is the expert now?', 'Prediction on point. Bow.'],
  call_lose: ['Wrong call, champ. Stick to watching.', 'Your call, your shame.'],
};
export function beatTemplate(intent: Intent, seed: number, v: Vars): string {
  const arr = BEAT_TEMPLATES[intent];
  return fill(arr[seed % arr.length], v);
}
