// VideoElementSource (extension host, ADR-0017): the viewer's OWN <video> on youtube.com is the match source.
// A content script reads video.currentTime (and paused/rate/ad/volume) a few times a second and reports it over a
// transport; this class turns those reports into the MatchSource the engine already understands.
//  - Between reports, time is extrapolated from the last one (so the 250 ms engine poll stays smooth).
//  - The viewer owns the player: play(), pause() and seekTo() do nothing here; YouTube's own controls apply. Seeks
//    show up as jumps in time, which the tracker already handles (rewind = nothing re-delivered; forward = catch-up).
//  - Volume is the one thing we set: the gang's voices duck the video through it.
//  - Reports from any other video are ignored; no report for STALE_MS means the video is gone ('unstarted').
import { Emitter, type MatchSource, type SourceState } from './types';

export interface VideoReport {
  /** YouTube video id of the page (the `v` parameter) */
  videoId: string | null;
  t: number; paused: boolean; rate: number;
  /** an ad is playing in the same <video> element (YouTube marks the player with .ad-showing) */
  ad: boolean;
  /** 0–1, as on HTMLMediaElement */
  volume: number; muted: boolean;
}
export interface VideoTransport {
  onReport(cb: (r: VideoReport) => void): () => void;
  /** 0–100 */
  setVolume(v: number): void;
}
export const STALE_MS = 2_500;

export class VideoElementSource implements MatchSource {
  readonly kind = 'video' as const;
  private last?: VideoReport & { at: number };
  private state: SourceState = 'unstarted';
  private states = new Emitter<SourceState>();
  private off: () => void;

  constructor(private tr: VideoTransport, private videoId: string, private clock: { now(): number } = { now: () => Date.now() }) {
    this.off = tr.onReport((r) => {
      if (r.videoId !== this.videoId || !Number.isFinite(r.t)) return;
      this.last = { ...r, at: this.clock.now() };
      this.refresh();
    });
  }

  /** true once a report from the right video has arrived recently */
  get connected() { return !!this.last && this.clock.now() - this.last.at < STALE_MS; }

  private compute(): SourceState {
    if (!this.connected) return 'unstarted';
    const r = this.last!;
    return r.ad ? 'ad' : r.paused ? 'paused' : 'playing';
  }
  private refresh() { const s = this.compute(); if (s !== this.state) { this.state = s; this.states.emit(s); } }

  getCurrentTime() {
    this.refresh();
    const r = this.last; if (!r) return 0;
    return this.state === 'playing' ? r.t + ((this.clock.now() - r.at) / 1000) * r.rate : r.t;
  }
  getState() { this.refresh(); return this.state; }
  play() { /* the viewer's player: YouTube's own controls apply */ }
  pause() { /* the viewer's player */ }
  seekTo(_t: number) { /* the viewer's player */ }
  setVolume(v: number) { this.tr.setVolume(Math.max(0, Math.min(100, Math.round(v)))); }
  getVolume() { const r = this.last; return r ? (r.muted ? 0 : Math.round(r.volume * 100)) : 100; }
  onStateChange(cb: (s: SourceState) => void) { return this.states.on(cb); }
  destroy() { this.off(); }
}
