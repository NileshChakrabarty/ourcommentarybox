// Host-agnostic commands the panel uses (ADR-0017). They touch only the store and the engine; the engine touches only
// the MatchSource interface. The web host and the extension host each create the engine and its source themselves.
import { patch } from '../store/room';
import { engine, setEngine } from '../services/engine';
import { SELF_ID } from '../content/gang';
import { saveLang, type Lang } from '../services/lang';
import type { Loyalty, Member } from '../core/types';

export function selfMember(l: Loyalty): Member {
  return { id: SELF_ID, name: 'You', isSelf: true, isSimulated: false, colour: 'var(--you)', persona: '', style: '', loyalty: l };
}
/** Clear the room state before a new room starts. */
export function resetRoom() {
  patch({ feed: [], calls: [], card: undefined, callOffer: undefined, away: undefined, catchup: undefined, wrap: undefined, nudge: false, coach: false,
    playhead: -1, position: -1, status: 'pre_match', callResult: undefined, wicketAt: undefined, sourceNote: undefined, sourceKind: undefined });
}
export function setLang(l: Lang) { saveLang(l); patch({ lang: l }); engine?.setLang(l); }
export function setVolume(v: number) { patch({ volume: v }); engine?.source?.setVolume(v); }
/** "Leave the box": the wrap of what you watched, at any time. */
export function leaveBox() { engine?.finish(); }
export function toShelf() { setEngine(undefined); patch({ screen: 'shelf' }); }
