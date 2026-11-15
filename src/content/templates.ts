// Deterministic fallback lines (spec §12.8). Used only when live AI and precomputed lines are unavailable.
// Shown as text (not voiced). v1.3: Hinglish (Roman script) by default, English on the toggle.
import type { RuleId } from '../core/types';
import type { Intent } from '../core/friends/director';
import type { Lang } from '../services/lang';

type Vars = { target?: string; player?: string; runs?: string | number; need?: string | number; balls?: string | number };
const fill = (s: string, v: Vars) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k as keyof Vars] ?? ''));
type CardSet = Record<'tease' | 'comeback' | 'brag', Partial<Record<RuleId, string[]>> & { any: string[] }>;

export const CARD_TEMPLATES: Record<Lang, CardSet> = {
  en: {
    tease: {
      R1: ['{player} gone for {runs}. {target}, any words?', '{target}, your hero just walked off. Tissues?', 'Shhh, {target}. Let it sink in.'],
      R3: ['{target}, your hero just gifted that over.', 'Is {player} bowling or doing charity, {target}?', '{target}, maybe switch heroes at the break?'],
      R4: ['{target}, that one is still in the air.', '{player} getting smashed, {target}. Thoughts?', 'Row Z says thanks, {target}.'],
      any: ['{target}, this is your moment to stay quiet.', 'Big one, {target}. Want to talk about it?', 'Somebody check on {target}.'],
    },
    comeback: { any: ['One over does not make a match, {target}.', 'Talk to me at the end of the innings, {target}.', 'Even legends have off days. Relax.'] },
    brag: {
      R2: ['Told you {player} would not last.', 'Called it. {player} gone.', 'That is the wicket I wanted.'],
      R5: ['{player}, take a bow. Told you all.', 'Write it down: {player} delivers.', 'Who doubted {player}? Hands up.'],
      any: ['Called it. Bow down.', 'Prediction king, right here.', 'Never doubt me again.'],
    },
  },
  hi: {
    tease: {
      R1: ['{player} {runs} pe gaya. {target}, kuch bolna hai?', '{target}, tera hero toh chal diya yaar. Tissue chahiye?', 'Shhh {target}, thoda sink in hone de.'],
      R3: ['{target}, tere hero ne poora over gift kar diya.', '{player} bowling kar raha hai ya charity, {target}?', '{target}, break mein hero badal le bhai.'],
      R4: ['{target}, woh ball abhi bhi hawa mein hai.', '{player} ki dhulai ho rahi hai, {target}. Kya bolta hai?', 'Stands wale thank you bol rahe hain, {target}.'],
      any: ['{target}, abhi chup rehne ka time hai.', 'Bada moment hai {target}, baat karni hai?', 'Koi {target} ko check karo yaar.'],
    },
    comeback: { any: ['Ek over se match nahi banta, {target}.', 'Innings khatam hone de, phir baat kar {target}.', 'Legends ka bhi off day hota hai. Relax kar.'] },
    brag: {
      R2: ['Bola tha na, {player} nahi tikega.', 'Called it. {player} gaya.', 'Yahi wicket chahiye tha mujhe.'],
      R5: ['{player}, take a bow. Maine bola tha.', 'Likh ke le lo: {player} deliver karta hai.', '{player} pe kisko doubt tha? Haath upar.'],
      any: ['Called it. Jhuk ja.', 'Prediction king yahan baitha hai.', 'Mujh pe kabhi doubt mat karna.'],
    },
  },
};

export function cardTemplate(kind: 'tease' | 'comeback' | 'brag', rule: RuleId, v: Vars, lang: Lang = 'hi'): string[] {
  const t = CARD_TEMPLATES[lang][kind];
  return (t[rule] ?? t.any).map((s) => fill(s, v));
}

