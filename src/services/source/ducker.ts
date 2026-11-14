// Audio ducking for a cross-origin player: we can't route iframe audio through Web Audio, so we step the
// player's own volume (setVolume) down to DUCK_TO while a gang clip plays, and restore the user's volume after.
export const DUCK_TO = 20;
export const DUCK_RAMP_MS = 200;
const STEPS = 8;

export interface VolumeTarget { getVolume(): number; setVolume(v: number): void }
type Timer = { set: (f: () => void, ms: number) => unknown; clear: (h: unknown) => void };
const realTimer: Timer = { set: (f, ms) => setTimeout(f, ms), clear: (h) => clearTimeout(h as number) };

export class Ducker {
  private base?: number;       // user's volume before ducking
  private lastSet?: number;    // last value we set (to detect the user changing volume mid-duck)
  private timers: unknown[] = [];
  /** target of an in-progress restore ramp: a clip that starts mid-ramp must not mistake a half-restored level for the user's */
  private restoring?: number;
  ducked = false;

  constructor(private target: () => VolumeTarget | undefined, private timer: Timer = realTimer, private level = DUCK_TO, private rampMs = DUCK_RAMP_MS) {}

  duck() {
    const t = this.target(); if (!t) return;
    if (!this.ducked) { this.base = this.restoring ?? t.getVolume(); this.ducked = true; this.restoring = undefined; }
    else if (this.lastSet !== undefined && Math.abs(t.getVolume() - this.lastSet) > 1) this.base = t.getVolume(); // user moved it
    const to = Math.min(this.level, this.base ?? 100);
    this.ramp(t, t.getVolume(), to);
  }

  restore() {
    const t = this.target(); if (!t || !this.ducked) return;
    this.ducked = false;
    const now = t.getVolume();
    // if the user changed the volume while we were ducked, respect their choice
    const userMoved = this.lastSet !== undefined && Math.abs(now - this.lastSet) > 1;
    const to = userMoved ? now : this.base ?? 100;
    this.restoring = to;
    this.ramp(t, now, to, () => { this.restoring = undefined; });
  }

  private ramp(t: VolumeTarget, from: number, to: number, done?: () => void) {
    this.timers.forEach((h) => this.timer.clear(h)); this.timers = [];
    for (let i = 1; i <= STEPS; i++) {
      const v = Math.round(from + ((to - from) * i) / STEPS);
      this.timers.push(this.timer.set(() => { this.lastSet = v; t.setVolume(v); if (i === STEPS) done?.(); }, (this.rampMs * i) / STEPS));
    }
  }
}
