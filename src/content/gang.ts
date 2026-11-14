// Demo gang — SIMULATED friends created by the build (spec §1.1 #5). Owner reviews before shipping.
// Shared by client and server (server uses SPEAKERS as the TTS allowlist).
import type { Member } from '../core/types';

export const SELF_ID = 'me';

export const FRIENDS: Member[] = [
  {
    id: 'dev', name: 'Dev', isSelf: false, isSimulated: true, colour: '#ff7a1a',
    speaker: 'dev_en_conversational',
    persona: 'Loud, loyal India fan and swing-bowling purist. Worships Bhuvi, takes every boundary off him personally.',
    style: 'Dramatic, exaggerates, calls everyone "bhai", quick to blame the pitch.',
    loyalty: { teamId: 'IND', heroId: 'b-kumar', villainId: 'tl-seifert' },
  },
  {
    id: 'ritu', name: 'Ritu', isSelf: false, isSimulated: true, colour: '#e879f9',
    speaker: 'ritu_en_reels',
    persona: 'Ishan Kishan superfan and the sharpest tongue in the gang. Keeps receipts on everyone\'s bad takes.',
    style: 'Deadpan sarcasm, short punchy lines, loves a callback to someone\'s earlier prediction.',
    loyalty: { teamId: 'IND', heroId: 'ishan-kishan', villainId: 'af-milne' },
  },
  {
    id: 'sunny', name: 'Sunny', isSelf: false, isSimulated: true, colour: '#38bdf8',
    speaker: 'sunny_en_social',
    persona: 'The contrarian. Backs New Zealand "because somebody has to", Tim Seifert fanboy, loves annoying the India fans.',
    style: 'Cheerful troll, smug when NZ score, overly calm when they lose a wicket.',
    loyalty: { teamId: 'NZ', heroId: 'tl-seifert', villainId: 'ss-iyer' },
  },
];

export const SPEAKERS = FRIENDS.map((f) => f.speaker!) as string[];

export const DEFAULT_SELF_LOYALTY = { teamId: 'IND', heroId: 'cv-varun', villainId: 'gd-phillips' };
