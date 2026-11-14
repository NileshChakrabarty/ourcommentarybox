import type { Ball, Match, ID } from '../types';

export interface BatterLine { id: ID; runs: number; balls: number; fours: number; sixes: number; out: boolean }
export interface BowlerLine { id: ID; legal: number; runs: number; wickets: number }
export interface Snapshot {
  seq: number; innings: 1 | 2;
  runs: number; wickets: number; legalBalls: number;
  overs: string;              // "15.3"
  striker?: BatterLine; nonStriker?: BatterLine;
  bowler?: BowlerLine;
  batters: Record<ID, BatterLine>;
  bowlers: Record<ID, BowlerLine>;
  thisOver: string[];         // tokens for the current over: "0","4","6","W","1wd"
  overRuns: number;           // runs conceded in current over (bowler-chargeable)
  /** innings 2 only */
  need?: number; ballsLeft?: number; rrr?: number;
  crr: number;
  firstInningsTotal?: number;
}

export const oversText = (legal: number) => `${Math.floor(legal / 6)}.${legal % 6}`;
export function ballToken(b: Ball): string {
  if (b.wicket) return 'W';
  if (b.extraType === 'wd') return `${b.extras > 1 ? b.extras : ''}wd`;
  if (b.extraType === 'nb') return `${b.runsBat || ''}nb`;
  if (b.extraType === 'lb' || b.extraType === 'b') return `${b.extras}${b.extraType}`;
  return String(b.runsBat);
}
export const isLegal = (b: Ball) => b.extraType !== 'wd' && b.extraType !== 'nb';
export const bowlerRuns = (b: Ball) => b.runsBat + (b.extraType === 'wd' || b.extraType === 'nb' ? b.extras : 0);

/** Snapshot after each delivery, index = seq. Pure. */
export function buildSnapshots(match: Match): Snapshot[] {
  const out: Snapshot[] = [];
  let batters: Record<ID, BatterLine> = {};
  let bowlers: Record<ID, BowlerLine> = {};
  let curInnings = 0;
  let thisOver: string[] = [];
  let overRuns = 0;
  let curOver = -1;
  let firstTotal: number | undefined;
  for (const b of match.balls) {
    if (b.innings !== curInnings) {
      if (curInnings === 1) firstTotal = out.at(-1)!.runs;
      curInnings = b.innings; batters = {}; bowlers = {}; curOver = -1;
    }
    if (b.over !== curOver) { thisOver = []; overRuns = 0; curOver = b.over; }
    const bat = (batters[b.batterId] ??= { id: b.batterId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false });
    batters[b.nonStrikerId] ??= { id: b.nonStrikerId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    batters = { ...batters, [b.batterId]: { ...bat, runs: bat.runs + b.runsBat, balls: bat.balls + (b.extraType === 'wd' ? 0 : 1), fours: bat.fours + (b.runsBat === 4 ? 1 : 0), sixes: bat.sixes + (b.runsBat === 6 ? 1 : 0) } };
    if (b.wicket) batters[b.wicket.playerOutId] = { ...batters[b.wicket.playerOutId], out: true };
    const bw = bowlers[b.bowlerId] ?? { id: b.bowlerId, legal: 0, runs: 0, wickets: 0 };
    bowlers = { ...bowlers, [b.bowlerId]: { ...bw, legal: bw.legal + (isLegal(b) ? 1 : 0), runs: bw.runs + bowlerRuns(b), wickets: bw.wickets + (b.wicket && b.wicket.kind !== 'run out' ? 1 : 0) } };
    thisOver = [...thisOver, ballToken(b)];
    overRuns += bowlerRuns(b);
    const legal = b.legalBallsAfter;
    const runs = b.scoreAfter.runs;
    const snap: Snapshot = {
      seq: b.seq, innings: b.innings, runs, wickets: b.scoreAfter.wickets, legalBalls: legal,
      overs: oversText(legal),
      striker: batters[b.batterId], nonStriker: batters[b.nonStrikerId], bowler: bowlers[b.bowlerId],
      batters, bowlers, thisOver, overRuns,
      crr: legal ? (runs * 6) / legal : 0,
      firstInningsTotal: firstTotal,
    };
    if (b.innings === 2) {
      snap.need = Math.max(0, match.target - runs);
      snap.ballsLeft = 120 - legal;
      snap.rrr = snap.ballsLeft > 0 ? (snap.need * 6) / snap.ballsLeft : 0;
    }
    out.push(snap);
  }
  return out;
}

/** True if this delivery is the last of its over (or of the innings). */
export function endsOver(match: Match, seq: number): boolean {
  const b = match.balls[seq];
  const n = match.balls[seq + 1];
  return !n || n.innings !== b.innings || n.over !== b.over;
}
