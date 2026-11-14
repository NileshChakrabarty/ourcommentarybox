// Friends director: decides WHICH simulated friend speaks on WHICH ball and WHY (intent).
// The words are generated live (Gemini) with precomputed/template safety nets. Pure.
// Spoiler rule: a beat anchored to ball N only ever uses facts up to and including ball N.
import type { Chapter, Match, Member, Moment, ID } from '../types';
import { buildSnapshots, type Snapshot } from '../replay/scoreboard';

export type Intent = 'setup' | 'chatter' | 'lament' | 'tease' | 'gloat' | 'brag' | 'hype' | 'nudge_away' | 'callback' | 'final' | 'reply' | 'call_brag' | 'call_lose';
export interface Beat {
  id: ID; seq: number; friendId: ID; intent: Intent;
  targetId?: ID;     // who it's aimed at (member id)
  momentId?: ID;
  /** compact factual context for the prompt (facts up to this ball only) */
  fact: string;
  /** true if the beat does not depend on the user's own loyalties → can be precomputed */
  stable: boolean;
}

export interface ScriptPoints {
  nudges: { seq: number; chapterId: ID }[];
  callbacks: { seq: number; chapterId: ID }[];
  callOffers: { innings: 1 | 2; over: number; beforeSeq: number }[];
}

/** Scripted product beats, derived from the demo chapters (see ADR-0007). */
export function scriptPoints(match: Match, chapters: Chapter[]): ScriptPoints {
  const callOffers: ScriptPoints['callOffers'] = [];
  for (const c of chapters) {
    const first = match.balls[c.startBallSeq];
    const prev = match.balls[c.startBallSeq - 1];
    // offer a Gang Call when a chapter opens at the start of an over
    if (first && (!prev || prev.over !== first.over || prev.innings !== first.innings)) callOffers.push({ innings: first.innings, over: first.over, beforeSeq: first.seq });
  }
  return {
    nudges: chapters.filter((c) => c.nudgeSeq !== undefined).map((c) => ({ seq: c.nudgeSeq!, chapterId: c.id })),
    callbacks: chapters.filter((c) => c.callbackSeq !== undefined).map((c) => ({ seq: c.callbackSeq!, chapterId: c.id })),
    callOffers,
  };
}

export function stateLine(match: Match, s: Snapshot): string {
  const bat = match.teams.find((t) => t.id === (s.innings === 1 ? match.battingFirst : match.chasing))!.short;
  return s.innings === 2
    ? `${bat} ${s.runs}/${s.wickets} after ${s.overs} overs, chasing ${match.target}, need ${s.need} off ${s.ballsLeft}`
    : `${bat} ${s.runs}/${s.wickets} after ${s.overs} overs, batting first`;
}

