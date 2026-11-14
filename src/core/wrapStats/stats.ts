// Deterministic wrap stats + catch-up fallback (spec §4.2 F-WRAP, F-CATCH, §12.8). Pure.
import type { FeedItem, GangCall, Match, Member, Moment, ID } from '../types';

export interface WrapStats {
  mostRoasted?: { memberId: ID; count: number };
  clips: Record<ID, number>;
  callsWon: Record<ID, number>;
  userItems: number;
}

export function computeStats(members: Member[], moments: Moment[], feed: FeedItem[], calls: GangCall[], selfId: ID): WrapStats {
  const roast: Record<ID, number> = Object.fromEntries(members.map((m) => [m.id, 0]));
  for (const m of moments) if (m.victimId && m.victimId in roast) roast[m.victimId]++;
  for (const it of feed) if (it.targetId && it.targetId in roast && it.memberId !== it.targetId) roast[it.targetId]++;
  const ranked = Object.entries(roast).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const clips: Record<ID, number> = Object.fromEntries(members.map((m) => [m.id, 0]));
  for (const it of feed) if (it.kind === 'clip' || it.kind === 'text') clips[it.memberId] = (clips[it.memberId] ?? 0) + 1;
  const callsWon: Record<ID, number> = Object.fromEntries(members.map((m) => [m.id, 0]));
  for (const c of calls) if (c.status === 'won') callsWon[c.memberId] = (callsWon[c.memberId] ?? 0) + 1;
  return {
    mostRoasted: ranked[0] && ranked[0][1] > 0 ? { memberId: ranked[0][0], count: ranked[0][1] } : undefined,
    clips, callsWon, userItems: feed.filter((f) => f.memberId === selfId && f.kind !== 'reaction').length,
  };
}

/** Events worth telling someone who was away, in (fromSeq, toSeq]. */
export function awayEvents(match: Match, fromSeq: number, toSeq: number) {
  const P = new Map(match.players.map((p) => [p.id, p.short]));
  return match.balls.filter((b) => b.seq > fromSeq && b.seq <= toSeq && (b.wicket || b.runsBat >= 4))
    .map((b) => ({ seq: b.seq, text: b.text, wicketOf: b.wicket ? P.get(b.wicket.playerOutId) : undefined }));
}

/** Deterministic catch-up: always mentions every wicket in the window (AC-CATCH-1). */
export function fallbackCatchup(match: Match, fromSeq: number, toSeq: number, scoreText: (seq: number) => string): string {
  const ev = awayEvents(match, fromSeq, toSeq);
  const wk = ev.filter((e) => e.wicketOf).map((e) => e.wicketOf!);
  const sixes = match.balls.filter((b) => b.seq > fromSeq && b.seq <= toSeq && b.runsBat === 6).length;
  const fours = match.balls.filter((b) => b.seq > fromSeq && b.seq <= toSeq && b.runsBat === 4).length;
  const parts = [`You left at ${scoreText(Math.max(0, fromSeq))}; it's now ${scoreText(toSeq)}.`];
  if (wk.length) parts.push(`Wicket${wk.length > 1 ? 's' : ''}: ${wk.join(', ')}.`);
  if (sixes || fours) parts.push(`${sixes} six${sixes === 1 ? '' : 'es'} and ${fours} four${fours === 1 ? '' : 's'} while you were gone.`);
  return parts.join(' ');
}

/** Live summary must name every dismissed player in the window, else we append them. */
export function ensureWickets(summary: string, match: Match, fromSeq: number, toSeq: number): string {
  const missing = awayEvents(match, fromSeq, toSeq).filter((e) => e.wicketOf && !summary.toLowerCase().includes(e.wicketOf.toLowerCase()));
  return missing.length ? `${summary} (Wicket: ${missing.map((e) => e.wicketOf).join(', ')}.)` : summary;
}
