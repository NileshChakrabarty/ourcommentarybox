// Assemble the whole room plan from match + gang + live config. Pure and deterministic → fully testable, and lets the
// client prefetch live AI for upcoming balls (look-ahead on the video timeline).
import type { LiveConfig, Match, Member, Moment, ID } from './types';
import { buildSnapshots, type Snapshot } from './replay/scoreboard';
import { detectAll, cardsForUser } from './moments/rules';
import { planBeats, scriptPoints, type Beat, type ScriptPoints, type Times } from './friends/director';

export interface RoomPlan {
  snaps: Snapshot[];
  moments: Moment[];
  cards: Moment[];           // moment cards the user will see
  beats: Beat[];             // simulated friends' lines: on a ball, or timed (breaks, join line, nudge)
  nudges: ScriptPoints['nudges'];
  callOffers: ScriptPoints['callOffers'];
}

export function buildPlan(match: Match, members: Member[], selfId: ID, tl: Times, live: LiveConfig, opts: { gangCalls?: boolean } = {}): RoomPlan {
  const snaps = buildSnapshots(match);
  const moments = detectAll(match, members, snaps);
  const cards = cardsForUser(match, moments, selfId).filter((m) => m.ballSeq >= live.joinBallSeq && m.ballSeq <= live.endBallSeq);
  const beats = planBeats(match, members, moments, selfId, tl, live, snaps);
  const sp = scriptPoints(match, tl, live, opts);
  return { snaps, moments, cards, beats, nudges: sp.nudges, callOffers: sp.callOffers };
}
