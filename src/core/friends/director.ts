// Friends director: decides WHICH simulated friend speaks, WHEN and WHY (intent). Pure and deterministic.
// The words are generated live (Gemini) with precomputed/template safety nets.
// Spoiler rule: a beat anchored to ball N only ever uses facts up to and including ball N (plus, during a break, who is
// walking out to bat next — that is on screen before the ball).
//
// v1.3 pacing (ADR-0014): the gang reacts like a real group watching LIVE from the join point to the last ball —
// busy on big moments (wickets, sixes, the user's hero), quiet on dot balls, a line now and then in long breaks
// (replays, a new batter walking out), and never more than two voices on one ball.
import type { LiveConfig, Match, Member, Moment, ID } from '../types';
import { buildSnapshots, type Snapshot } from '../replay/scoreboard';

export type Intent = 'setup' | 'chatter' | 'lull' | 'away' | 'lament' | 'tease' | 'gloat' | 'brag' | 'hype' | 'nudge_away' | 'callback' | 'final' | 'reply' | 'call_brag' | 'call_lose';
export interface Beat {
  id: ID; seq: number; friendId: ID; intent: Intent;
  /** timed beat: plays when the video reaches this second (breaks in play, the join line, the nudge) instead of on the ball */
  atTime?: number;
  targetId?: ID;     // who it's aimed at (member id)
  momentId?: ID;
  /** compact factual context for the prompt (facts up to this ball only) */
  fact: string;
  /** true if the beat does not depend on the user's own loyalties → can be precomputed */
  stable: boolean;
}

export interface ScriptPoints {
  nudges: { seq: number; atTime: number }[];
  callOffers: { innings: 1 | 2; over: number; beforeSeq: number }[];
}

/** Ball → video second. The director only needs times; the Timeline class provides them. */
export interface Times { timeOf(seq: number): number; ballAt(t: number): number }

export const joinTime = (tl: Times, live: LiveConfig) => tl.timeOf(live.joinBallSeq) - live.joinLeadSec;

/** Scripted product beats (v1.3): the step-away nudge, and Gang Calls only when the viewer switched them on. */
export function scriptPoints(match: Match, tl: Times, live: LiveConfig, opts: { gangCalls?: boolean } = {}): ScriptPoints {
  const t0 = joinTime(tl, live);
  const nudgeAt = t0 + live.nudgeAtSec;
  const callOffers: ScriptPoints['callOffers'] = [];
  if (opts.gangCalls) {
    // after the first-minutes guarantees, offer a call at the start of every fifth over of the chase
    for (const b of match.balls) {
      if (b.seq <= live.joinBallSeq || b.seq > live.endBallSeq || tl.timeOf(b.seq) < t0 + live.guaranteeWindowSec) continue;
      const prev = match.balls[b.seq - 1];
      if (prev && prev.over !== b.over && b.over % 5 === 0) callOffers.push({ innings: b.innings, over: b.over, beforeSeq: b.seq });
    }
  }
  return { nudges: [{ seq: Math.max(live.joinBallSeq - 1, tl.ballAt(nudgeAt)), atTime: nudgeAt }], callOffers };
}

export function stateLine(match: Match, s: Snapshot): string {
  const bat = match.teams.find((t) => t.id === (s.innings === 1 ? match.battingFirst : match.chasing))!.short;
  return s.innings === 2
    ? `${bat} ${s.runs}/${s.wickets} after ${s.overs} overs, chasing ${match.target}, need ${s.need} off ${s.ballsLeft}`
    : `${bat} ${s.runs}/${s.wickets} after ${s.overs} overs, batting first`;
}

