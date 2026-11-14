import { describe, it, expect } from 'vitest';
import { match, gang, seqOf } from './helpers';
import { resolveCall, friendCall, callStatusAt } from '../../src/core/calls';
import { FRIENDS } from '../../src/content/gang';
import { computeStats, fallbackCatchup, ensureWickets, awayEvents } from '../../src/core/wrapStats/stats';
import { isSafe, cleanLine, wordCount } from '../../api/_lib/safety';
import type { FeedItem, GangCall } from '../../src/core/types';

describe('Gang Calls (FR-024)', () => {
  it('resolves from the real over', () => {
    expect(resolveCall(match, { innings: 2, over: 2, type: 'wicket' })).toBe('won');  // Rohit lbw b Topley
    expect(resolveCall(match, { innings: 2, over: 2, type: 'six' })).toBe('lost');
    expect(resolveCall(match, { innings: 1, over: 23, type: 'six' })).toBe('won');    // Livingstone
  });
  it('is won the moment the event happens (no waiting out a DRS review), lost only at the end of the over', () => {
    const call = { innings: 2 as const, over: 2, type: 'wicket' as const };
    expect(callStatusAt(match, call, seqOf(2, '2.3'))).toBe('open');
    expect(callStatusAt(match, call, seqOf(2, '2.4'))).toBe('won');
    expect(callStatusAt(match, { ...call, type: 'six' }, seqOf(2, '2.5'))).toBe('open');
    expect(callStatusAt(match, { ...call, type: 'six' }, seqOf(2, '2.6'))).toBe('lost');
  });
  it('friends call by persona: optimist Dev backs a six, pessimist Sunny calls a wicket', () => {
    const [dev, , sunny] = FRIENDS;
    expect(friendCall(dev, 'IND', 2)).toBe('six');
    expect(friendCall(sunny, 'IND', 2)).toBe('wicket');
  });
});

describe('wrap stats (AC-WRAP-3)', () => {
  it('counts roasts, items and calls', () => {
    const members = gang();
    const feed: FeedItem[] = [
      { id: '1', memberId: 'sunny', kind: 'clip', anchorSeq: 1, sentAt: 1, targetId: 'dev' },
      { id: '2', memberId: 'ritu', kind: 'text', anchorSeq: 2, sentAt: 2, targetId: 'dev' },
      { id: '3', memberId: 'me', kind: 'reaction', anchorSeq: 2, sentAt: 3, emoji: '😂' },
    ];
    const calls: GangCall[] = [{ id: 'c', memberId: 'ritu', type: 'wicket', innings: 2, over: 2, status: 'won' }];
    const s = computeStats(members, [], feed, calls, 'me');
    expect(s.mostRoasted?.memberId).toBe('dev'); // 2 teases aimed at Dev
    expect(s.clips.sunny).toBe(1); expect(s.callsWon.ritu).toBe(1); expect(s.userItems).toBe(0);
  });
});

describe('catch-up (AC-CATCH-1/2)', () => {
  // the demo away window: step away after Rohit (2.4), called back at 11.1
  const from = seqOf(2, '2.4'), to = seqOf(2, '11.1');
  const st = (s: number) => `IND ${s}`;
  it('fallback mentions every wicket in the window and stays short', () => {
    const t = fallbackCatchup(match, from, to, st);
    expect(t).toContain('Dhawan'); expect(t).toContain('Pant');
    expect(wordCount(t)).toBeLessThanOrEqual(60);
  });
  it('appends missing wickets to a live summary', () => {
    expect(awayEvents(match, from, to).filter((e) => e.wicketOf).map((e) => e.wicketOf)).toEqual(['Dhawan', 'Pant']);
    expect(ensureWickets('Topley kept it tight.', match, from, to)).toContain('Pant');
    expect(ensureWickets('Dhawan and Pant both gone.', match, from, to)).toBe('Dhawan and Pant both gone.');
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
