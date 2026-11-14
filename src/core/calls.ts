// Gang Calls (F-CALLS): one-tap predictions for an over; bragging rights only. Pure.
import type { CallType, GangCall, Match } from './types';

export function overBalls(match: Match, innings: 1 | 2, over: number) {
  return match.balls.filter((b) => b.innings === innings && b.over === over);
}
export function resolveCall(match: Match, call: Pick<GangCall, 'innings' | 'over' | 'type'>): 'won' | 'lost' {
  const balls = overBalls(match, call.innings, call.over);
  const hit = call.type === 'wicket' ? balls.some((b) => !!b.wicket) : balls.some((b) => b.runsBat === 6);
  return hit ? 'won' : 'lost';
}
export const CALL_LABEL: Record<CallType, string> = { wicket: 'Wicket this over', six: 'Six this over' };

/** Simulated friends' calls: deterministic by persona (NZ backer calls sixes in the chase, etc.). */
export function friendCall(friendTeam: string, battingTeam: string): CallType {
  return friendTeam === battingTeam ? 'six' : 'wicket';
}
