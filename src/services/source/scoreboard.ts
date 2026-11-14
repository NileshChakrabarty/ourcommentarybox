// ScoreboardSource: the stylised scoreboard replay, used automatically when the embed fails.
// It runs on the SAME timeline as the video (virtual seconds), so chapters, sync and the journey are identical.
import { Emitter, type MatchSource, type SourceState } from './types';

export interface Clock { now(): number }
const perfClock: Clock = { now: () => performance.now() };

export class ScoreboardSource implements MatchSource {
  readonly kind = 'scoreboard' as const;
  private t0Real = 0;      // real ms when `base` was set
  private base = 0;        // video seconds at t0Real
  private state: SourceState = 'unstarted';
  private states = new Emitter<SourceState>();
  private volume = 100;
  private volumes = new Emitter<number>();

  constructor(start = 0, private rate = 1, private end = Infinity, private clock: Clock = perfClock) { this.base = start; }

  getCurrentTime() {
    if (this.state !== 'playing') return this.base;
    const t = this.base + ((this.clock.now() - this.t0Real) / 1000) * this.rate;
    if (t >= this.end) { this.base = this.end; this.set('ended'); return this.end; }
    return t;
  }
  play() { if (this.state === 'playing') return; this.t0Real = this.clock.now(); this.set('playing'); }
  pause() { if (this.state !== 'playing') return; this.base = this.getCurrentTime(); this.set('paused'); }
  seekTo(t: number) { this.base = Math.max(0, Math.min(t, this.end)); this.t0Real = this.clock.now(); if (this.state === 'ended') this.set('paused'); }
  setVolume(v: number) { this.volume = Math.max(0, Math.min(100, v)); this.volumes.emit(this.volume); }
  getVolume() { return this.volume; }
  /** crowd-synth gain follows the volume (ducking works the same way as on YouTube) */
  onVolume(cb: (v: number) => void) { return this.volumes.on(cb); }
  getState() { return this.state; }
  onStateChange(cb: (s: SourceState) => void) { return this.states.on(cb); }
  destroy() { this.state = 'paused'; }
  private set(s: SourceState) { if (s !== this.state) { this.state = s; this.states.emit(s); } }
}
