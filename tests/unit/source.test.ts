// v1.2 sources: ducking restores volume; the app falls back to the scoreboard when the YouTube player errors.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Ducker, DUCK_TO } from '../../src/services/source/ducker';
import { ScoreboardSource } from '../../src/services/source/scoreboard';
import { openSource } from '../../src/services/source/open';
import { mapState } from '../../src/services/source/youtube';

describe('Ducker (player.setVolume ramp)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const player = (v = 80) => { const p = { v, getVolume: () => p.v, setVolume: vi.fn((x: number) => { p.v = x; }) }; return p; };

  it('ducks smoothly to 20 over ~200 ms and restores the previous volume', () => {
    const p = player(80); const d = new Ducker(() => p);
    d.duck();
    vi.advanceTimersByTime(50); expect(p.v).toBeGreaterThan(DUCK_TO); expect(p.v).toBeLessThan(80); // stepping, not a jump
    vi.advanceTimersByTime(200); expect(p.v).toBe(DUCK_TO);
    expect(p.setVolume.mock.calls.length).toBeGreaterThanOrEqual(4);
    d.restore(); vi.advanceTimersByTime(250);
    expect(p.v).toBe(80);
  });
  it('never raises a quiet player: a user at 10 stays at 10 while ducked', () => {
    const p = player(10); const d = new Ducker(() => p);
    d.duck(); vi.advanceTimersByTime(250); expect(p.v).toBe(10);
    d.restore(); vi.advanceTimersByTime(250); expect(p.v).toBe(10);
  });
  it('respects a volume change the user made while ducked', () => {
    const p = player(80); const d = new Ducker(() => p);
    d.duck(); vi.advanceTimersByTime(250);
    p.v = 55; // user drags YouTube's slider mid-clip
    d.restore(); vi.advanceTimersByTime(250);
    expect(p.v).toBe(55);
  });
  it('back-to-back clips stay ducked and restore once to the original volume', () => {
    const p = player(70); const d = new Ducker(() => p);
    d.duck(); vi.advanceTimersByTime(250); d.duck(); vi.advanceTimersByTime(250);
    expect(p.v).toBe(DUCK_TO);
    d.restore(); vi.advanceTimersByTime(250); expect(p.v).toBe(70);
  });
});

describe('ScoreboardSource (fallback) runs on video time', () => {
  it('advances at the given rate while playing, holds while paused, seeks, and ends', () => {
    let now = 0; const clock = { now: () => now };
    const s = new ScoreboardSource(100, 2, 130, clock);
    expect(s.getState()).toBe('unstarted');
    s.play(); now = 5_000; expect(s.getCurrentTime()).toBe(110);
    s.pause(); now = 9_000; expect(s.getCurrentTime()).toBe(110);
    s.seekTo(125); s.play(); now = 12_000; expect(s.getCurrentTime()).toBe(130);
    expect(s.getState()).toBe('ended');
  });
});

describe('YouTube → scoreboard fallback', () => {
  type Ev = { onReady?: () => void; onError?: (e: { data: number }) => void; onStateChange?: (e: { data: number }) => void };
  let lastEvents: Ev = {};
  beforeEach(() => {
    lastEvents = {};
    window.YT = { Player: class { constructor(_el: unknown, o: { events: Ev }) { lastEvents = o.events; } playVideo() {} pauseVideo() {} seekTo() {} getCurrentTime() { return 1234; } getPlayerState() { return 1; } setVolume() {} getVolume() { return 100; } unMute() {} isMuted() { return false; } destroy() {} } } as never;
  });
  afterEach(() => { delete window.YT; });
  const video = { provider: 'youtube' as const, id: 'UnRMj4ZC12o', title: '', owner: '', url: '' };

  it('uses YouTube when the player is ready', async () => {
    const p = openSource({ mount: document.createElement('div'), video, start: 10, end: 100, onFallback: vi.fn() });
    const { source } = await p; lastEvents.onReady?.();
    expect(source.kind).toBe('youtube');
  });
  it('retries the embed once on a transient error 5, at the same time', async () => {
    const onFallback = vi.fn();
    const { source } = await openSource({ mount: document.createElement('div'), video, start: 10, end: 99_999, onFallback });
    lastEvents.onReady?.();
    lastEvents.onError?.({ data: 5 });
    await vi.waitFor(() => expect(onFallback).toHaveBeenCalledTimes(1));
    expect(source.kind).toBe('youtube');
    expect(onFallback.mock.calls[0][0].kind).toBe('youtube');
  });
  it('switches to the scoreboard at the same time when the player raises onError (e.g. 150: embedding disabled)', async () => {
    const onFallback = vi.fn();
    const { source } = await openSource({ mount: document.createElement('div'), video, start: 10, end: 99_999, onFallback });
    lastEvents.onReady?.();
    expect(source.kind).toBe('youtube');
    lastEvents.onError?.({ data: 150 });
    expect(onFallback).toHaveBeenCalledTimes(1);
    const [board, reason] = onFallback.mock.calls[0];
    expect(board.kind).toBe('scoreboard');
    expect(board.getCurrentTime()).toBe(1234);
    expect(reason).toMatch(/150/);
  });
  it('falls back up front if the IFrame API never loads', async () => {
    delete window.YT;
    vi.useFakeTimers();
    const p = openSource({ mount: document.createElement('div'), video, start: 42, end: 100, onFallback: vi.fn() });
    await vi.advanceTimersByTimeAsync(11_000);
    const { source, reason } = await p;
    vi.useRealTimers();
    expect(source.kind).toBe('scoreboard');
    expect(source.getCurrentTime()).toBe(42);
    expect(reason).toMatch(/timeout|blocked/i);
  });
  it('maps player states; buffering and unstarted never count as playing', () => {
    expect([1, 2, 3, 0, -1, 5].map(mapState)).toEqual(['playing', 'paused', 'buffering', 'ended', 'unstarted', 'unstarted']);
  });
});
