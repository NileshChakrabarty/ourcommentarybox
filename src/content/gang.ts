// Demo gang — SIMULATED friends created by the build (spec §1.1 #5, v1.2: all India fans).
// Heroes are Indian players, villains are England's bowlers. Owner reviews before shipping.
// Shared by client and server (server uses SPEAKERS as the TTS allowlist and looks personas up by id).
import type { Member } from '../core/types';

export const SELF_ID = 'me';

export const FRIENDS: Member[] = [
  {
    id: 'dev', name: 'Dev', isSelf: false, isSimulated: true, colour: '#ff8a3d',
    speaker: 'dev_en_conversational',
    persona: 'Loud, loyal India fan who worships Virat Kohli and takes every Kohli failure personally. The eternal optimist.',
    style: 'Dramatic, exaggerates, calls everyone "bhai", always sure India will win from anywhere.',
    loyalty: { teamId: 'IND', heroId: 'v-kohli', villainId: 'dj-willey' },
  },
  {
    id: 'ritu', name: 'Ritu', isSelf: false, isSimulated: true, colour: '#f06bb5',
    speaker: 'ritu_en_reels',
    persona: "Rishabh Pant superfan and the sharpest tongue in the gang. Keeps receipts on everyone's bad predictions.",
    style: 'Deadpan sarcasm, short punchy lines, loves quoting your own words back at you.',
    loyalty: { teamId: 'IND', heroId: 'rr-pant', villainId: 'ba-carse' },
  },
  {
    id: 'sunny', name: 'Sunny', isSelf: false, isSimulated: true, colour: '#5cc8ff',
    speaker: 'sunny_en_social',
    persona: 'The gang pessimist. India fan who always expects a collapse, a Yuzvendra Chahal loyalist, and secretly happiest when proved right.',
    style: 'Calm, doom-laden one-liners, "told you so" energy, dry humour.',
    loyalty: { teamId: 'IND', heroId: 'ys-chahal', villainId: 'rjw-topley' },
  },
];

export const SPEAKERS = FRIENDS.map((f) => f.speaker!) as string[];

/** Your default side for the demo: India, Rohit Sharma your hero, Reece Topley the bowler you love to hate. */
export const DEFAULT_SELF_LOYALTY = { teamId: 'IND', heroId: 'rg-sharma', villainId: 'rjw-topley' };

/** Heroes offered on the start screen (India batters in this match). */
export const HERO_CHOICES = ['rg-sharma', 's-dhawan', 'v-kohli', 'rr-pant', 'sa-yadav', 'hh-pandya', 'ra-jadeja'];
