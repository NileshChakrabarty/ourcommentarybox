// Assemble the whole room plan from match + gang. Pure and deterministic → fully testable, and lets the
// client prefetch live AI for upcoming balls (look-ahead).
import type { Match, Member, Moment, ID } from './types';
import { buildSnapshots, type Snapshot } from './replay/scoreboard';
import { detectAll, cardsForUser } from './moments/rules';
import { planBeats, scriptPoints, type Beat } from './friends/director';
import { pace, DEFAULT_PACE, type PaceConfig, type Weight } from './replay/pacing';

export interface RoomPlan {
  snaps: Snapshot[];
  moments: Moment[];
  cards: Moment[];           // moment cards the user will see
  beats: Beat[];             // simulated friends' ball-anchored lines
  durations: number[];
  nudgeSeq: number;
  r6Seq?: number;
  callOffers: { innings: 1 | 2; over: number; beforeSeq: number }[];
}

export function buildPlan(match: Match, members: Member[], selfId: ID, cfg: PaceConfig = DEFAULT_PACE): RoomPlan {
  const snaps = buildSnapshots(match);
  const moments = detectAll(match, members, snaps);
  const cards = cardsForUser(match, moments, selfId);
  const beats = planBeats(match, members, moments, selfId);
  const sp = scriptPoints(match);
  const callOffers = sp.callOffers.map((c) => ({ ...c, beforeSeq: match.balls.find((b) => b.innings === c.innings && b.over === c.over)!.seq }));

  const weights = new Map<number, Weight>();
  const bump = (seq: number, w: Weight) => { const cur = weights.get(seq); if (cur !== 'major') weights.set(seq, w); };
  for (const m of moments) bump(m.ballSeq, m.severity === 3 ? 'major' : 'key');
  for (const c of cards) bump(c.ballSeq, 'key');
  for (const b of beats) bump(b.seq, 'key');
  bump(sp.nudgeSeq, 'key');
  for (const b of match.balls) if (b.wicket && !weights.has(b.seq)) weights.set(b.seq, 'lead');

  const durations = pace(match, { weights, callOfferBeforeSeq: new Set(callOffers.map((c) => c.beforeSeq)) }, cfg);
  return { snaps, moments, cards, beats, durations, nudgeSeq: sp.nudgeSeq, r6Seq: moments.find((m) => m.ruleId === 'R6')?.ballSeq, callOffers };
}
