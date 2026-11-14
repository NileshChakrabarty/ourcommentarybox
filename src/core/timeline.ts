// Ball ↔ video-time map (pure). One entry per delivery; `videoTime` is the second at which the ball's RESULT is
// visible in the video. Entries with tagged:false are interpolated between the nearest anchors (tagged:true).
export type TimelineSrc = 'tag' | 'scorebug' | 'interp';
export interface TimelineEntry {
  ballSeq: number; innings: 1 | 2; over: number; ball: number;
  videoTime: number; tagged: boolean; src?: TimelineSrc;
}
export interface RawEntry extends Omit<TimelineEntry, 'videoTime'> { videoTime?: number }

/** Default spacing between deliveries when extrapolating outside the anchors (a full-match ODI broadcast ≈ 40 s). */
export const DEFAULT_GAP_S = 40;

/**
 * Fill every untagged ball by linear interpolation (by delivery index) between the nearest tagged balls.
 * Outside the first/last anchor, extrapolate at `gap` seconds per ball. Result is sorted and monotonic.
 */
export function interpolate(entries: RawEntry[], gap = DEFAULT_GAP_S): TimelineEntry[] {
  const list = [...entries].sort((a, b) => a.ballSeq - b.ballSeq);
  const anchors = list.map((e, i) => ({ e, i })).filter(({ e }) => e.tagged && typeof e.videoTime === 'number');
  if (!anchors.length) return list.map((e, i) => ({ ...e, videoTime: i * gap, tagged: false, src: 'interp' }));
  const out: TimelineEntry[] = list.map((e) => ({ ...e, videoTime: e.videoTime ?? 0 }));
  const first = anchors[0], last = anchors[anchors.length - 1];
  for (let i = 0; i < first.i; i++) out[i] = { ...out[i], videoTime: Math.max(0, first.e.videoTime! - (first.i - i) * gap), tagged: false, src: 'interp' };
  for (let i = last.i + 1; i < out.length; i++) out[i] = { ...out[i], videoTime: last.e.videoTime! + (i - last.i) * gap, tagged: false, src: 'interp' };
  for (let k = 0; k < anchors.length - 1; k++) {
    const a = anchors[k], b = anchors[k + 1];
    for (let i = a.i + 1; i < b.i; i++) {
      const f = (i - a.i) / (b.i - a.i);
      out[i] = { ...out[i], videoTime: round1(a.e.videoTime! + f * (b.e.videoTime! - a.e.videoTime!)), tagged: false, src: 'interp' };
    }
  }
  // enforce monotonic (bad tags never make time run backwards)
  for (let i = 1; i < out.length; i++) if (out[i].videoTime < out[i - 1].videoTime) out[i] = { ...out[i], videoTime: out[i - 1].videoTime };
  return out;
}
const round1 = (x: number) => Math.round(x * 10) / 10;

export class Timeline {
  readonly entries: TimelineEntry[];
  private times: number[];
  constructor(entries: TimelineEntry[]) {
    this.entries = [...entries].sort((a, b) => a.ballSeq - b.ballSeq);
    this.times = this.entries.map((e) => e.videoTime);
  }
  get length() { return this.entries.length; }
  /** The current ball = the last ball whose videoTime ≤ t; -1 before the first ball. */
  ballAt(t: number): number {
    let lo = 0, hi = this.times.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (this.times[mid] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans < 0 ? -1 : this.entries[ans].ballSeq;
  }
  timeOf(seq: number): number { return this.entries[Math.max(0, Math.min(seq, this.entries.length - 1))].videoTime; }
  /** Seconds until ball `seq` is revealed, from video time t (negative if already past). */
  untilBall(seq: number, t: number) { return this.timeOf(seq) - t; }
}
