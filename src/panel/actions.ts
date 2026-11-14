// UI-level actions that create/replace the room engine and boot its match source.
import { room, patch } from '../store/room';
import { RoomEngine, setEngine, engine, loadSources, CHAPTER_LEAD_S, type SavedRoom, type LiveSnapshot } from '../services/engine';
import { storage } from '../services/storage/db';
import { openSource } from '../services/source/open';
import { FRIENDS, SELF_ID } from '../content/gang';
import { audio } from '../services/audio/engine';
import type { Loyalty, Member } from '../core/types';

export function selfMember(l: Loyalty): Member {
  return { id: SELF_ID, name: 'You', isSelf: true, isSimulated: false, colour: 'var(--you)', persona: '', style: '', loyalty: l };
}
function reset() {
  patch({ feed: [], calls: [], card: undefined, callOffer: undefined, away: undefined, catchup: undefined, wrap: undefined, nudge: false,
    playhead: -1, position: -1, status: 'pre_match', callResult: undefined, wicketAt: undefined, sourceNote: undefined, sourceKind: undefined, chapterId: undefined });
}
const params = () => new URLSearchParams(location.search);

/** Where the engine should start once its source is mounted. */
let pending: { t: number; silentUpTo?: number } | undefined;

function newEngine(members: Member[], mode: 'live' | 'rewatch', roomId?: string) {
  const st = room();
  const e = new RoomEngine(st.match!, members, st.timeline!, st.chapters, mode, roomId);
  setEngine(e);
  return e;
}
function chapterStart(id?: string) {
  const st = room();
  const ch = st.chapters.find((c) => c.id === (id ?? st.journeyStart)) ?? st.chapters[0];
  return { t: st.timeline!.timeOf(ch.startBallSeq) - CHAPTER_LEAD_S, chapterId: ch.id };
}

export function startRoom(l: Loyalty) {
  const members = [selfMember(l), ...FRIENDS];
  reset();
  audio.unlock(); // inside the click → unlocks autoplay
  const e = newEngine(members, 'live');
  const { t, chapterId } = chapterStart();
  pending = { t };
  e.prefetch(t, true); // start writing the first lines while the player loads
  patch({ selfLoyalty: l, members, screen: 'live', mode: 'live', resumable: undefined, chapterId });
  void storage.clearLive();
}

export async function resumeRoom() {
  const live = await storage.getLive<LiveSnapshot>();
  if (!live) { patch({ resumable: undefined }); return; }
  const members = [selfMember(live.loyalty), ...FRIENDS];
  reset();
  audio.unlock();
  const e = newEngine(members, 'live', live.roomId);
  e.restore(live.feed.map((f) => ({ ...f, unheard: false })), live.calls, await loadSources(live.feed));
  e.roomStart = live.roomStart;
  pending = { t: Math.max(0, live.videoTime - 3), silentUpTo: live.maxRevealed };
  patch({ selfLoyalty: live.loyalty, members, screen: 'live', mode: 'live', resumable: undefined, playhead: live.maxRevealed, toast: { text: 'Picked up where you left off.', at: Date.now() } });
}

export async function rewatch(id: string) {
  const saved = await storage.getRoom<SavedRoom>(id);
  if (!saved) return;
  const members = [selfMember(saved.loyalty), ...FRIENDS];
  reset();
  audio.unlock();
  const e = newEngine(members, 'rewatch');
  e.loadForRewatch(saved.feed, await loadSources(saved.feed));
  const first = Math.min(...saved.feed.filter((f) => f.kind !== 'skip').map((f) => f.anchorSeq));
  const t = Number.isFinite(first) ? room().timeline!.timeOf(first) - CHAPTER_LEAD_S : chapterStart().t;
  pending = { t, silentUpTo: room().timeline!.ballAt(t) - 1 };
  patch({ members, screen: 'live', mode: 'rewatch' });
}

/** Called by the stage once its player mount exists: open YouTube (or the scoreboard fallback) and start. */
export async function bootSource(mount: HTMLElement | null) {
  const e = engine; const st = room();
  if (!e || !pending || !st.match) return;
  const start = pending; pending = undefined;
  const last = st.timeline!.timeOf(st.match.balls.length - 1) + 30;
  const speed = Number(params().get('speed'));
  const { source, reason } = await openSource({
    mount, video: st.match.video, start: start.t, end: last,
    rate: speed > 0 && speed <= 50 ? speed : 1,
    forceScoreboard: params().get('source') === 'scoreboard',
    onFallback: (next, why) => { if (engine !== e) { next.destroy(); return; } e.attach(next, next.kind === 'scoreboard' ? fallbackNote(why) : undefined); next.play(); },
  });
  if (engine !== e) { source.destroy(); return; }
  e.attach(source, source.kind === 'scoreboard' && reason !== 'forced' ? fallbackNote(reason) : undefined);
  e.start(start.t, { silentUpTo: start.silentUpTo });
}
const fallbackNote = (why?: string) => { if (why) console.info('[fun-banter] video fallback:', why); return "The match video won't play here, so you're on the scoreboard replay. Same balls, same gang."; };

export function leaveToShelf() { setEngine(undefined); patch({ screen: 'shelf', mode: 'live' }); }
