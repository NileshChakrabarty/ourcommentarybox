// MatchSource: the ONLY way the app touches the match (spec v1.2 §1.1). Time is in seconds of the match video.
import type { SourceState } from '../../core/tracker';
export type { SourceState };

export interface MatchSource {
  /** youtube = our embed (web host), scoreboard = fallback replay, video = the viewer's own <video> (extension host) */
  readonly kind: 'youtube' | 'scoreboard' | 'video';
  getCurrentTime(): number;
  play(): void;
  pause(): void;
  seekTo(t: number): void;
  /** 0–100 */
  setVolume(v: number): void;
  getVolume(): number;
  getState(): SourceState;
  onStateChange(cb: (s: SourceState) => void): () => void;
  destroy(): void;
}

/** Shared listener plumbing for sources. */
export class Emitter<T> {
  private fns = new Set<(v: T) => void>();
  on(fn: (v: T) => void) { this.fns.add(fn); return () => { this.fns.delete(fn); }; }
  emit(v: T) { this.fns.forEach((f) => f(v)); }
}
