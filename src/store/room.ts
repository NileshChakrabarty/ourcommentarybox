// UI state (Zustand). Logic lives in services/engine.ts; this store is the single source the React tree renders.
import { create } from 'zustand';
import type { FeedItem, GangCall, LiveConfig, Loyalty, Match, Member, Moment, CallType } from '../core/types';
import type { RoomPlan } from '../core/plan';
import type { CardKind } from '../core/moments/rules';
import type { Timeline } from '../core/timeline';
import type { SourceState } from '../core/tracker';
import type { MicState } from '../services/audio/recorder';
import { DEFAULT_SELF_LOYALTY } from '../content/gang';
import { loadLang, loadGangCalls, type Lang } from '../services/lang';

export type Screen = 'start' | 'live' | 'wrap' | 'shelf' | 'how';
export type LineSource = 'live' | 'precomputed' | 'template';
export interface CardState { moment: Moment; kind: CardKind; lines: string[]; idx: number; source: LineSource; targetId?: string; usedIdx?: number; shownAt: number }
export interface CallOffer { innings: 1 | 2; over: number; beforeSeq: number; bowler: string; friendCalls: { memberId: string; type: CallType }[] }
/** auto = the tab was hidden (no away screen; the catch-up shows when the viewer is back) */
export interface AwayState { active: boolean; startSeq: number; since: number; auto?: boolean; calledBack?: { friendId: string; text: string } }
export interface Catchup { text: string; source: 'live' | 'fallback' | 'loading'; fromSeq: number; toSeq: number; missed: string[] }
export interface WrapState {
  title: string; source: 'live' | 'fallback';
  /** what THIS viewer experienced: from the ball they joined on to the ball they left on */
  watched: { fromSeq: number; toSeq: number; minutes: number; complete: boolean };
  top: { seq: number; text: string }[];
  roast?: { itemId: string; title: string };
  high?: { seq: number; caption: string }; low?: { seq: number; caption: string };
  reel: string[];
  stats: { mostRoasted?: { memberId: string; count: number }; clips: Record<string, number>; callsWon: Record<string, number>; userItems: number };
}
export interface MemorySummary { id: string; title: string; date: string; endedAt: number; result: string; cover: string; loyalty: Loyalty }

interface RoomState {
  screen: Screen;
  match?: Match; timeline?: Timeline; live?: LiveConfig; loadError?: string;
  lang: Lang;
  selfLoyalty: Loyalty;
  members: Member[];
  plan?: RoomPlan;
  roomId?: string; status: 'pre_match' | 'live' | 'ended';
  /** ball on screen right now (moves back on a rewind in the extension, where the viewer owns the player) */
  position: number;
  /** highest ball revealed in this room (spoiler mark) */
  playhead: number;
  videoTime: number;
  sourceKind?: 'youtube' | 'scoreboard' | 'video';
  sourceState: SourceState;
  sourceNote?: string;
  volume: number;
  feed: FeedItem[];
  speakingId?: string;
  card?: CardState;
  callOffer?: CallOffer;
  calls: GangCall[];
  callResult?: { text: string; won: boolean; at: number };
  /** the one coach hint ("Hold 🎤 or Space to talk"), until the viewer talks or the first card arrives */
  coach: boolean;
  nudge: boolean;
  away?: AwayState;
  catchup?: Catchup;
  wrap?: WrapState;
  toast?: { text: string; at: number };
  /** last wicket reveal (drives the wicket slab / panel flash) */
  wicketAt?: { seq: number; at: number };
  mic: MicState;
  recording: boolean;
  storageOk: boolean;
  memories: MemorySummary[];
  /** a live room from before a reload that is still on air */
  resumable?: { roomId: string };
  /** extras behind "More" after the wrap: Gang Calls for the next room */
  gangCalls: boolean;
  set: (p: Partial<RoomState>) => void;
}

export const useRoom = create<RoomState>((set) => ({
  screen: 'start', lang: loadLang(), selfLoyalty: DEFAULT_SELF_LOYALTY, members: [], status: 'pre_match',
  position: -1, playhead: -1, videoTime: 0, sourceState: 'unstarted', volume: 100, feed: [], calls: [], coach: false, nudge: false,
  mic: 'unknown', recording: false, storageOk: true, memories: [], gangCalls: loadGangCalls(),
  set: (p) => set(p),
}));
export const room = () => useRoom.getState();
export const patch = (p: Partial<RoomState>) => useRoom.getState().set(p);
