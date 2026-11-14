// Assemble the whole room plan from match + gang + chapters. Pure and deterministic → fully testable, and lets the
// client prefetch live AI for upcoming balls (look-ahead on the video timeline).
import type { Chapter, Match, Member, Moment, ID } from './types';
import { buildSnapshots, type Snapshot } from './replay/scoreboard';
import { detectAll, cardsForUser } from './moments/rules';
import { planBeats, scriptPoints, type Beat, type ScriptPoints } from './friends/director';

export interface RoomPlan {
  snaps: Snapshot[];
  moments: Moment[];
  cards: Moment[];           // moment cards the user will see
  beats: Beat[];             // simulated friends' ball-anchored lines
  nudges: ScriptPoints['nudges'];
  callbacks: ScriptPoints['callbacks'];
  callOffers: ScriptPoints['callOffers'];
}

export function buildPlan(match: Match, members: Member[], selfId: ID, chapters: Chapter[] = []): RoomPlan {
  const snaps = buildSnapshots(match);
  const moments = detectAll(match, members, snaps);
  const cards = cardsForUser(match, moments, selfId);
  const beats = planBeats(match, members, moments, selfId, chapters, snaps);
  const sp = scriptPoints(match, chapters);
  return { snaps, moments, cards, beats, nudges: sp.nudges, callbacks: sp.callbacks, callOffers: sp.callOffers };
}
