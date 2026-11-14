import { describe, it, expect } from 'vitest';
import { match, gang, seqOf } from './helpers';
import { resolveCall, friendCall } from '../../src/core/calls';
import { computeStats, fallbackCatchup, ensureWickets, awayEvents } from '../../src/core/wrapStats/stats';
import { detectAll } from '../../src/core/moments/rules';
import { isSafe, cleanLine, wordCount } from '../../api/_lib/safety';
import type { FeedItem, GangCall } from '../../src/core/types';

describe('Gang Calls (FR-024)', () => {
  it('resolves from the real over', () => {
    expect(resolveCall(match, { innings: 1, over: 9, type: 'six' })).toBe('won');   // Bracewell over: 3 sixes
    expect(resolveCall(match, { innings: 2, over: 8, type: 'wicket' })).toBe('won'); // Mitchell out
    expect(resolveCall(match, { innings: 2, over: 8, type: 'six' })).toBe('lost');
  });
  it('friends call by allegiance', () => { expect(friendCall('NZ', 'NZ')).toBe('six'); expect(friendCall('IND', 'NZ')).toBe('wicket'); });
});

describe('wrap stats (AC-WRAP-3)', () => {
  it('counts roasts, items and calls', () => {
    const members = gang();
    const feed: FeedItem[] = [
      { id: '1', memberId: 'sunny', kind: 'clip', anchorSeq: 1, sentAt: 1, targetId: 'dev' },
      { id: '2', memberId: 'ritu', kind: 'text', anchorSeq: 2, sentAt: 2, targetId: 'dev' },
      { id: '3', memberId: 'me', kind: 'reaction', anchorSeq: 2, sentAt: 3, emoji: '😂' },
    ];
    const calls: GangCall[] = [{ id: 'c', memberId: 'ritu', type: 'six', innings: 1, over: 9, status: 'won' }];
    const s = computeStats(members, detectAll(match, members), feed, calls, 'me');
    expect(s.mostRoasted?.memberId).toBe('dev'); // 2 moments (R3,R4…) + 2 teases
    expect(s.clips.sunny).toBe(1); expect(s.callsWon.ritu).toBe(1); expect(s.userItems).toBe(0);
  });
});

describe('catch-up (AC-CATCH-1/2)', () => {
  const from = seqOf(2, '13.6'), to = seqOf(2, '15.3');
  const st = (s: number) => `NZ ${s}`;
  it('fallback mentions every wicket in the window and stays short', () => {
    const t = fallbackCatchup(match, from, to, st);
    expect(t).toContain('Seifert');
    expect(wordCount(t)).toBeLessThanOrEqual(60);
  });
  it('appends missing wickets to a live summary', () => {
    expect(awayEvents(match, from, to).some((e) => e.wicketOf === 'Seifert')).toBe(true);
    expect(ensureWickets('Phillips went big.', match, from, to)).toContain('Seifert');
    expect(ensureWickets('Seifert fell for 93.', match, from, to)).toBe('Seifert fell for 93.');
  });
});

describe('safety (§12.6)', () => {
  it('blocks protected traits, profanity, betting', () => {
    for (const bad of ['your mother bowls better', 'what a fucking over', 'bet you a hundred rupees', 'he bowls like a girl']) expect(isSafe(bad)).toBe(false);
  });
  it('allows cricket vocabulary', () => {
    for (const ok of ['Short ball, pulled for four', 'Death overs are his thing', 'Dev, your hero just got smashed']) expect(isSafe(ok)).toBe(true);
  });
  it('enforces word limits', () => { expect(cleanLine('one two three', 2)).toBeNull(); expect(cleanLine(' "Nice one Dev" ', 5)).toBe('Nice one Dev'); });
});
