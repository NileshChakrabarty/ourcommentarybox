// v1.2: ball ↔ video-time map and the spoiler-safe tracker.
import { describe, it, expect } from 'vitest';
import { interpolate, Timeline, type RawEntry } from '../../src/core/timeline';
import { BallTracker } from '../../src/core/tracker';

const raw = (n: number, tags: Record<number, number>): RawEntry[] =>
  Array.from({ length: n }, (_, i) => ({ ballSeq: i, innings: 1, over: Math.floor(i / 6), ball: (i % 6) + 1, tagged: i in tags, videoTime: tags[i] }));

describe('interpolate', () => {
  it('fills untagged balls linearly between the nearest tagged balls and marks them tagged:false', () => {
    const tl = interpolate(raw(5, { 0: 100, 4: 140 }));
    expect(tl.map((e) => e.videoTime)).toEqual([100, 110, 120, 130, 140]);
    expect(tl.map((e) => e.tagged)).toEqual([true, false, false, false, true]);
    expect(tl[2].src).toBe('interp');
  });
  it('extrapolates before the first and after the last anchor at the default gap, never below 0', () => {
    const tl = interpolate(raw(6, { 2: 50, 3: 90 }), 40);
    expect(tl.map((e) => e.videoTime)).toEqual([0, 10, 50, 90, 130, 170]);
  });
  it('keeps time monotonic even if two tags are out of order', () => {
    const tl = interpolate(raw(3, { 0: 100, 1: 90, 2: 120 }));
    expect(tl.map((e) => e.videoTime)).toEqual([100, 100, 120]);
  });
});

describe('Timeline lookup (time → ball)', () => {
  const tl = new Timeline(interpolate(raw(4, { 0: 10, 1: 20, 2: 30, 3: 40 })));
  it('is -1 before the first ball', () => expect(tl.ballAt(9.9)).toBe(-1));
  it('is the last ball whose videoTime ≤ t', () => {
    expect(tl.ballAt(10)).toBe(0);
    expect(tl.ballAt(29.99)).toBe(1);
    expect(tl.ballAt(30)).toBe(2);
    expect(tl.ballAt(1e6)).toBe(3);
  });
  it('timeOf is the inverse for tagged balls', () => expect(tl.timeOf(2)).toBe(30));
});

describe('BallTracker delivery rules', () => {
  const tl = new Timeline(interpolate(raw(20, Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i, 100 + i * 10])))));
  const reveals = (ev: ReturnType<BallTracker['update']>) => ev.filter((e) => e.type === 'reveal').map((e) => (e as { seq: number }).seq);

  it('normal playback reveals each ball once, in order', () => {
    const t = new BallTracker(tl); t.resetTo(-1);
    expect(reveals(t.update(100, 'playing'))).toEqual([0]);
    expect(reveals(t.update(105, 'playing'))).toEqual([]);
    expect(reveals(t.update(121, 'playing'))).toEqual([1, 2]); // a slow poll still reveals both, in order
  });
  it('seek forward beyond 2 balls emits one skip (catch-up), not a burst of reveals', () => {
    const t = new BallTracker(tl); t.resetTo(2);
    const ev = t.update(190, 'playing');
    expect(reveals(ev)).toEqual([]);
    expect(ev.find((e) => e.type === 'skip')).toEqual({ type: 'skip', from: 2, to: 9 });
    expect(t.maxRevealed).toBe(9);
  });
  it('seek backwards never re-delivers; moving forward again only reveals new balls', () => {
    const t = new BallTracker(tl); t.resetTo(-1);
    t.update(150, 'playing'); // skip to 5
    const back = t.update(110, 'playing');
    expect(back[0]).toEqual({ type: 'rewind', to: 1 });
    expect(reveals(t.update(150, 'playing'))).toEqual([]);      // replaying seen balls: nothing new
    expect(reveals(t.update(160, 'playing'))).toEqual([6]);     // first unseen ball is revealed
  });
  it('paused, buffering and ad states are treated as paused', () => {
    const t = new BallTracker(tl); t.resetTo(-1);
    for (const s of ['paused', 'buffering', 'ad', 'unstarted'] as const) expect(t.update(150, s)).toEqual([]);
    expect(t.position).toBe(-1);
  });
  it('resetTo makes a chapter start silent', () => {
    const t = new BallTracker(tl); t.resetTo(7);
    expect(reveals(t.update(180, 'playing'))).toEqual([8]);
  });
});
