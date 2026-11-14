// Gang Calls (F-CALLS): one-tap predictions for an over; bragging rights only, no points, no money. Pure.
import type { CallType, GangCall, Match, Member } from './types';

export function overBalls(match: Match, innings: 1 | 2, over: number) {
  return match.balls.filter((b) => b.innings === innings && b.over === over);
}
const hits = (type: CallType, b: Match['balls'][number]) => (type === 'wicket' ? !!b.wicket : b.runsBat === 6);

/** Final result of a call once its over is complete. */
export function resolveCall(match: Match, call: Pick<GangCall, 'innings' | 'over' | 'type'>): 'won' | 'lost' {
  return overBalls(match, call.innings, call.over).some((b) => hits(call.type, b)) ? 'won' : 'lost';
}
/**
 * Status of a call after ball `seq` has been revealed: a call is WON the moment its event happens
 * (no waiting out a long DRS review), LOST only when the over ends without it.
 */
export function callStatusAt(match: Match, call: Pick<GangCall, 'innings' | 'over' | 'type'>, seq: number): GangCall['status'] {
  const balls = overBalls(match, call.innings, call.over);
  if (balls.some((b) => b.seq <= seq && hits(call.type, b))) return 'won';
  return balls.length && seq >= balls[balls.length - 1].seq ? 'lost' : 'open';
}
export const CALL_LABEL: Record<CallType, string> = { wicket: 'Wicket this over', six: 'Six this over' };

/** Simulated friends call by persona: the optimist backs a six for his side, the pessimist calls a wicket. */
export function friendCall(friend: Pick<Member, 'id' | 'loyalty'>, battingTeam: string, over: number): CallType {
  const batting = friend.loyalty.teamId === battingTeam;
  if (friend.id === 'sunny') return batting ? 'wicket' : 'six';   // always expects the worst for India
  if (friend.id === 'ritu') return over % 2 === 0 ? 'wicket' : 'six'; // contrarian, flips each over
  return batting ? 'six' : 'wicket';                               // Dev: eternal optimist
}
