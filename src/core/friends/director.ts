// Friends director: decides WHICH simulated friend speaks on WHICH ball and WHY (intent).
// The words are generated live (Gemini) with precomputed/template safety nets. Pure.
import type { Match, Member, Moment, ID } from '../types';

export type Intent = 'lament' | 'tease' | 'gloat' | 'brag' | 'hype' | 'nudge_away' | 'callback' | 'final' | 'reply' | 'call_brag' | 'call_lose';
export interface Beat {
  id: ID; seq: number; friendId: ID; intent: Intent;
  targetId?: ID;     // who it's aimed at (member id)
  momentId?: ID;
  /** compact factual context for the prompt */
  fact: string;
  /** true if the beat does not depend on the user's own loyalties → can be precomputed */
  stable: boolean;
}

export interface ScriptPoints { nudgeSeq: number; callOffers: { innings: 1 | 2; over: number }[] }

/** Scripted product beats for this match (positions derived from data, see ADR-0003). */
export function scriptPoints(match: Match): ScriptPoints {
  const lastOf = (inn: 1 | 2, over: number) => match.balls.filter((b) => b.innings === inn && b.over === over).at(-1)!.seq;
  return {
    nudgeSeq: lastOf(2, 13),                 // end of chase over 14 → "go grab chai, we'll call you"
    callOffers: [{ innings: 1, over: 9 }, { innings: 2, over: 8 }, { innings: 2, over: 16 }],
  };
}

export function planBeats(match: Match, members: Member[], moments: Moment[], selfId: ID): Beat[] {
  const friends = members.filter((m) => m.isSimulated);
  const byId = new Map(members.map((m) => [m.id, m]));
  const team = (id: ID) => byId.get(id)!.loyalty.teamId;
  const beats: Beat[] = [];
  const add = (b: Omit<Beat, 'id'>) => beats.push({ ...b, id: `${b.seq}-${b.friendId}-${b.intent}` });
  /** pick a teaser: prefer a friend backing the other team, not the victim, not already speaking on this seq */
  const teaser = (victimId: ID, seq: number): Member | undefined => {
    const busy = new Set(beats.filter((b) => b.seq === seq).map((b) => b.friendId));
    const pool = friends.filter((f) => f.id !== victimId && !busy.has(f.id));
    const count = (id: ID) => beats.filter((b) => b.friendId === id).length;
    const lastSpeaker = beats.at(-1)?.friendId;
    // rotate: fewest lines so far, avoid repeating the last speaker, then prefer the rival team
    return [...pool].sort((a, b) =>
      count(a.id) - count(b.id) ||
      Number(a.id === lastSpeaker) - Number(b.id === lastSpeaker) ||
      Number(a.loyalty.teamId === team(victimId)) - Number(b.loyalty.teamId === team(victimId)))[0];
  };
  const r4Over = new Set<string>();

  for (const m of moments) {
    const ball = match.balls[m.ballSeq];
    const userInvolved = m.victimId === selfId || m.ownerId === selfId;
    switch (m.ruleId) {
      case 'R1': {
        if (m.victimId !== selfId) add({ seq: m.ballSeq, friendId: m.victimId!, intent: 'lament', momentId: m.id, fact: m.fact, stable: true });
        const t = teaser(m.victimId!, m.ballSeq);
        if (t) add({ seq: m.ballSeq, friendId: t.id, intent: 'tease', targetId: m.victimId, momentId: m.id, fact: m.fact, stable: !userInvolved });
        if (m.victimId === selfId) { const t2 = teaser(m.victimId!, m.ballSeq); if (t2) add({ seq: m.ballSeq, friendId: t2.id, intent: 'tease', targetId: selfId, momentId: m.id, fact: m.fact, stable: false }); }
        break;
      }
      case 'R2': {
        if (m.ownerId !== selfId && !beats.some((b) => b.seq === m.ballSeq && b.friendId === m.ownerId)) {
          const victim = moments.find((x) => x.ballSeq === m.ballSeq && x.ruleId === 'R1')?.victimId;
          add({ seq: m.ballSeq, friendId: m.ownerId!, intent: 'gloat', targetId: victim, momentId: m.id, fact: m.fact, stable: victim !== selfId });
        }
        break;
      }
      case 'R3':
      case 'R4': {
        const key = `${ball.innings}-${ball.over}-${m.victimId}`;
        if (m.ruleId === 'R4') { if (r4Over.has(key)) break; r4Over.add(key); }
        const t = teaser(m.victimId!, m.ballSeq);
        if (t) add({ seq: m.ballSeq, friendId: t.id, intent: 'tease', targetId: m.victimId, momentId: m.id, fact: m.fact, stable: m.victimId !== selfId });
        break;
      }
      case 'R5': {
        if (m.ownerId !== selfId) add({ seq: m.ballSeq, friendId: m.ownerId!, intent: 'brag', momentId: m.id, fact: m.fact, stable: true });
        else { const t = teaser(selfId, m.ballSeq); if (t) add({ seq: m.ballSeq, friendId: t.id, intent: 'hype', targetId: selfId, momentId: m.id, fact: m.fact, stable: false }); }
        break;
      }
      case 'R6': {
        const chaser = friends.find((f) => f.loyalty.teamId === match.chasing) ?? friends[0];
        add({ seq: m.ballSeq, friendId: chaser.id, intent: 'callback', targetId: selfId, momentId: m.id, fact: m.fact, stable: true });
        break;
      }
      case 'R7': {
        const winnerTeam = match.chasing; // chasing side won this match; kept general below
        const won = friends.find((f) => f.loyalty.teamId === winnerTeam);
        const lost = friends.find((f) => f.loyalty.teamId !== winnerTeam);
        if (won) add({ seq: m.ballSeq, friendId: won.id, intent: 'final', momentId: m.id, fact: `${m.fact} ${won.name}'s team won.`, stable: true });
        if (lost) add({ seq: m.ballSeq, friendId: lost.id, intent: 'final', momentId: m.id, fact: `${m.fact} ${lost.name}'s team lost.`, stable: true });
        break;
      }
    }
  }
  const sp = scriptPoints(match);
  const nz = friends.find((f) => f.loyalty.teamId === match.chasing) ?? friends[0];
  add({ seq: sp.nudgeSeq, friendId: nz.id, intent: 'nudge_away', targetId: selfId,
    fact: 'Middle overs of the chase. Tell your friend to step away and grab chai; you will call them back when the finish gets close.', stable: true });

  // cap: max 2 friend beats per ball, keep order by importance
  const order: Intent[] = ['callback', 'final', 'lament', 'tease', 'gloat', 'brag', 'hype', 'nudge_away'];
  const bySeq = new Map<number, Beat[]>();
  for (const b of beats) bySeq.set(b.seq, [...(bySeq.get(b.seq) ?? []), b]);
  const res: Beat[] = [];
  for (const [, list] of [...bySeq.entries()].sort((a, b) => a[0] - b[0])) {
    const uniq = list.filter((b, i) => list.findIndex((x) => x.friendId === b.friendId) === i);
    res.push(...uniq.sort((a, b) => order.indexOf(a.intent) - order.indexOf(b.intent)).slice(0, 2));
  }
  return res;
}
