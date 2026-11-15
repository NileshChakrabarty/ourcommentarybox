// v1.3 simulated live broadcast (ADR-0014): no seek or pause is possible, the live clock keeps running while the tab
// is hidden, and the embed has no controls.
import { describe, it, expect, vi } from 'vitest';
import { LiveBroadcast, DRIFT_S, unwrap } from '../../src/services/source/live';
import { ScoreboardSource } from '../../src/services/source/scoreboard';
import { playerVars } from '../../src/services/source/youtube';

/** A wall clock we move by hand; the "player" (scoreboard) runs on the same clock, like a real video would. */
function rig(rate = 1, endT = 10_000) {
  let now = 1_000_000;
  const clock = { now: () => now };
  const inner = new ScoreboardSource(0, rate, Infinity, clock);
  const lb = new LiveBroadcast(inner, { joinT: 100, endT, rate }, clock);
  return { lb, inner, advance: (s: number) => { now += s * 1000; }, clock };
}

describe('LiveBroadcast: no seek, no pause', () => {
  it('starts on the join point and follows the wall clock', () => {
    const { lb, advance } = rig();
    lb.play();
    expect(lb.getCurrentTime()).toBeCloseTo(100, 1);
    advance(30);
    expect(lb.getCurrentTime()).toBeCloseTo(130, 1);
    expect(lb.getState()).toBe('playing');
  });
  it('pause() and seekTo() do nothing: the broadcast stays live', () => {
    const { lb, advance } = rig();
    lb.play(); advance(10);
    lb.pause(); lb.seekTo(5); lb.seekTo(9_000);
    advance(5);
    expect(lb.getState()).toBe('playing');
    expect(lb.getCurrentTime()).toBeCloseTo(115, 1);
  });
  it('a player paused from outside (a click on the video) is resumed on the live position', () => {
    const { lb, inner, advance } = rig();
    const fixes: string[] = []; lb.onCorrect = (w) => fixes.push(w);
    lb.play(); advance(10);
    inner.pause();                // someone paused the underlying player
    advance(20);                  // 20 s pass while it sits paused
    lb.getCurrentTime();          // the next read supervises
    expect(inner.getState()).toBe('playing');
    expect(lb.getCurrentTime()).toBeCloseTo(130, 0);
    expect(fixes).toEqual(['resumed']);
  });
  it(`a player more than ${DRIFT_S} s off live is moved back to live`, () => {
    const { lb, inner, advance } = rig();
    lb.play(); advance(10);
    inner.seekTo(40);             // the player jumped back (e.g. keyboard on a misbehaving embed)
    advance(3);
    expect(lb.getCurrentTime()).toBeCloseTo(113, 0);
  });
});

describe('LiveBroadcast: the live clock keeps running while the tab is hidden', () => {
  it('after a minute away (no reads, player throttled/paused), it lands on the live position', () => {
    const { lb, inner, advance } = rig();
    lb.play(); advance(5);
    expect(lb.getCurrentTime()).toBeCloseTo(105, 1);
    inner.pause();                // the browser suspended the hidden tab's player
    advance(60);                  // nothing reads the time for a minute
    expect(lb.liveTime()).toBeCloseTo(165, 1);
    expect(lb.getCurrentTime()).toBeCloseTo(165, 0);
  });
  it('a rejoin after a reload uses the original join time, not the reload time', () => {
    let now = 5_000_000; const clock = { now: () => now };
    const joinedAt = now - 90_000; // joined 90 s ago
    const lb = new LiveBroadcast(new ScoreboardSource(0, 1, Infinity, clock), { joinT: 100, endT: 10_000, rate: 1, joinedAt }, clock);
    lb.play();
    expect(lb.getCurrentTime()).toBeCloseTo(190, 0);
    now += 1000; expect(lb.liveTime()).toBeCloseTo(191, 1);
  });
  it('ends on its own at the end of the match and says so', () => {
    const { lb, advance } = rig(1, 160);
    const states: string[] = []; lb.onStateChange((s) => states.push(s));
    lb.play(); advance(70);
    expect(lb.getCurrentTime()).toBe(160);
    expect(lb.getState()).toBe('ended');
    expect(states).toContain('ended');
  });
  it('volume passes through (mute/volume are the only controls) and unwrap reaches the real source', () => {
    const { lb, inner } = rig();
    lb.setVolume(35); expect(inner.getVolume()).toBe(35); expect(lb.getVolume()).toBe(35);
    expect(unwrap(lb)).toBe(inner);
  });
});

describe('YouTube embed in live mode', () => {
  it('has no controls, no keyboard, no related videos; the normal embed keeps its controls', () => {
    const live = playerVars({ start: 13911.4, live: true }, 'https://x');
    expect(live).toMatchObject({ controls: 0, disablekb: 1, rel: 0, modestbranding: 1, fs: 0, playsinline: 1, start: 13911 });
    expect(playerVars({ start: 5 }, 'https://x').controls).toBeUndefined();
  });
});

vi.restoreAllMocks();
