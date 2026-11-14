// Opens the match source: YouTube first, the scoreboard replay as an automatic fallback (embed blocked, video
// removed, API unreachable, player error). A failure AFTER the player is up also falls back, at the same time.
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
  /** called when a running YouTube source fails later; swap to the provided scoreboard source */
  onFallback: (s: ScoreboardSource, reason: string) => void;
  readyTimeoutMs?: number;
}

export async function openSource(o: OpenOpts): Promise<{ source: MatchSource; reason?: string }> {
  const board = (start: number) => new ScoreboardSource(start, o.rate ?? 1, o.end);
  if (o.forceScoreboard || !o.mount || !o.video) return { source: board(o.start), reason: o.forceScoreboard ? 'forced' : 'no video' };
  let yt: YouTubeSource | undefined;
  let settled = false;
  let earlyFail: string | undefined;
  try {
    yt = await YouTubeSource.create({
      mount: o.mount, videoId: o.video.id, start: o.start, readyTimeoutMs: o.readyTimeoutMs,
      onError: (why) => {
        if (!settled) { earlyFail = why; return; }
        const at = yt?.getCurrentTime() || o.start;
        yt?.destroy();
        o.onFallback(board(at), why);
      },
    });
  } catch (e) {
    return { source: board(o.start), reason: earlyFail ?? (e as Error).message };
  }
  settled = true;
  if (earlyFail) { yt.destroy(); return { source: board(o.start), reason: earlyFail }; }
  return { source: yt };
}
