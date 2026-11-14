// Deterministic replay clock driven by elapsed real time (robust to throttled timers in hidden tabs).
// No DOM: the caller feeds `now` (ms) via tick().
import { anticipationMs } from './pacing';

export interface ClockEvents {
  ballStarted(seq: number): void;   // bowler running in (dismiss old cards here)
  ballRevealed(seq: number): void;  // result known → playhead = seq
  ended(): void;
}

export class ReplayClock {
  /** index of the slot currently playing */
  slot = 0;
  /** ms elapsed inside current slot (scaled) */
  inSlot = 0;
  revealed = -1;
  paused = true;
  ended = false;
  speed = 1;
  /** number of active holds (e.g. waiting for a gang clip to finish); clock does not advance while > 0 */
  private holds = new Map<string, number>(); // key → expiry (ms timestamp, real)
  private last?: number;
  private startedSlot = -1;

  constructor(private durations: number[], private ev: ClockEvents, startAt = 0) {
    this.slot = startAt; this.revealed = startAt - 1;
  }

  get playhead() { return this.revealed; }
  get total() { return this.durations.length; }
  setDurations(d: number[]) { this.durations = d; }

  play(now: number) { this.paused = false; this.last = now; }
  pause() { this.paused = true; this.last = undefined; }
  /** hold the clock at most `maxMs` (real time) — released by release(key) or expiry */
  hold(key: string, now: number, maxMs: number) { this.holds.set(key, now + maxMs); }
  release(key: string) { this.holds.delete(key); }
  isHeld(now: number) {
    for (const [k, exp] of this.holds) if (exp <= now) this.holds.delete(k);
    return this.holds.size > 0;
  }

  /** Advance by real time. Can process several slots in one tick (hidden tab catch-up). */
  tick(now: number) {
    if (this.paused || this.ended) return;
    const dtReal = this.last === undefined ? 0 : Math.min(now - this.last, 5_000);
    this.last = now;
    if (this.isHeld(now)) return;
    let dt = dtReal * this.speed;
    let guard = 0;
    while (!this.ended && guard++ < 500) {
      if (this.startedSlot !== this.slot) { this.startedSlot = this.slot; this.ev.ballStarted(this.slot); }
      const dur = this.durations[this.slot];
      const ant = anticipationMs(dur);
      if (this.revealed < this.slot && this.inSlot + dt >= ant) {
        dt -= Math.max(0, ant - this.inSlot); this.inSlot = ant;
        this.revealed = this.slot; this.ev.ballRevealed(this.slot);
        if (this.isHeld(now)) return; // a reveal handler may add a hold
      }
      if (this.inSlot + dt < dur) { this.inSlot += dt; return; }
      dt -= dur - this.inSlot; this.inSlot = 0;
      if (this.slot >= this.durations.length - 1) { this.ended = true; this.ev.ended(); return; }
      this.slot++;
    }
  }

  /** ms of replay remaining at speed 1 (for UI) */
  remainingMs() { return this.durations.slice(this.slot).reduce((a, b) => a + b, 0) - this.inSlot; }
}
