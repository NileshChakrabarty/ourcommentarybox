// FR-007/008 ball-pinned delivery + the v1.2 plan (chapters, no dead air, call-back, nudge).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { match, gang, seqOf } from './helpers';
import { buildPlan } from '../../src/core/plan';
import { DeliveryQueue, anchorFor } from '../../src/core/sync/delivery';
import { ChapterFileSchema, TimelineSchema } from '../../src/core/schema';
import { Timeline } from '../../src/core/timeline';
import type { ChapterFile } from '../../src/core/types';

const chapters = (ChapterFileSchema.parse(JSON.parse(readFileSync('public/data/chapters.json', 'utf8'))) as ChapterFile).chapters;
const tl = new Timeline(TimelineSchema.parse(JSON.parse(readFileSync('public/data/timeline.json', 'utf8'))));
const plan = buildPlan(match, gang(), 'me', chapters);

describe('timeline asset', () => {
  it('has one entry per delivery, monotonic, inside the 6:21:28 video', () => {
    expect(tl.length).toBe(match.balls.length);
    for (let i = 1; i < tl.length; i++) expect(tl.entries[i].videoTime).toBeGreaterThanOrEqual(tl.entries[i - 1].videoTime);
    expect(tl.timeOf(match.balls.length - 1)).toBeLessThan(22_888);
  });
  it('every ball inside the demo chapters is anchored (not interpolated)', () => {
    for (const c of chapters) for (let s = c.startBallSeq; s <= c.endBallSeq; s++) expect(tl.entries[s].tagged).toBe(true);
  });
  it('India’s chase starts after England’s last ball', () => {
    const firstInn2 = match.balls.find((b) => b.innings === 2)!.seq;
    expect(tl.timeOf(firstInn2)).toBeGreaterThan(tl.timeOf(firstInn2 - 1));
  });
});

describe('plan (v1.2)', () => {
  it('no dead air: every chapter opens with a scene-setting line and most chapter balls have a voice', () => {
    for (const c of chapters) {
      expect(plan.beats.some((b) => b.seq === c.startBallSeq - 1)).toBe(true);
      const balls = c.endBallSeq - c.startBallSeq + 1;
      const voiced = new Set(plan.beats.filter((b) => b.seq >= c.startBallSeq && b.seq <= c.endBallSeq).map((b) => b.seq)).size;
      expect(voiced / balls).toBeGreaterThanOrEqual(0.8);
    }
  });
  it('the nudge comes before the call-back, and the call-back is the ball before Kohli’s dismissal', () => {
    expect(plan.nudges[0].seq).toBeLessThan(plan.callbacks[0].seq);
    expect(plan.callbacks[0].seq).toBe(seqOf(2, '11.1'));
    const cb = plan.beats.find((b) => b.intent === 'callback')!;
    expect(cb.friendId).toBe('dev'); // Kohli (Dev's hero) is at the crease
    expect(cb.fact).not.toMatch(/out|caught|wicket/i); // never spoils the next ball
  });
  it('the call-back ball still has a line for anyone who never stepped away (no silence before Kohli’s wicket)', () => {
    const at = plan.beats.filter((b) => b.seq === seqOf(2, '11.1'));
    expect(at.some((b) => b.intent === 'callback')).toBe(true);
    expect(at.some((b) => b.intent === 'chatter' && b.friendId !== 'dev')).toBe(true);
  });
  it('a Gang Call is offered when a chapter opens on a new over', () => {
    expect(plan.callOffers.map((o) => `${o.innings}-${o.over}`)).toEqual(['2-2', '2-10']);
  });
  it('beats never use facts from later balls (spoiler rule): chatter fact is that ball’s own text', () => {
    for (const b of plan.beats.filter((x) => x.intent === 'chatter')) expect(b.fact.startsWith(match.balls[b.seq].text)).toBe(true);
  });
  it('at most 2 reaction beats per ball, plus the scripted nudge/call-back; one line per friend per ball', () => {
    const c = new Map<number, number>(); plan.beats.filter((b) => b.intent !== 'nudge_away' && b.intent !== 'callback').forEach((b) => c.set(b.seq, (c.get(b.seq) ?? 0) + 1));
    expect(Math.max(...c.values())).toBeLessThanOrEqual(2);
    const k = plan.beats.map((b) => `${b.seq}-${b.friendId}`); expect(new Set(k).size).toBe(k.length);
    expect(plan.beats.some((b) => b.intent === 'nudge_away' && b.seq === seqOf(2, '2.4'))).toBe(true);
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