export function planBeats(match: Match, members: Member[], moments: Moment[], selfId: ID, tl: Times, live: LiveConfig, snaps = buildSnapshots(match)): Beat[] {
  const friends = members.filter((m) => m.isSimulated);
  const P = new Map(match.players.map((p) => [p.id, p]));
  const name = (id?: ID) => (id ? P.get(id)?.short ?? id : '');
  const from = live.joinBallSeq, to = Math.min(live.endBallSeq, match.balls.length - 1);
  const t0 = joinTime(tl, live);
  const beats: Beat[] = [];
  const add = (b: Omit<Beat, 'id'>) => beats.push({ ...b, id: `${b.seq}-${b.friendId}-${b.intent}${b.atTime !== undefined ? `@${Math.round(b.atTime)}` : ''}` });
  const count = (id: ID) => beats.filter((b) => b.friendId === id).length;
  const when = (b: Beat) => b.atTime ?? tl.timeOf(b.seq);
  /** pick a speaker: not excluded, not already speaking on this ball (ball beats only), fewest lines, not the last speaker */
  const pick = (seq: number, exclude: ID[] = [], at?: number): Member | undefined => {
    const busy = at === undefined ? new Set(beats.filter((b) => b.seq === seq && b.atTime === undefined).map((b) => b.friendId)) : new Set<ID>();
    const until = at ?? tl.timeOf(seq);
    let last: ID | undefined, lastT = -Infinity;
    for (const b of beats) { const w = when(b); if (w <= until && w >= lastT) { lastT = w; last = b.friendId; } }
    return friends.filter((f) => !exclude.includes(f.id) && !busy.has(f.id))
      .sort((a, b) => count(a.id) - count(b.id) || Number(a.id === last) - Number(b.id === last))[0];
  };
  const r4Over = new Set<string>();

  // 1. Moments that matter to this gang (rules R1–R7), from the join point on.
  for (const m of moments) {
    if (m.ballSeq < from || m.ballSeq > to) continue;
    const ball = match.balls[m.ballSeq];
    const userInvolved = m.victimId === selfId || m.ownerId === selfId;
    switch (m.ruleId) {
      case 'R1': {
        if (m.victimId !== selfId) add({ seq: m.ballSeq, friendId: m.victimId!, intent: 'lament', momentId: m.id, fact: m.fact, stable: true });
        const t = pick(m.ballSeq, [m.victimId!]);
        if (t) add({ seq: m.ballSeq, friendId: t.id, intent: 'tease', targetId: m.victimId, momentId: m.id, fact: m.fact, stable: !userInvolved });
        if (m.victimId === selfId) { const t2 = pick(m.ballSeq, [m.victimId!]); if (t2) add({ seq: m.ballSeq, friendId: t2.id, intent: 'tease', targetId: selfId, momentId: m.id, fact: m.fact, stable: false }); }
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
        const t = pick(m.ballSeq, [m.victimId!]);
        if (t) add({ seq: m.ballSeq, friendId: t.id, intent: 'tease', targetId: m.victimId, momentId: m.id, fact: m.fact, stable: m.victimId !== selfId });
        break;
      }
      case 'R5': {
        if (m.ownerId !== selfId) add({ seq: m.ballSeq, friendId: m.ownerId!, intent: 'brag', momentId: m.id, fact: m.fact, stable: true });
        else { const t = pick(m.ballSeq, [selfId]); if (t) add({ seq: m.ballSeq, friendId: t.id, intent: 'hype', targetId: selfId, momentId: m.id, fact: m.fact, stable: false }); }
        break;
      }
      case 'R7': {
        const winner = match.winner;
        // everyone in the demo gang backs the same side: one reaction from the optimist and one from the pessimist
        for (const f of [friends[0], friends[friends.length - 1]]) if (f) add({ seq: m.ballSeq, friendId: f.id, intent: 'final', momentId: m.id, fact: `${m.fact} ${f.loyalty.teamId === winner ? `${f.name}'s team won.` : `${f.name}'s team lost.`}`, stable: true });
        break;
      }
      default: break; // R6 (close chase) feeds the moment list; the gang reacts through chatter
    }
  }

  // 2. Timed beats: the join line, the step-away nudge, and talk during long breaks in play.
  const joinSeq = tl.ballAt(t0);
  const sj = snaps[Math.max(0, joinSeq)], next = match.balls[from];
  const opener = friends[0];
  add({ seq: Math.max(0, joinSeq), atTime: t0 + 1, friendId: opener.id, intent: 'setup', stable: true,
    fact: `The gang has just joined the match LIVE. ${stateLine(match, sj)}. ${name(next.bowlerId)} is bowling to ${name(next.batterId)}. Set the scene; no predictions.` });
  const sp = scriptPoints(match, tl, live);
  const pessimist = friends.find((f) => f.id === 'sunny') ?? friends[friends.length - 1];
  for (const n of sp.nudges) {
    add({ seq: n.seq, atTime: n.atTime, friendId: pessimist.id, intent: 'nudge_away', targetId: selfId, stable: true,
      fact: `${stateLine(match, snaps[n.seq])}. Tell your friend to step away for 20 seconds (grab a chai); the gang will catch them up when they're back.` });
  }
  const timedNear = (t: number, within: number) => beats.some((b) => b.atTime !== undefined && Math.abs(b.atTime - t) < within);
  const pc = live.pacing;
  for (let s = Math.max(0, joinSeq); s < to; s++) {
    const gap = tl.timeOf(s + 1) - tl.timeOf(s);
    if (gap < pc.lullMinGapSec) continue;
    const ball = match.balls[s], nb = match.balls[s + 1];
    const snap = snaps[s];
    const atCrease = new Set([snap.striker?.id, snap.nonStriker?.id].filter(Boolean));
    // a batter at either end of the next ball who hasn't faced yet and wasn't at the crease: walking out during this break
    const fresh = [nb.batterId, nb.nonStrikerId].find((id) => !atCrease.has(id) && !(snap.batters[id]?.balls > 0));
    const newBatter = fresh ? name(fresh) : undefined;
    const first = tl.timeOf(s) + pc.lullFirstAfterSec;
    if (first > t0 + 2 && !timedNear(first, 25)) {
      const f = pick(s, [], first);
      if (f) add({ seq: s, atTime: first, friendId: f.id, intent: 'lull', stable: true,
        fact: `Break in play after: ${ball.text} ${stateLine(match, snap)}. They are showing replays.` });
    }
    if (gap >= pc.lullSecondMinGapSec) {
      const second = tl.timeOf(s + 1) - pc.lullSecondBeforeNextSec;
      if (second > t0 + 2 && !timedNear(second, 25)) {
        const f = pick(s, beats.filter((b) => b.seq === s && b.atTime !== undefined).map((b) => b.friendId), second);
        if (f) add({ seq: s, atTime: second, friendId: f.id, intent: 'lull', stable: true,
          fact: `Still a break after: ${ball.text} ${stateLine(match, snap)}.${newBatter ? ` ${newBatter} is walking out to bat.` : ' Play is about to restart.'} No predictions.` });
      }
    }
  }

  // 3. Ball chatter with pacing: big balls always get a voice, quiet balls only after a quiet spell.
  const ballBeatsAt = (s: number) => beats.filter((b) => b.seq === s && b.atTime === undefined);
  const lastSpokeBefore = (t: number) => { let m = -Infinity; for (const b of beats) { const w = when(b); if (w < t && w > m) m = w; } return m; };
  for (let s = from; s <= to; s++) {
    if (ballBeatsAt(s).length) continue;
    const b = match.balls[s];
    const t = tl.timeOf(s);
    const early = t - t0 < pc.warmSec; // livelier in the first minutes, so a new viewer feels the gang at once
    const big = !!b.wicket || b.runsBat >= 4;
    const quiet = (early ? pc.quietSecEarly : pc.quietSec) * (b.runsBat === 0 && !b.extras ? 1.5 : 1);
    const sinceLast = t - lastSpokeBefore(t);
    if (!big && (sinceLast < quiet || sinceLast < 12)) continue;
    const fact = `${b.text} ${stateLine(match, snaps[s])}.`;
    const f = pick(s);
    if (!f) continue;
    add({ seq: s, friendId: f.id, intent: b.wicket ? 'lament' : 'chatter', stable: true, fact });
    if (b.wicket || b.runsBat === 6) { const g = pick(s); if (g) add({ seq: s, friendId: g.id, intent: b.wicket ? 'chatter' : 'hype', stable: true, fact }); }
  }

  // cap: max 2 friend beats per ball (one per friend), keep order by importance. Timed beats are paced above.
  const order: Intent[] = ['callback', 'final', 'lament', 'tease', 'gloat', 'brag', 'hype', 'chatter'];
  const bySeq = new Map<number, Beat[]>();
  for (const b of beats.filter((x) => x.atTime === undefined)) bySeq.set(b.seq, [...(bySeq.get(b.seq) ?? []), b]);
  const res: Beat[] = beats.filter((x) => x.atTime !== undefined);
  for (const [, list] of bySeq) {
    const uniq = list.filter((b, i) => list.findIndex((x) => x.friendId === b.friendId) === i);
    res.push(...uniq.sort((a, b) => order.indexOf(a.intent) - order.indexOf(b.intent)).slice(0, 2));
  }
  return res.sort((a, b) => when(a) - when(b) || a.id.localeCompare(b.id));
}
