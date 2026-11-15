// WEB host actions (ADR-0017): create the room engine and boot our YouTube embed (or the scoreboard fallback) as a
// LIVE broadcast. The extension host has its own boot: the viewer's own <video> is the source there.
import { room, patch } from '../../store/room';
import { RoomEngine, setEngine, engine, loadSources, liveRate, type LiveSnapshot } from '../../services/engine';
import { storage } from '../../services/storage/db';
import { openSource } from '../../services/source/open';
import { LiveBroadcast, type LiveAnchor } from '../../services/source/live';
import { joinTime } from '../../core/friends/director';
import { FRIENDS, DEFAULT_SELF_LOYALTY } from '../../content/gang';
import { audio } from '../../services/audio/engine';
import { xclear, xlog } from '../../services/xray';
import { selfMember, resetRoom } from '../../panel/commands';
import type { Member } from '../../core/types';

function reset() { resetRoom(); xclear(); }
const params = () => new URLSearchParams(location.search);

/** Live anchor for the broadcast: where the viewer joined (video s), when (wall clock), how fast, and where it ends. */
let pending: { anchor: LiveAnchor; silentUpTo?: number } | undefined;

function anchorFor(joinedAt?: number): LiveAnchor {
  const st = room();
  const live = st.live!, tl = st.timeline!;
  return { joinT: joinTime(tl, live), endT: tl.timeOf(live.endBallSeq) + 20, rate: liveRate(), joinedAt };
}
/** Live position right now for a room that started at `joinedAt` (wall-clock ms). */
export function liveNow(a: LiveAnchor) { return a.joinT + ((Date.now() - (a.joinedAt ?? Date.now())) / 1000) * a.rate; }

function newEngine(members: Member[], roomId?: string) {
  const st = room();
  const e = new RoomEngine(st.match!, members, st.timeline!, st.live!, { roomId, lang: st.lang, gangCalls: st.gangCalls });
  setEngine(e);
  return e;
}

/** "Join the box": a new live room, joined a few seconds before the next big moment (ADR-0014). */
export function joinBox() {
  const members = [selfMember(DEFAULT_SELF_LOYALTY), ...FRIENDS];
  reset();
  audio.unlock(); // inside the click → unlocks autoplay
  const e = newEngine(members);
  const anchor = anchorFor();
  pending = { anchor };
  e.prefetch(anchor.joinT, true); // start writing the first lines while the player loads
  patch({ selfLoyalty: DEFAULT_SELF_LOYALTY, members, screen: 'live', resumable: undefined, coach: true });
  xlog('live', '–', `Joined live at video ${anchor.joinT.toFixed(0)} s (just before ball ${room().match!.balls[room().live!.joinBallSeq].label}); the broadcast runs on the wall clock to the last ball`);
  void storage.clearLive();
}

/** Rejoin a live room after a reload. The broadcast kept running meanwhile, so you land on the live ball. */
export async function resumeBox(): Promise<boolean> {
  const snap = await storage.getLive<LiveSnapshot>();
  if (!snap?.joinedAt) { patch({ resumable: undefined }); return false; }
  const anchor = { ...anchorFor(snap.joinedAt), rate: snap.rate || 1 };
  if (liveNow(anchor) >= anchor.endT) { await storage.clearLive(); patch({ resumable: undefined }); return false; }
  const members = [selfMember(snap.loyalty), ...FRIENDS];
  reset();
  audio.unlock();
  const e = newEngine(members, snap.roomId);
  e.restore(snap.feed.map((f) => ({ ...f, unheard: false })), snap.calls, await loadSources(snap.feed, room().lang));
  e.roomStart = snap.roomStart; e.joinedAt = snap.joinedAt;
  pending = { anchor, silentUpTo: snap.maxRevealed };
  patch({ selfLoyalty: snap.loyalty, members, screen: 'live', resumable: undefined, playhead: snap.maxRevealed, toast: { text: 'Back in the box. The match kept going live.', at: Date.now() } });
  return true;
}

/** Called by the stage once its player mount exists: open YouTube (or the scoreboard fallback) as a live broadcast. */
export async function bootSource(mount: HTMLElement | null) {
  const e = engine; const st = room();
  if (!e || !pending || !st.match) return;
  const { anchor, silentUpTo } = pending; pending = undefined;
  const joinedAt = anchor.joinedAt ?? Date.now();
  const at = { ...anchor, joinedAt };
  const wrap = (s: Parameters<typeof e.attach>[0]) => {
    const lb = new LiveBroadcast(s, at);
    lb.onCorrect = (what, liveT, playerT) => xlog('live', e.match.balls[room().position]?.label ?? '–', what === 'resumed'
      ? `The player was paused; resumed on the live position (${liveT.toFixed(0)} s)`
      : `The player drifted ${Math.abs(liveT - playerT).toFixed(0)} s from live; moved back to ${liveT.toFixed(0)} s`);
    return lb;
  };
  const { source, reason } = await openSource({
    mount, video: st.match.video, start: liveNow(at), end: anchor.endT, live: true,
    rate: anchor.rate,
    forceScoreboard: params().get('source') === 'scoreboard',
    onFallback: (next, why) => { if (engine !== e) { next.destroy(); return; } const lb = wrap(next); e.attach(lb, next.kind === 'scoreboard' ? fallbackNote(why) : undefined); lb.play(); },
  });
  if (engine !== e) { source.destroy(); return; }
  const lb = wrap(source);
  e.joinedAt ??= joinedAt;
  e.attach(lb, source.kind === 'scoreboard' && reason !== 'forced' ? fallbackNote(reason) : undefined);
  e.start(liveNow(at), { silentUpTo });
  lb.setVolume(room().volume);
}
const fallbackNote = (why?: string) => { if (why) console.info('[apnacommentarybox] video fallback:', why); return "The match video won't play here, so you're on the scoreboard replay. Same balls, same gang, still live."; };

