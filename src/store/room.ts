// UI state (Zustand). Logic lives in services/engine.ts; this store is the single source the React tree renders.
import { create } from 'zustand';
import type { FeedItem, GangCall, Loyalty, Match, Member, Moment, CallType } from '../core/types';
import type { RoomPlan } from '../core/plan';
import type { CardKind } from '../core/moments/rules';
import type { MicState } from '../services/audio/recorder';
import { DEFAULT_SELF_LOYALTY } from '../content/gang';

export type Screen = 'landing' | 'setup' | 'live' | 'wrap' | 'shelf';
export type LineSource = 'live' | 'precomputed' | 'template';
export interface CardState { moment: Moment; kind: CardKind; lines: string[]; source: LineSource; targetId?: string; usedIdx?: number }
export interface CallOffer { innings: 1 | 2; over: number; beforeSeq: number; bowler: string; friendCalls: { memberId: string; type: CallType }[] }
export interface AwayState { active: boolean; startSeq: number; calledBack?: { friendId: string; text: string } }
export interface Catchup { text: string; source: 'live' | 'fallback' | 'loading'; fromSeq: number; toSeq: number; missed: number }
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
  match?: Match; loadError?: string;
  selfLoyalty: Loyalty;
  members: Member[];
  plan?: RoomPlan;
  roomId?: string; status: 'pre_match' | 'live' | 'ended';
  mode: 'live' | 'rewatch';
  slot: number; playhead: number; revealAt: number;
  paused: boolean;
  feed: FeedItem[];
  speakingId?: string;
  card?: CardState;
  callOffer?: CallOffer;
  calls: GangCall[];
  callResult?: { text: string; at: number };
  nudge: boolean;
  away?: AwayState;
  catchup?: Catchup;
  wrap?: WrapState;
  toast?: { text: string; at: number };
  mic: MicState;
  recording: boolean;
  storageOk: boolean;
  memories: MemorySummary[];
  resumable?: { roomId: string; slot: number; label: string };
  set: (p: Partial<RoomState>) => void;
}

export const useRoom = create<RoomState>((set) => ({
  screen: 'landing', selfLoyalty: DEFAULT_SELF_LOYALTY, members: [], status: 'pre_match', mode: 'live',
  slot: 0, playhead: -1, revealAt: 0, paused: false, feed: [], calls: [], nudge: false,
  mic: 'unknown', recording: false, storageOk: true, memories: [],
  set: (p) => set(p),
}));
export const room = () => useRoom.getState();
export const patch = (p: Partial<RoomState>) => useRoom.getState().set(p);