export const BEAT_TEMPLATES: Record<Lang, Record<Intent, string[]>> = {
  en: {
    setup: ['We are live, gang. Phones down, this is the bit that matters.', 'Joined just in time. Everyone watching?', 'Here we go. Nobody move from your seats.'],
    chatter: ['Tight stuff. Nobody breathe.', 'Come on India, one good over.', 'This is tense, bhai.', 'Hmm. Not loving this.', 'Okay, okay. Keep going.'],
    lull: ['Watching the replay again. Still hurts.', 'Deep breaths, gang. Long way to go.', 'Okay, new batter. Fresh start.'],
    away: ['Where did they go? Right when it is getting good.', 'Gone for chai already? Classic.'],
    lament: ['No no no. Not now.', 'I cannot watch this.', 'Why does this always happen to me?'],
    tease: ['{target}, you okay there?', 'Oh {target}, that has to hurt.', '{target}, still confident?'],
    gloat: ['Gone! Exactly what I wanted.', 'Bye bye. Best ball of the day.', 'Told you all. Gone.'],
    brag: ['Yes! What a player.', 'Who doubted him? Hands up.', 'That is my guy. Take a bow.'],
    hype: ['Fine, fine, that was good.', 'Okay, I will give you that one.'],
    nudge_away: ['Quiet patch. Step away for twenty seconds, grab a chai, we will catch you up.'],
    callback: ['Get back here, now! Something is happening.', 'Where are you? Come back, you need to see this.'],
    final: ['That is it. What a day.', 'Done. I need a minute.'],
    reply: ['Haha, we will see about that.', 'Big words. Let us see the next over.'],
    call_brag: ['Called it! Who is the expert now?', 'Prediction on point. Bow.'],
    call_lose: ['Wrong call, champ. Stick to watching.', 'Your call, your shame.'],
  },
  hi: {
    setup: ['Live aa gaye gang. Phone neeche, yahi asli time hai.', 'Sahi time pe join kiya. Sab dekh rahe ho na?', 'Chalo shuru. Koi seat se nahi hilega.'],
    chatter: ['Tight hai yaar. Koi saans mat lena.', 'Come on India, bas ek accha over.', 'Bahut tense hai bhai.', 'Hmm. Mujhe yeh pasand nahi aa raha.', 'Theek hai, theek hai. Chalte raho.'],
    lull: ['Replay dekh raha hoon, ab bhi dard ho raha hai.', 'Lambi saans lo gang, abhi bahut match baaki hai.', 'Naya batter aa raha hai. Fresh start.'],
    away: ['Kahan gaya yeh? Abhi toh maza aa raha tha.', 'Chai lene chala gaya? Classic.'],
    lament: ['Nahi nahi nahi. Abhi nahi yaar.', 'Main nahi dekh sakta yeh.', 'Mere saath hi kyun hota hai yeh?'],
    tease: ['{target}, theek hai na tu?', 'Arre {target}, yeh toh dard wala tha.', '{target}, ab bhi confident hai?'],
    gloat: ['Gaya! Bilkul yahi chahiye tha.', 'Bye bye. Din ki best ball.', 'Bola tha na. Gaya.'],
    brag: ['Haan! Kya player hai.', 'Kisko doubt tha? Haath upar.', 'Yeh mera banda hai. Take a bow.'],
    hype: ['Accha theek hai, woh sahi tha.', 'Okay, yeh wala maan liya.'],
    nudge_away: ['Shaant phase hai. Bees second ke liye chai le aa, hum catch up kara denge.'],
    callback: ['Wapas aa abhi! Kuch ho raha hai.', 'Kahan hai tu? Jaldi aa, yeh dekhna padega.'],
    final: ['Bas, khatam. Kya din tha.', 'Ho gaya. Mujhe ek minute chahiye.'],
    reply: ['Haha, dekhte hain.', 'Bade bol hain. Agla over dekh.'],
    call_brag: ['Called it! Ab expert kaun hai?', 'Prediction ekdum sahi. Jhuk ja.'],
    call_lose: ['Galat call, champ. Bas dekhta reh.', 'Teri call, teri sharam.'],
  },
};
export function beatTemplate(intent: Intent, seed: number, v: Vars, lang: Lang = 'hi'): string {
  const arr = BEAT_TEMPLATES[lang][intent];
  return fill(arr[seed % arr.length], v);
}
