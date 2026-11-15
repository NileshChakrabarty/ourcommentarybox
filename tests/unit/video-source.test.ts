// Extension host (ADR-0017): VideoElementSource turns the viewer's own <video> time into balls, and the panel module
// is host-agnostic (it never imports the web host's player code).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { VideoElementSource, STALE_MS, type VideoReport } from '../../src/services/source/video';
import { BallTracker } from '../../src/core/tracker';
import { match, tl, seqOf } from './helpers';

const VID = 'UnRMj4ZC12o';
function rig() {
  let now = 0;
  let cb: (r: VideoReport) => void = () => {};
  const vols: number[] = [];
  const src = new VideoElementSource({ onReport: (f) => { cb = f; return () => { cb = () => {}; }; }, setVolume: (v) => vols.push(v) }, VID, { now: () => now });
  const report = (p: Partial<VideoReport>) => cb({ videoId: VID, t: 0, paused: false, rate: 1, ad: false, volume: 1, muted: false, ...p });
  return { src, report, vols, advance: (ms: number) => { now += ms; } };
}

describe('VideoElementSource: <video> time → ball', () => {
  it('maps the reported time to the right ball, extrapolating between reports', () => {
    const { src, report, advance } = rig();
    const tr = new BallTracker(tl);
    const rohit = seqOf(2, '2.4');
    report({ t: tl.timeOf(rohit) - 1.5 });
    expect(src.getState()).toBe('playing');
    tr.resetTo(tl.ballAt(src.getCurrentTime()));
    expect(tr.update(src.getCurrentTime(), src.getState())).toEqual([]);
    advance(2_000); // no new report yet: time is extrapolated (still inside STALE_MS)
    const ev = tr.update(src.getCurrentTime(), src.getState());
    expect(ev).toContainEqual({ type: 'reveal', seq: rohit });
    expect(match.balls[rohit].wicket?.playerOutId).toBe('rg-sharma');
  });
  it('ignores reports from any other video, and goes unstarted when reports stop', () => {
    const { src, report, advance } = rig();
    report({ videoId: 'somethingElse', t: 13_950 });
    expect(src.getState()).toBe('unstarted');
    report({ t: 13_950 });
    expect(src.connected).toBe(true);
    advance(STALE_MS + 1);
    expect(src.getState()).toBe('unstarted');
  });
  it('paused or an ad: time stands still and no ball is revealed', () => {
    const { src, report, advance } = rig();
    const tr = new BallTracker(tl);
    report({ t: 13_940, paused: true });
    tr.resetTo(tl.ballAt(13_940));
    advance(20_000); report({ t: 13_940, paused: true });
    expect(src.getCurrentTime()).toBe(13_940);
    expect(tr.update(src.getCurrentTime(), src.getState())).toEqual([]);
    report({ t: 13_940, ad: true });
    expect(src.getState()).toBe('ad');
    expect(tr.update(src.getCurrentTime() + 30, src.getState())).toEqual([]);
  });
  it('the viewer owns the player: play/pause/seek do nothing; a user seek back never re-reveals a ball', () => {
    const { src, report } = rig();
    const tr = new BallTracker(tl);
    report({ t: 13_960 }); tr.resetTo(tl.ballAt(13_960));
    src.pause(); src.seekTo(0); src.play();
    expect(src.getCurrentTime()).toBeCloseTo(13_960, 0);
    report({ t: 13_800 }); // the viewer drags YouTube's seek bar back
    const ev = tr.update(src.getCurrentTime(), src.getState());
    expect(ev.some((e) => e.type === 'reveal')).toBe(false);
    expect(ev[0]).toMatchObject({ type: 'rewind' });
  });
  it('volume: reads the video volume (muted = 0) and ducks through the transport', () => {
    const { src, report, vols } = rig();
    report({ t: 1, volume: 0.6 }); expect(src.getVolume()).toBe(60);
    report({ t: 1, muted: true }); expect(src.getVolume()).toBe(0);
    src.setVolume(20.4); expect(vols).toEqual([20]);
  });
});

describe('one panel, two hosts', () => {
  it('the panel module never imports host or player code (it depends only on the store, the engine and MatchSource)', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p); } };
    walk('src/panel');
    const bad = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => [f, m[1]] as const))
      .filter(([, mod]) => /stage\/|hosts\/|source\/(youtube|open|live|scoreboard|video)|\/App|\/nav$/.test(mod));
    expect(bad).toEqual([]);
  });
});