export function planBeats(match: Match, members: Member[], moments: Moment[], selfId: ID, chapters: Chapter[] = [], snaps = buildSnapshots(match)): Beat[] {
  const friends = members.filter((m) => m.isSimulated);
  const P = new Map(match.players.map((p) => [p.id, p]));
  const name = (id?: ID) => (id ? P.get(id)?.short ?? id : '');
  const beats: Beat[] = [];
  const add = (b: Omit<Beat, 'id'>) => beats.push({ ...b, id: `${b.seq}-${b.friendId}-${b.intent}` });
  const count = (id: ID) => beats.filter((b) => b.friendId === id).length;
  /** pick a teaser: not the victim, not already speaking on this ball, fewest lines so far, not the last speaker */
  const teaser = (victimId: ID, seq: number): Member | undefined => {
    const busy = new Set(beats.filter((b) => b.seq === seq).map((b) => b.friendId));
    const lastSpeaker = beats.at(-1)?.friendId;
    return friends.filter((f) => f.id !== victimId && !busy.has(f.id))
      .sort((a, b) => count(a.id) - count(b.id) || Number(a.id === lastSpeaker) - Number(b.id === lastSpeaker))[0];
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
      case 'R7': {
        const winner = match.winner;
        // everyone in the demo gang backs the same side: one reaction from the optimist and one from the pessimist
        const [a, b] = [friends[0], friends[friends.length - 1]];
        for (const f of [a, b]) if (f) add({ seq: m.ballSeq, friendId: f.id, intent: 'final', momentId: m.id, fact: `${m.fact} ${f.loyalty.teamId === winner ? `${f.name}'s team won.` : `${f.name}'s team lost.`}`, stable: true });
        break;
      }
      default: break; // R6 (close chase) is covered by chapter call-backs in v1.2
    }
  }

  const sp = scriptPoints(match, chapters);
  const pessimist = friends.find((f) => f.id === 'sunny') ?? friends[friends.length - 1];
  for (const n of sp.nudges) {
    add({ seq: n.seq, friendId: pessimist.id, intent: 'nudge_away', targetId: selfId, stable: true,
      fact: `${stateLine(match, snaps[n.seq])}. Tell your friend to step away and grab a chai; the gang will call them back when something big happens.` });
  }
  for (const c of sp.callbacks) {
    const s = snaps[c.seq];
    const atCrease = [s.striker?.id, s.nonStriker?.id].filter(Boolean) as ID[];
    const caller = friends.find((f) => f.loyalty.heroId && atCrease.includes(f.loyalty.heroId)) ?? friends[0];
    const hero = caller.loyalty.heroId && atCrease.includes(caller.loyalty.heroId) ? name(caller.loyalty.heroId) : undefined;
    add({ seq: c.seq, friendId: caller.id, intent: 'callback', targetId: selfId, stable: true,
      fact: `${stateLine(match, s)}.${hero ? ` ${hero} (${caller.name}'s hero) is at the crease.` : ''} Urgently call your friend back to the screen. Do NOT say what happens next.` });
  }

  // Chapters: a scene-setting line as the chapter opens, then chatter so most balls have a voice (no dead air)
  for (const ch of chapters) {
    const open = Math.max(0, ch.startBallSeq - 1);
    if (!beats.some((b) => b.seq === open)) {
      const f = [...friends].sort((a, b) => count(a.id) - count(b.id))[0];
      const s = snaps[open], next = match.balls[ch.startBallSeq];
      add({ seq: open, friendId: f.id, intent: 'setup', stable: true,
        fact: `${stateLine(match, s)}. ${name(next.bowlerId)} is about to bowl to ${name(next.batterId)}. Set the scene for the gang; no predictions of what happens.` });
    }
    for (let seq = ch.startBallSeq; seq <= ch.endBallSeq; seq++) {
      // a call-back only plays if you stepped away, so that ball still gets chatter for everyone else
      if (beats.some((b) => b.seq === seq && b.intent !== 'callback')) continue;
      const b = match.balls[seq];
      if (b.extraType === 'wd' && seq % 2) continue; // not every wide needs a comment
      const lastSpeaker = beats.filter((x) => x.seq < seq).at(-1)?.friendId;
      const busy = new Set(beats.filter((x) => x.seq === seq).map((x) => x.friendId));
      const f = [...friends].filter((x) => x.id !== lastSpeaker && !busy.has(x.id)).sort((a, c) => count(a.id) - count(c.id))[0];
      if (!f) continue;
      add({ seq, friendId: f.id, intent: 'chatter', stable: true, fact: `${b.text} ${stateLine(match, snaps[seq])}.` });
    }
  }

  // cap: max 2 friend beats per ball, keep order by importance
  const order: Intent[] = ['callback', 'final', 'lament', 'tease', 'gloat', 'brag', 'hype', 'nudge_away', 'setup', 'chatter'];
  const bySeq = new Map<number, Beat[]>();
  for (const b of beats) bySeq.set(b.seq, [...(bySeq.get(b.seq) ?? []), b]);
  const res: Beat[] = [];
  for (const [, list] of [...bySeq.entries()].sort((a, b) => a[0] - b[0])) {
    // scripted product beats (nudge, call-back) always survive; up to 2 reaction beats per ball besides them
    const scripted = list.filter((b) => b.intent === 'nudge_away' || b.intent === 'callback');
    const rest = list.filter((b) => !scripted.includes(b) && !scripted.some((x) => x.friendId === b.friendId));
    const uniq = rest.filter((b, i) => rest.findIndex((x) => x.friendId === b.friendId) === i);
    res.push(...uniq.sort((a, b) => order.indexOf(a.intent) - order.indexOf(b.intent)).slice(0, 2), ...scripted);
  }
  return res;
}
