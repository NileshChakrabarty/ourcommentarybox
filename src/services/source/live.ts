// LiveBroadcast (v1.3, ADR-0014): makes a recorded match behave like a live broadcast.
// The live position is wall-clock time since the viewer joined: liveTime = joinT + (now − joinedAt) × rate.
//  - No pause, no seek: pause() and seekTo() are ignored. If the player gets paused anyway (a click on the video,
//    the browser suspending it), the next check resumes it; if it drifts more than DRIFT_S from live, it is moved back.
//  - The clock keeps running while the tab is hidden or the viewer steps away: on return the player is put back on
//    the live position and the tracker sees a jump (the engine turns that into a catch-up).
//  - Volume and mute pass through (the only controls the viewer has).
// Wraps any MatchSource (the YouTube embed, or the scoreboard fallback), so a mid-match fallback keeps the same clock.
import { Emitter, type MatchSource, type SourceState } from './types';

export interface WallClock { now(): number }
const systemClock: WallClock = { now: () => Date.now() };

/** Further than this from live (seconds) and the player is put back on the live position. */
export const DRIFT_S = 4;
/** Minimum time between corrections, so a slow player isn't hammered with seeks. */
const FIX_EVERY_MS = 2_000;

export interface LiveAnchor { joinT: number; endT: number; rate: number; joinedAt?: number }

/** The source under any wrapper (for source-specific extras such as the scoreboard's crowd volume). */
export const unwrap = (s: MatchSource): MatchSource => (s instanceof LiveBroadcast ? unwrap(s.inner) : s);

export class LiveBroadcast implements MatchSource {
  readonly kind: MatchSource['kind'];
  private joinedAt?: number;
  private lastFix = -Infinity;
  private ended = false;
  private states = new Emitter<SourceState>();
  private unsub: () => void;
  /** corrections made (for the behind-the-scenes log) */
  onCorrect?: (what: 'resumed' | 'resynced', liveT: number, playerT: number) => void;

  constructor(readonly inner: MatchSource, private anchor: LiveAnchor, private clock: WallClock = systemClock) {
    this.kind = inner.kind;
    this.joinedAt = anchor.joinedAt;
    this.unsub = inner.onStateChange((s) => { if (!this.ended) this.states.emit(s); });
  }

  /** Wall-clock ms when this viewer joined (undefined until the broadcast starts). */
  get startedAt() { return this.joinedAt; }
  liveTime(): number {
    if (this.joinedAt === undefined) return this.anchor.joinT;
    return Math.min(this.anchor.endT, this.anchor.joinT + ((this.clock.now() - this.joinedAt) / 1000) * this.anchor.rate);
  }

  /** Keep the player on the live position. Cheap; called on every read of the time. */
  supervise() {
    if (this.joinedAt === undefined || this.ended) return;
    const live = this.liveTime();
    if (live >= this.anchor.endT) { this.ended = true; this.states.emit('ended'); return; }
    const now = this.clock.now();
    if (now - this.lastFix < FIX_EVERY_MS) return;
    const st = this.inner.getState();
    const t = this.inner.getCurrentTime();
    if (st === 'paused' || st === 'ended') {
      this.lastFix = now;
      if (Math.abs(t - live) > DRIFT_S) this.inner.seekTo(live);
      this.inner.play();
      this.onCorrect?.('resumed', live, t);
    } else if ((st === 'playing' && Math.abs(t - live) > DRIFT_S) || (st === 'buffering' && live - t > DRIFT_S * 4)) {
      this.lastFix = now;
      this.inner.seekTo(live);
      this.onCorrect?.('resynced', live, t);
    }
  }

  getCurrentTime() { this.supervise(); return this.ended ? this.anchor.endT : this.inner.getCurrentTime(); }
  /** Start (first call) on the live position; later calls only nudge a stalled player. */
  play() {
    if (this.joinedAt === undefined) this.joinedAt = this.clock.now();
    if (this.ended) return;
    const live = this.liveTime();
    if (Math.abs(this.inner.getCurrentTime() - live) > 1) this.inner.seekTo(live);
    this.inner.play();
  }
  pause() { /* live: no pause */ }
  seekTo(_t: number) { /* live: no seek */ }
  setVolume(v: number) { this.inner.setVolume(v); }
  getVolume() { return this.inner.getVolume(); }
  getState(): SourceState { return this.ended ? 'ended' : this.inner.getState(); }
  onStateChange(cb: (s: SourceState) => void) { return this.states.on(cb); }
  destroy() { this.unsub(); this.inner.destroy(); }
}
