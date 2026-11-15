// YouTubeSource: the official ECB upload, embedded with the YouTube IFrame Player API.
// Embed only — never downloaded, re-hosted or overlaid; YouTube's branding stays visible.
// v1.3 live mode (ADR-0014): controls=0 and disablekb=1, so there is no seek bar, pause or keyboard seeking;
// the viewer gets mute/volume in our own controls beside the player. modestbranding is requested where allowed
// (YouTube no longer hides its logo for it, so the branding stays visible either way).
import { Emitter, type MatchSource, type SourceState } from './types';

/* Minimal typings for the parts of the IFrame API we use. */
interface YTPlayer {
  playVideo(): void; pauseVideo(): void; seekTo(t: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number; getPlayerState(): number; setVolume(v: number): void; getVolume(): number;
  unMute(): void; isMuted(): boolean; destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement | string, opts: {
    videoId: string; width?: string | number; height?: string | number;
    playerVars?: Record<string, string | number>;
    events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: (e: { data: number }) => void };
  }) => YTPlayer;
}
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

const API_SRC = 'https://www.youtube.com/iframe_api';
let apiPromise: Promise<YTNamespace> | undefined;
export function loadYouTubeApi(timeoutMs = 10_000): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const t = setTimeout(() => { apiPromise = undefined; reject(new Error('YouTube API timeout')); }, timeoutMs);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); clearTimeout(t); resolve(window.YT!); };
    const s = document.createElement('script');
    s.src = API_SRC; s.async = true;
    s.onerror = () => { clearTimeout(t); apiPromise = undefined; reject(new Error('YouTube API blocked')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

/** YT.PlayerState → our state. Ads: the content time doesn't advance, so the tracker sees no new ball (= paused). */
export function mapState(s: number): SourceState {
  switch (s) {
    case 1: return 'playing';
    case 2: return 'paused';
    case 3: return 'buffering';
    case 0: return 'ended';
    default: return 'unstarted'; // -1 unstarted, 5 cued
  }
}

export interface YouTubeOpts { mount: HTMLElement; videoId: string; start?: number; onError: (reason: string) => void; readyTimeoutMs?: number; live?: boolean }

/** Player parameters. Live: no controls, no keyboard, no related videos, no annotations. */
export function playerVars(o: { start?: number; live?: boolean }, origin: string): Record<string, string | number> {
  const base = { playsinline: 1, rel: 0, start: Math.floor(o.start ?? 0), origin };
  return o.live ? { ...base, controls: 0, disablekb: 1, modestbranding: 1, iv_load_policy: 3, fs: 0 } : { ...base, modestbranding: 0 };
}

export class YouTubeSource implements MatchSource {
  readonly kind = 'youtube' as const;
  private player?: YTPlayer;
  private state: SourceState = 'unstarted';
  private states = new Emitter<SourceState>();
  private ready = false;
  private pending: (() => void)[] = [];
  private failed = false;

  static async create(o: YouTubeOpts): Promise<YouTubeSource> {
    const src = new YouTubeSource();
    let YT: YTNamespace;
    try { YT = await loadYouTubeApi(); } catch (e) { o.onError((e as Error).message); throw e; }
    const fail = (why: string) => { if (src.failed) return; src.failed = true; o.onError(why); };
    const readyTimer = setTimeout(() => { if (!src.ready) fail('YouTube player did not become ready'); }, o.readyTimeoutMs ?? 12_000);
    const el = document.createElement('div');
    o.mount.replaceChildren(el);
    src.player = new YT.Player(el, {
      videoId: o.videoId, width: '100%', height: '100%',
      playerVars: playerVars(o, location.origin),
      events: {
        onReady: () => { clearTimeout(readyTimer); src.ready = true; src.pending.splice(0).forEach((f) => f()); },
        onStateChange: (e) => { src.state = mapState(e.data); src.states.emit(src.state); },
        // 2 bad id, 5 HTML5 error, 100 removed/private, 101/150 embedding disabled
        onError: (e) => fail(`YouTube error ${e.data}`),
      },
    });
    return src;
  }

  private whenReady(f: () => void) { if (this.ready) f(); else this.pending.push(f); }
  getCurrentTime() { return this.ready ? this.player!.getCurrentTime() || 0 : 0; }
  play() { this.whenReady(() => { this.player!.unMute(); this.player!.playVideo(); }); }
  pause() { this.whenReady(() => this.player!.pauseVideo()); }
  seekTo(t: number) { this.whenReady(() => this.player!.seekTo(Math.max(0, t), true)); }
  setVolume(v: number) { this.whenReady(() => this.player!.setVolume(Math.round(Math.max(0, Math.min(100, v))))); }
  getVolume() { return this.ready ? this.player!.getVolume() : 100; }
  getState() { return this.state; }
  onStateChange(cb: (s: SourceState) => void) { return this.states.on(cb); }
  destroy() { try { this.player?.destroy(); } catch { /* already gone */ } }
}
