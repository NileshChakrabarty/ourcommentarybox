// Opens the match source: YouTube first, the scoreboard replay as an automatic fallback (embed blocked, video
// removed, API unreachable, player error). A failure AFTER the player is up also falls back, at the same time.
// YouTube error 5 ("HTML5 player error") is sometimes transient, so the embed is retried once before falling back.
import type { MatchVideo } from '../../core/types';
import type { MatchSource } from './types';
import { YouTubeSource } from './youtube';
import { ScoreboardSource } from './scoreboard';

export interface OpenOpts {
  mount?: HTMLElement | null;
  video?: MatchVideo;
  start: number;
  end: number;
  rate?: number;                 // scoreboard only (?speed=)
  forceScoreboard?: boolean;     // ?source=scoreboard
  /** a running source failed later: swap to the provided replacement (a retried embed, or the scoreboard) */
  onFallback: (s: MatchSource, reason: string) => void;
  readyTimeoutMs?: number;
  /** live broadcast: the embed has no controls (ADR-0014) */
  live?: boolean;
}

const transient = (why: string) => /error 5\b/.test(why);

export async function openSource(o: OpenOpts, attempt = 0): Promise<{ source: MatchSource; reason?: string }> {
  const board = (start: number) => new ScoreboardSource(start, o.rate ?? 1, o.end);
  if (o.forceScoreboard || !o.mount || !o.video) return { source: board(o.start), reason: o.forceScoreboard ? 'forced' : 'no video' };
  let yt: YouTubeSource | undefined;
  let handedOver = false;   // once true, failures are reported through onFallback
  let earlyFail: string | undefined;
  const lateFail = (why: string) => {
    const at = yt?.getCurrentTime() || o.start;
    yt?.destroy();
    if (attempt === 0 && transient(why)) {
      void openSource({ ...o, start: at }, 1).then(({ source, reason }) => o.onFallback(source, reason ?? why));
    } else o.onFallback(board(at), why);
  };
  try {
    yt = await YouTubeSource.create({
      mount: o.mount, videoId: o.video.id, start: o.start, readyTimeoutMs: o.readyTimeoutMs, live: o.live,
      onError: (why) => { if (handedOver) lateFail(why); else earlyFail = why; },
    });
  } catch (e) {
    return { source: board(o.start), reason: earlyFail ?? (e as Error).message };
  }
  if (earlyFail) {
    yt.destroy();
    if (attempt === 0 && transient(earlyFail)) return openSource(o, 1);
    return { source: board(o.start), reason: earlyFail };
  }
  handedOver = true;
  return { source: yt };
}
