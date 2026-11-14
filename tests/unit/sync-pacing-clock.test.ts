// FR-005, FR-007, FR-008: pacing, clock, ball-pinned delivery.
import { describe, it, expect } from 'vitest';
import { match, gang } from './helpers';
import { buildPlan } from '../../src/core/plan';
import { DeliveryQueue, anchorFor } from '../../src/core/sync/delivery';
import { ReplayClock } from '../../src/core/replay/clock';
import { DEFAULT_PACE } from '../../src/core/replay/pacing';

describe('pacing (FR-005)', () => {
  const plan = buildPlan(match, gang(), 'me');
  const total = plan.durations.reduce((a, b) => a + b, 0);
  it('whole replay within target ±60 s', () => expect(Math.abs(total - DEFAULT_PACE.targetMs)).toBeLessThan(60_000));
  it('every ball has a positive duration; key balls are slower than quiet ones', () => {
    expect(plan.durations.every((d) => d >= DEFAULT_PACE.minMs)).toBe(true);
    const r1 = plan.moments.find((m) => m.ruleId === 'R1')!.ballSeq;
    expect(plan.durations[r1]).toBeGreaterThanOrEqual(DEFAULT_PACE.majorMs);
  });
  it('plan includes the call-back (R6) and the step-away nudge before it', () => {
    expect(plan.r6Seq).toBeDefined();
    expect(plan.nudgeSeq).toBeLessThan(plan.r6Seq!);
    expect(plan.beats.some((b) => b.intent === 'callback' && b.seq === plan.r6Seq)).toBe(true);
  });
  it('at most 2 friend beats per ball', () => {
    const c = new Map<number, number>(); plan.beats.forEach((b) => c.set(b.seq, (c.get(b.seq) ?? 0) + 1));
    expect(Math.max(...c.values())).toBeLessThanOrEqual(2);
  });
});

describe('clock', () => {
  const run = (durations: number[], steps: number[], holdAt?: number) => {
    const revealed: number[] = []; let ended = false;
    const c = new ReplayClock(durations, { ballStarted: () => {}, ballRevealed: (s) => { revealed.push(s); if (s === holdAt) c.hold('x', now, 10_000); }, ended: () => { ended = true; } });
    let now = 0; c.play(now);
    for (const dt of steps) { now += dt; c.tick(now); }
    return { revealed, ended, c };
  };
  it('reveals balls in order and ends with correct final ball (AC-REPLAY-1/3)', () => {
    const { revealed, ended } = run([1000, 1000, 1000], Array(40).fill(100));
    expect(revealed).toEqual([0, 1, 2]); expect(ended).toBe(true);
  });
  it('catches up after a long gap (hidden tab) without skipping reveals', () => {
    const { revealed } = run([500, 500, 500, 500], [10, 4_000]);
    expect(revealed).toEqual([0, 1, 2, 3]);
  });
  it('holds stop the clock until released', () => {
    const { revealed, c } = run([1000, 1000, 1000], Array(30).fill(100), 0);
    expect(revealed).toEqual([0]);
    c.release('x');
  });
});

describe('ball-pinned delivery (FR-007/008)', () => {
  it('anchors to the latest completed ball', () => { expect(anchorFor(41)).toBe(41); expect(anchorFor(-1)).toBe(0); });
  it('never delivers before the playhead reaches the anchor; delivers in anchor then send order', () => {
    const q = new DeliveryQueue<{ id: string; anchorSeq: number; sentAt: number }>();
    // friends on different delays: a friend ahead of us sent clips for balls we haven't seen yet
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
