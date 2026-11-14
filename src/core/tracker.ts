// BallTracker (pure): turns the match source's playhead time into ball events, enforcing the spoiler rule.
//  - normal play           → `reveal` for each new ball, in order (items anchored to it may now be delivered)
//  - seek forward > N balls → one `skip` (skipped items go to catch-up, never a burst of clips)
//  - seek backwards        → `rewind` (position only; nothing is ever re-delivered)
//  - paused / buffering / ad → nothing (treated as paused)
import type { Timeline } from './timeline';

export type SourceState = 'unstarted' | 'playing' | 'paused' | 'buffering' | 'ad' | 'ended';
export type TrackEvent =
  | { type: 'reveal'; seq: number }
  | { type: 'skip'; from: number; to: number }   // (from, to] were jumped over; `to` is now revealed
  | { type: 'rewind'; to: number }
  | { type: 'position'; seq: number };            // playhead moved (UI only)

/** A forward jump of more than this many balls is a seek, not playback. */
export const SKIP_BALLS = 2;

export class BallTracker {
  /** ball currently on screen (may be < maxRevealed after a rewind) */
  position = -1;
  /** highest ball ever revealed in this room — the spoiler high-water mark */
  maxRevealed = -1;

  constructor(private tl: Timeline, private skipBalls = SKIP_BALLS) {}

  /** Start (or jump) silently: everything up to and including `seq` counts as already seen. */
  resetTo(seq: number) { this.position = seq; this.maxRevealed = Math.max(this.maxRevealed, seq); }

  update(time: number, state: SourceState): TrackEvent[] {
    if (state !== 'playing') return [];
    const target = this.tl.ballAt(time);
    if (target === this.position) return [];
    const ev: TrackEvent[] = [];
    if (target < this.position) {
      this.position = target;
      ev.push({ type: 'rewind', to: target }, { type: 'position', seq: target });
      return ev;
    }
    // moving forward
    const from = Math.max(this.position, this.maxRevealed);
    this.position = target;
    if (target <= this.maxRevealed) { ev.push({ type: 'position', seq: target }); return ev; } // replaying seen balls
    if (target - from > this.skipBalls) ev.push({ type: 'skip', from, to: target });
    else for (let s = from + 1; s <= target; s++) ev.push({ type: 'reveal', seq: s });
    this.maxRevealed = target;
    ev.push({ type: 'position', seq: target });
    return ev;
  }
}
