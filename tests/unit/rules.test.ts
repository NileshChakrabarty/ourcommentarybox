// FR-013: moment rules R1–R7.
import { describe, it, expect } from 'vitest';
import { match, gang, seqOf, me } from './helpers';
import { detectAll, cardsForUser, isR6, cardKind } from '../../src/core/moments/rules';
import { buildSnapshots } from '../../src/core/replay/scoreboard';
import { FRIENDS } from '../../src/content/gang';

const ms = detectAll(match, gang());
const at = (rule: string, inn: 1 | 2, label: string) => ms.filter((m) => m.ruleId === rule && m.ballSeq === seqOf(inn, label));

describe('moment engine', () => {
  it('R1: hero wicket → that friend is the victim (Kishan out, Ritu)', () => {
    expect(at('R1', 1, '10.2')).toMatchObject([{ victimId: 'ritu', playerId: 'ishan-kishan', severity: 3 }]);
    expect(at('R1', 2, '15.3')).toMatchObject([{ victimId: 'sunny', playerId: 'tl-seifert' }]);
  });
  it('R2: villain wicket → owner gloats (Seifert is Dev’s villain)', () => {
    expect(at('R2', 2, '15.3')).toMatchObject([{ ownerId: 'dev' }]);
  });
  it('R3: ≥15-run over by a hero bowler (Bhuvi 20, Varun 18)', () => {
    expect(at('R3', 2, '5.6')).toMatchObject([{ victimId: 'dev' }]);
    expect(at('R3', 2, '12.6')).toMatchObject([{ victimId: 'me' }]);
  });
  it('R4: six off a hero bowler', () => {
    expect(at('R4', 2, '5.3')).toMatchObject([{ victimId: 'dev' }]);
  });
  it('R5: milestones (Kishan 50 for Ritu, Seifert 50 for Sunny)', () => {
    expect(ms.filter((m) => m.ruleId === 'R5').map((m) => m.ownerId).sort()).toEqual(['ritu', 'sunny']);
  });
  it('R6 fires exactly once, in the chase, when the finish is near', () => {
    const r6 = ms.filter((m) => m.ruleId === 'R6');
    expect(r6).toHaveLength(1);
    const s = buildSnapshots(match)[r6[0].ballSeq];
    expect(isR6(s)).toBe(true);
    expect(s.need! <= 24 && s.ballsLeft! <= 30).toBe(true);
  });
  it('R7 fires on the final ball only', () => {
    expect(ms.filter((m) => m.ruleId === 'R7').map((m) => m.ballSeq)).toEqual([match.balls.length - 1]);
  });
  it('AC-A-1: every moment id is unique (fires exactly once)', () => {
    expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
  });
  it('AC-A-2: nothing fires for players nobody cares about', () => {
    const nobody = detectAll(match, [me({ teamId: 'IND' }), ...FRIENDS.map((f) => ({ ...f, loyalty: { teamId: f.loyalty.teamId } }))]);
    expect(nobody.map((m) => m.ruleId).sort()).toEqual(['R6', 'R7']);
  });
  it('user cards: at most one per over except R1/R2, kinds resolve', () => {
    const cards = cardsForUser(match, ms, 'me');
    const perOver = new Map<string, number>();
    for (const c of cards) { if (c.ruleId === 'R1' || c.ruleId === 'R2') continue; const b = match.balls[c.ballSeq]; const k = `${b.innings}-${b.over}`; perOver.set(k, (perOver.get(k) ?? 0) + 1); }
    expect([...perOver.values()].every((n) => n === 1)).toBe(true);
    expect(cards.find((c) => c.victimId === 'me') && cardKind(cards.find((c) => c.victimId === 'me')!, 'me')).toBe('comeback');
    expect(cardKind(cards.find((c) => c.victimId === 'ritu')!, 'me')).toBe('tease');
  });
});
