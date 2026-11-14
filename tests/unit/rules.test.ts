// FR-013: moment rules R1–R7 on England v India 2022 with the v1.2 gang (all India fans).
import { describe, it, expect } from 'vitest';
import { match, gang, seqOf, me } from './helpers';
import { detectAll, cardsForUser, cardKind } from '../../src/core/moments/rules';
import { FRIENDS } from '../../src/content/gang';

const ms = detectAll(match, gang());
const at = (rule: string, inn: 1 | 2, label: string) => ms.filter((m) => m.ruleId === rule && m.ballSeq === seqOf(inn, label));

describe('moment engine', () => {
  it('R1: hero wicket → that member is the victim (Rohit = you, Pant = Ritu, Kohli = Dev, Chahal = Sunny)', () => {
    expect(at('R1', 2, '2.4')).toMatchObject([{ victimId: 'me', playerId: 'rg-sharma', severity: 3 }]);
    expect(at('R1', 2, '10.2')).toMatchObject([{ victimId: 'ritu', playerId: 'rr-pant' }]);
    expect(at('R1', 2, '11.2')).toMatchObject([{ victimId: 'dev', playerId: 'v-kohli' }]);
    expect(ms.filter((m) => m.ruleId === 'R1' && m.victimId === 'sunny').map((m) => match.balls[m.ballSeq].label)).toContain('38.2');
  });
  it('R2: villain wicket → owner gloats (Topley is your villain and Sunny’s)', () => {
    expect(at('R2', 1, '48.6').map((m) => m.ownerId).sort()).toEqual(['me', 'sunny']);
    expect(at('R2', 1, '46.6')).toMatchObject([{ ownerId: 'dev', playerId: 'dj-willey' }]);
  });
  it('R4: six off a hero bowler (Livingstone hits Chahal → Sunny)', () => {
    expect(at('R4', 1, '23.1')).toMatchObject([{ victimId: 'sunny' }]);
  });
  it('R5: Chahal’s third wicket is Sunny’s brag', () => {
    expect(at('R5', 1, '21.3')).toMatchObject([{ ownerId: 'sunny', playerId: 'ys-chahal' }]);
  });
  it('R6 never fires: India were never close in this chase (call-backs come from chapters, ADR-0007)', () => {
    expect(ms.filter((m) => m.ruleId === 'R6')).toHaveLength(0);
  });
  it('R7 fires on the final ball only', () => {
    expect(ms.filter((m) => m.ruleId === 'R7').map((m) => m.ballSeq)).toEqual([match.balls.length - 1]);
  });
  it('AC-A-1: every moment id is unique (fires exactly once)', () => {
    expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
  });
  it('AC-A-2: nothing fires for players nobody cares about', () => {
    const nobody = detectAll(match, [me({ teamId: 'IND' }), ...FRIENDS.map((f) => ({ ...f, loyalty: { teamId: f.loyalty.teamId } }))]);
    expect(nobody.map((m) => m.ruleId)).toEqual(['R7']);
  });
  it('user cards: at most one per over except R1/R2; Rohit out = comeback, Kohli out = tease Dev', () => {
    const cards = cardsForUser(match, ms, 'me');
    const perOver = new Map<string, number>();
    for (const c of cards) { if (c.ruleId === 'R1' || c.ruleId === 'R2') continue; const b = match.balls[c.ballSeq]; const k = `${b.innings}-${b.over}`; perOver.set(k, (perOver.get(k) ?? 0) + 1); }
    expect([...perOver.values()].every((n) => n === 1)).toBe(true);
    expect(cardKind(cards.find((c) => c.ballSeq === seqOf(2, '2.4'))!, 'me')).toBe('comeback');
    expect(cardKind(cards.find((c) => c.ballSeq === seqOf(2, '11.2'))!, 'me')).toBe('tease');
  });
});
