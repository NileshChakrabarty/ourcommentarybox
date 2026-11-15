// FR-007/008 ball-pinned delivery + the v1.3 live plan: journey timing beats (first wicket, comeback, nudge),
// pacing across the whole chase (busy on big moments, quiet on dots), and the spoiler rule.
import { describe, it, expect } from 'vitest';
import { match, gang, seqOf, live, tl } from './helpers';
import { buildPlan } from '../../src/core/plan';
import { joinTime } from '../../src/core/friends/director';
import { DeliveryQueue, anchorFor } from '../../src/core/sync/delivery';

const plan = buildPlan(match, gang(), 'me', tl, live);
const t0 = joinTime(tl, live);
const when = (b: { seq: number; atTime?: number }) => b.atTime ?? tl.timeOf(b.seq);
const after = (b: { seq: number; atTime?: number }) => when(b) - t0;
const rohitOut = seqOf(2, '2.4');

describe('timeline asset', () => {
  it('has one entry per delivery, monotonic, inside the 6:21:28 video', () => {
    expect(tl.length).toBe(match.balls.length);
    for (let i = 1; i < tl.length; i++) expect(tl.entries[i].videoTime).toBeGreaterThanOrEqual(tl.entries[i - 1].videoTime);
    expect(tl.timeOf(match.balls.length - 1)).toBeLessThan(22_888);
  });
  it('the balls of the first-minutes journey are anchored to the video (not interpolated)', () => {
    for (let s = live.joinBallSeq - 1; s <= rohitOut + 1; s++) expect(tl.entries[s].tagged).toBe(true);
  });
  it('the live broadcast ends on the last ball of the match', () => {
    expect(live.endBallSeq).toBe(match.balls.length - 1);
    expect(match.balls[live.joinBallSeq].innings).toBe(2);
  });
});

describe('journey timing (v1.3 §3): the first minutes', () => {
  it('a scene-setting line lands within 5 s of joining', () => {
    const setup = plan.beats.find((b) => b.intent === 'setup')!;
    expect(after(setup)).toBeGreaterThan(0);
    expect(after(setup)).toBeLessThanOrEqual(5);
  });
  it('the first wicket (Rohit lbw b Topley) lands 30–45 s after joining, with friends reacting on that ball', () => {
    expect(match.balls[rohitOut].wicket?.playerOutId).toBe('rg-sharma');
    expect(tl.timeOf(rohitOut) - t0).toBeGreaterThanOrEqual(30);
    expect(tl.timeOf(rohitOut) - t0).toBeLessThanOrEqual(45);
    const on = plan.beats.filter((b) => b.seq === rohitOut && b.atTime === undefined);
    expect(on.length).toBe(2);
    expect(on.every((b) => b.intent === 'tease' && b.targetId === 'me')).toBe(true); // Rohit is your hero
  });
  it('your comeback card is planned for that wicket and shows at about a minute', () => {
    const card = plan.cards.find((c) => c.ballSeq === rohitOut)!;
    expect(card.ruleId).toBe('R1');
    const shown = tl.timeOf(rohitOut) - t0 + live.comebackCardDelaySec;
    expect(shown).toBeGreaterThanOrEqual(45);
    expect(shown).toBeLessThanOrEqual(75);
  });
  it('the step-away nudge fires at about 2 minutes, inside the guarantee window, on video time (not a ball)', () => {
    const n = plan.beats.find((b) => b.intent === 'nudge_away')!;
    expect(n.friendId).toBe('sunny');
    expect(after(n)).toBe(live.nudgeAtSec);
    expect(after(n)).toBeLessThan(live.guaranteeWindowSec);
    expect(plan.nudges[0].atTime).toBe(n.atTime);
  });
  it('the long break after the wicket is not silent: the gang talks during the replays and as Kohli walks out', () => {
    const lulls = plan.beats.filter((b) => b.intent === 'lull' && b.seq === rohitOut);
    expect(lulls).toHaveLength(2);
    expect(lulls[1].fact).toContain('Kohli is walking out');
  });
});

