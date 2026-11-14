// UI-level actions that create/replace the room engine.
import { room, patch } from '../store/room';
import { RoomEngine, setEngine, loadSources, type SavedRoom } from '../services/engine';
import { storage } from '../services/storage/db';
import { FRIENDS, SELF_ID } from '../content/gang';
import { audio } from '../services/audio/engine';
import type { Loyalty, Member } from '../core/types';

export function selfMember(l: Loyalty): Member {
  return { id: SELF_ID, name: 'You', isSelf: true, isSimulated: false, colour: 'var(--me)', persona: '', style: '', loyalty: l };
}
function reset() {
  patch({ feed: [], calls: [], card: undefined, callOffer: undefined, away: undefined, catchup: undefined, wrap: undefined, nudge: false, playhead: -1, slot: 0, status: 'pre_match', callResult: undefined, paused: false });
}

export function startRoom(l: Loyalty) {
  const match = room().match!;
  const members = [selfMember(l), ...FRIENDS];
  reset();
  audio.unlock(); // inside the click → unlocks autoplay
  const e = new RoomEngine(match, members, 'live');
  setEngine(e);
  patch({ selfLoyalty: l, members, screen: 'live', mode: 'live', resumable: undefined });
  void storage.clearLive();
  e.start();
}

export async function resumeRoom() {
  const live = await storage.getLive<{ roomId: string; slot: number; loyalty: Loyalty; feed: SavedRoom['feed']; calls: SavedRoom['calls'] }>();
  if (!live) { patch({ resumable: undefined }); return; }
  const match = room().match!;
  const members = [selfMember(live.loyalty), ...FRIENDS];
  reset();
  audio.unlock();
  const e = new RoomEngine(match, members, 'live', live.slot, live.roomId);
  setEngine(e);
  e.restore(live.feed.map((f) => ({ ...f, unheard: false })), live.calls, await loadSources(live.feed));
  patch({ selfLoyalty: live.loyalty, members, screen: 'live', mode: 'live', resumable: undefined, toast: { text: 'Picked up where you left off.', at: Date.now() } });
  e.start();
}

export async function rewatch(id: string) {
  const saved = await storage.getRoom<SavedRoom>(id);
  if (!saved) return;
  const match = room().match!;
  const members = [selfMember(saved.loyalty), ...FRIENDS];
  reset();
  audio.unlock();
  const e = new RoomEngine(match, members, 'rewatch');
  setEngine(e);
  e.loadForRewatch(saved.feed, await loadSources(saved.feed));
  patch({ members, screen: 'live', mode: 'rewatch' });
  e.start();
}

export function leaveToShelf() { setEngine(undefined); patch({ screen: 'shelf', mode: 'live' }); }
