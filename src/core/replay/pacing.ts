// Compress ~236 deliveries into a ~3.5-minute replay: slow on key balls, fast-forward the rest. Pure.
import type { Match } from '../types';

export type Weight = 'major' | 'key' | 'lead' | 'normal';
export interface PaceConfig {
  targetMs: number;       // whole replay duration target
  majorMs: number;        // severity-3 moments (hero wicket, call-back, final)
  keyMs: number;          // other moments / friend beats
  leadMs: number;         // the ball just before a key ball (build-up)
  minMs: number;          // fastest fast-forward ball
  maxNormalMs: number;
  inningsBreakMs: number;
  callOfferMs: number;    // pause before an over when a Gang Call is offered
  innings2Weight: number; // normal balls in the chase get this much more time than innings 1
}
export const DEFAULT_PACE: PaceConfig = {
  targetMs: 210_000, majorMs: 8_500, keyMs: 6_000, leadMs: 1_600, minMs: 220, maxNormalMs: 1_400,
  inningsBreakMs: 4_000, callOfferMs: 4_500, innings2Weight: 1.8,
};

export interface PaceInput { weights: Map<number, Weight>; callOfferBeforeSeq: Set<number> }

export function pace(match: Match, input: PaceInput, cfg: PaceConfig = DEFAULT_PACE): number[] {
  const n = match.balls.length;
  const w: Weight[] = match.balls.map((b) => input.weights.get(b.seq) ?? 'normal');
  // lead-in balls
  for (let i = 1; i < n; i++) if ((w[i] === 'major' || w[i] === 'key') && w[i - 1] === 'normal') w[i - 1] = 'lead';
  const dur = new Array<number>(n).fill(0);
  const extra = new Array<number>(n).fill(0);
  let fixed = 0;
  let normalUnits = 0;
  match.balls.forEach((b, i) => {
    if (w[i] === 'major') dur[i] = cfg.majorMs;
    else if (w[i] === 'key') dur[i] = cfg.keyMs;
    else if (w[i] === 'lead') dur[i] = cfg.leadMs;
    else normalUnits += b.innings === 2 ? cfg.innings2Weight : 1;
    fixed += dur[i];
    const next = match.balls[i + 1];
    if (next && next.innings !== b.innings) extra[i] += cfg.inningsBreakMs;
    if (next && input.callOfferBeforeSeq.has(next.seq)) extra[i] += cfg.callOfferMs;
  });
  const extras = extra.reduce((a, b) => a + b, 0);
  const unit = Math.min(cfg.maxNormalMs, Math.max(cfg.minMs, (cfg.targetMs - fixed - extras) / Math.max(1, normalUnits)));
  return match.balls.map((b, i) => (w[i] === 'normal' ? Math.round(unit * (b.innings === 2 ? cfg.innings2Weight : 1)) : dur[i]) + extra[i]);
}

/** Portion of a slot spent on "bowler running in" before the result is revealed. */
export const anticipationMs = (durationMs: number) => Math.min(900, Math.round(durationMs * 0.28));