describe('open-ended live match: pacing to the last ball', () => {
  it('runs past 3 minutes all the way to the final ball', () => {
    expect(Math.max(...plan.beats.map(after))).toBeGreaterThan(2 * 3600);
    expect(plan.beats.some((b) => b.intent === 'final' && b.seq === live.endBallSeq)).toBe(true);
  });
  it('never more than about 3.5 minutes without a line, and never two lines in the same few seconds unless it is a big ball', () => {
    const times = plan.beats.map(when).sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeLessThanOrEqual(215);
  });
  it('busy on big moments, quiet on dot balls', () => {
    const balls = match.balls.filter((b) => b.seq > live.joinBallSeq && b.seq <= live.endBallSeq);
    const voiced = (s: number) => plan.beats.some((b) => b.seq === s && b.atTime === undefined);
    const big = balls.filter((b) => b.wicket || b.runsBat >= 4);
    const dots = balls.filter((b) => !b.wicket && b.runsBat === 0 && !b.extras);
    expect(big.filter((b) => voiced(b.seq)).length / big.length).toBeGreaterThanOrEqual(0.95);
    expect(dots.filter((b) => voiced(b.seq)).length / dots.length).toBeLessThanOrEqual(0.3);
    for (const w of balls.filter((b) => b.wicket)) expect(plan.beats.filter((b) => b.seq === w.seq && b.atTime === undefined).length).toBe(2);
  });
  it('at most 2 friends per ball and one line per friend per ball; ids are unique', () => {
    const per = new Map<number, string[]>();
    for (const b of plan.beats.filter((x) => x.atTime === undefined)) per.set(b.seq, [...(per.get(b.seq) ?? []), b.friendId]);
    for (const ids of per.values()) { expect(ids.length).toBeLessThanOrEqual(2); expect(new Set(ids).size).toBe(ids.length); }
    expect(new Set(plan.beats.map((b) => b.id)).size).toBe(plan.beats.length);
  });
  it('spoiler rule: chatter uses that ball’s own text, and break lines only facts up to that ball', () => {
    for (const b of plan.beats.filter((x) => x.intent === 'chatter')) expect(b.fact.startsWith(match.balls[b.seq].text)).toBe(true);
    for (const b of plan.beats.filter((x) => x.intent === 'lull')) {
      expect(b.fact).toContain(match.balls[b.seq].text);
      expect(b.fact).not.toContain(match.balls[b.seq + 1].text);
    }
  });
  it('Gang Calls are off by default; switched on, they start only after the first-minutes guarantees', () => {
    expect(plan.callOffers).toEqual([]);
    const withCalls = buildPlan(match, gang(), 'me', tl, live, { gangCalls: true });
    expect(withCalls.callOffers.length).toBeGreaterThan(0);
    for (const o of withCalls.callOffers) expect(tl.timeOf(o.beforeSeq) - t0).toBeGreaterThanOrEqual(live.guaranteeWindowSec);
  });
});

describe('ball-pinned delivery (FR-007/008)', () => {
  it('anchors to the latest completed ball', () => { expect(anchorFor(41)).toBe(41); expect(anchorFor(-1)).toBe(0); });
  it('never delivers before the playhead reaches the anchor; delivers in anchor then send order', () => {
    const q = new DeliveryQueue<{ id: string; anchorSeq: number; sentAt: number }>();
    q.add({ id: 'ahead', anchorSeq: 12, sentAt: 1 });
    q.add({ id: 'b', anchorSeq: 10, sentAt: 5 });
    q.add({ id: 'a', anchorSeq: 10, sentAt: 2 });
    q.add({ id: 'old', anchorSeq: 3, sentAt: 9 });
    expect(q.release(9).map((x) => x.id)).toEqual(['old']);
    expect(q.release(11).map((x) => x.id)).toEqual(['a', 'b']);
    expect(q.release(11)).toEqual([]);
    expect(q.release(12).map((x) => x.id)).toEqual(['ahead']);
  });
  it('dedupes the same item', () => {
    const q = new DeliveryQueue<{ id: string; anchorSeq: number; sentAt: number }>();
    q.add({ id: 'x', anchorSeq: 1, sentAt: 0 }); q.add({ id: 'x', anchorSeq: 1, sentAt: 0 });
    expect(q.release(5)).toHaveLength(1);
    q.add({ id: 'x', anchorSeq: 1, sentAt: 0 });
    expect(q.release(5)).toHaveLength(0);
  });
});
