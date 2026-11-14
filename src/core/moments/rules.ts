// Moment engine: deterministic rules R1–R7 (spec §4.2 F-A). Pure functions.
import type { Match, Member, Moment, ID } from '../types';
import { buildSnapshots, endsOver, type Snapshot } from '../replay/scoreboard';

export const R3_OVER_RUNS = 15;
/** R6 (adapted, see ADR-0003): chase finish is near — first ball where need ≤ 24 and ≤ 30 balls left,
 * OR the spec's original condition (last 2 overs and need ≤ 2× balls left). Fires once. */
export function isR6(s: Snapshot): boolean {
  if (s.innings !== 2 || s.need === undefined || s.ballsLeft === undefined || s.need <= 0) return false;
  const near = s.need <= 24 && s.ballsLeft <= 30;
  const spec = s.ballsLeft <= 12 && s.need <= 2 * s.ballsLeft;
  return near || spec;
}

export function detectAll(match: Match, members: Member[], snaps = buildSnapshots(match)): Moment[] {
  const out: Moment[] = [];
  const P = new Map(match.players.map((p) => [p.id, p]));
  const name = (id: ID) => P.get(id)?.short ?? id;
  const heroOf = (pid: ID) => members.filter((m) => m.loyalty.heroId === pid);
  const villainOf = (pid: ID) => members.filter((m) => m.loyalty.villainId === pid);
  let r6Fired = false;

  for (const b of match.balls) {
    const s = snaps[b.seq];
    const mk = (m: Omit<Moment, 'id' | 'ballSeq'>) => out.push({ ...m, id: `${m.ruleId}-${b.seq}-${m.ownerId ?? 'all'}`, ballSeq: b.seq });

    if (b.wicket) {
      const outId = b.wicket.playerOutId;
      const line = s.batters[outId];
      for (const m of heroOf(outId)) mk({ ruleId: 'R1', playerId: outId, ownerId: m.id, victimId: m.id, severity: 3,
        headline: `${name(outId)} out for ${line?.runs ?? 0} — ${m.isSelf ? 'your' : `${m.name}'s`} hero`,
        fact: `${name(outId)} is out for ${line?.runs ?? 0} off ${line?.balls ?? 0}, ${b.wicket.kind} off ${name(b.bowlerId)}.` });
      for (const m of villainOf(outId)) mk({ ruleId: 'R2', playerId: outId, ownerId: m.id, severity: 2,
        headline: `${name(outId)} gone — ${m.isSelf ? 'your' : `${m.name}'s`} villain`,
        fact: `${name(outId)} is out for ${line?.runs ?? 0}, ${b.wicket.kind} off ${name(b.bowlerId)}.` });
    }
    // R3: expensive over by a hero bowler (evaluated on the over's last delivery)
    if (endsOver(match, b.seq) && s.overRuns >= R3_OVER_RUNS) {
      for (const m of heroOf(b.bowlerId)) mk({ ruleId: 'R3', playerId: b.bowlerId, ownerId: m.id, victimId: m.id, severity: 2,
        headline: `${s.overRuns} off ${name(b.bowlerId)}'s over — ${m.isSelf ? 'your' : `${m.name}'s`} hero`,
        fact: `${name(b.bowlerId)} has just gone for ${s.overRuns} runs in one over (${s.thisOver.join(' ')}).` });
    }
    // R4: six off a hero bowler
    if (b.runsBat === 6) {
      for (const m of heroOf(b.bowlerId)) mk({ ruleId: 'R4', playerId: b.bowlerId, ownerId: m.id, victimId: m.id, severity: 1,
        headline: `${name(b.batterId)} hits ${m.isSelf ? 'your' : `${m.name}'s`} hero ${name(b.bowlerId)} for SIX`,
        fact: `${name(b.batterId)} smashes ${name(b.bowlerId)} for six.` });
    }
    // R5: milestones by a hero (batting 50/100; bowling 3rd wicket)
    const bat = s.batters[b.batterId];
    const before = bat ? bat.runs - b.runsBat : 0;
    for (const mark of [50, 100]) {
      if (bat && before < mark && bat.runs >= mark) {
        for (const m of heroOf(b.batterId)) mk({ ruleId: 'R5', playerId: b.batterId, ownerId: m.id, severity: 2,
          headline: `${mark} up for ${name(b.batterId)} — ${m.isSelf ? 'your' : `${m.name}'s`} hero`,
          fact: `${name(b.batterId)} reaches ${mark} off ${bat.balls} balls.` });
      }
    }
    const bw = s.bowlers[b.bowlerId];
    if (b.wicket && b.wicket.kind !== 'run out' && bw?.wickets === 3) {
      for (const m of heroOf(b.bowlerId)) mk({ ruleId: 'R5', playerId: b.bowlerId, ownerId: m.id, severity: 2,
        headline: `Three-wicket haul for ${name(b.bowlerId)}`, fact: `${name(b.bowlerId)} now has 3 wickets.` });
    }
    // R6: chase tension / finish near (once)
    if (!r6Fired && isR6(s)) {
      r6Fired = true;
      mk({ ruleId: 'R6', severity: 3, headline: `${s.need} needed off ${s.ballsLeft}`,
        fact: `${match.teams.find((t) => t.id === match.chasing)!.short} need ${s.need} off ${s.ballsLeft} balls with ${10 - s.wickets} wickets in hand.` });
    }
    // R7: final ball
    if (b.seq === match.balls.length - 1) {
      mk({ ruleId: 'R7', severity: 3, headline: match.result, fact: `${match.result}. Final ball: ${b.text}` });
    }
  }
  return out;
}

/** Rate limit for the user's cards: max one card per over, except R1/R2 (spec §4.2). */
export function cardsForUser(match: Match, moments: Moment[], selfId: ID): Moment[] {
  const seenOver = new Set<string>();
  const res: Moment[] = [];
  for (const m of moments) {
    if (m.ruleId === 'R6' || m.ruleId === 'R7') continue;
    // user gets a card when a friend is the victim (tease), user is victim (comeback), or user owns R2/R5 (brag)
    const relevant = m.victimId ? true : m.ownerId === selfId;
    if (!relevant) continue;
    const b = match.balls[m.ballSeq];
    const key = `${b.innings}-${b.over}`;
    if (m.ruleId !== 'R1' && m.ruleId !== 'R2' && seenOver.has(key)) continue;
    seenOver.add(key);
    res.push(m);
  }
  // one card per ball: prefer highest severity
  const byBall = new Map<number, Moment>();
  for (const m of res) { const cur = byBall.get(m.ballSeq); if (!cur || m.severity > cur.severity) byBall.set(m.ballSeq, m); }
  return [...byBall.values()].sort((a, b) => a.ballSeq - b.ballSeq);
}

export type CardKind = 'tease' | 'comeback' | 'brag';
export function cardKind(m: Moment, selfId: ID): CardKind {
  if (m.victimId === selfId) return 'comeback';
  if (m.victimId) return 'tease';
  return 'brag';
}
