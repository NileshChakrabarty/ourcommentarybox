// UI state (Zustand). Logic lives in services/engine.ts; this store is the single source the React tree renders.
import { create } from 'zustand';
import type { Chapter, FeedItem, GangCall, Loyalty, Match, Member, Moment, CallType } from '../core/types';
import type { RoomPlan } from '../core/plan';
import type { CardKind } from '../core/moments/rules';
import type { Timeline } from '../core/timeline';
import type { SourceState } from '../core/tracker';
import type { MicState } from '../services/audio/recorder';
import { DEFAULT_SELF_LOYALTY } from '../content/gang';

export type Screen = 'start' | 'live' | 'wrap' | 'shelf';
export type LineSource = 'live' | 'precomputed' | 'template';
export interface CardState { moment: Moment; kind: CardKind; lines: string[]; idx: number; source: LineSource; targetId?: string; usedIdx?: number }
export interface CallOffer { innings: 1 | 2; over: number; beforeSeq: number; bowler: string; friendCalls: { memberId: string; type: CallType }[] }
export interface AwayState { active: boolean; startSeq: number; skipping?: boolean; calledBack?: { friendId: string; text: string } }
export interface Catchup { text: string; source: 'live' | 'fallback' | 'loading'; fromSeq: number; toSeq: number; missed: string[] }
export interface WrapState {
  title: string; source: 'live' | 'fallback';
  roast?: { itemId: string; title: string };
  high?: { seq: number; caption: string }; low?: { seq: number; caption: string };
  reel: string[];
  stats: { mostRoasted?: { memberId: string; count: number }; clips: Record<string, number>; callsWon: Record<string, number>; userItems: number };
}
export interface MemorySummary { id: string; title: string; date: string; endedAt: number; result: string; cover: string; loyalty: Loyalty }

interface RoomState {
  screen: Screen;
  match?: Match; timeline?: Timeline; chapters: Chapter[]; journeyStart?: string; loadError?: string;
  selfLoyalty: Loyalty;
  members: Member[];
  plan?: RoomPlan;
  roomId?: string; status: 'pre_match' | 'live' | 'ended';
  mode: 'live' | 'rewatch';
  /** ball on screen right now (moves back on a rewind) */
  position: number;
  /** highest ball revealed in this room (spoiler mark) */
  playhead: number;
  videoTime: number;
  sourceKind?: 'youtube' | 'scoreboard';
  sourceState: SourceState;
  sourceNote?: string;
  chapterId?: string;
  /** journey guide: offer the next chapter (auto-jumps after a countdown) */
  upNext?: { chapterId: string; at: number };
  feed: FeedItem[];
  speakingId?: string;
  card?: CardState;
  callOffer?: CallOffer;
  calls: GangCall[];
  callResult?: { text: string; won: boolean; at: number };
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
  resumable?: { roomId: string; videoTime: number; label: string };
  set: (p: Partial<RoomState>) => void;
}

export const useRoom = create<RoomState>((set) => ({
  screen: 'start', selfLoyalty: DEFAULT_SELF_LOYALTY, members: [], chapters: [], status: 'pre_match', mode: 'live',
  position: -1, playhead: -1, videoTime: 0, sourceState: 'unstarted', feed: [], calls: [], nudge: false,
  mic: 'unknown', recording: false, storageOk: true, memories: [],
  set: (p) => set(p),
}));
export const room = () => useRoom.getState();
export const patch = (p: Partial<RoomState>) => useRoom.getState().set(p);
