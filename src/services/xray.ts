// "Behind the scenes" (X-ray) log (v1.3 amendment, ADR-0016): a read-only, human-readable engine log, stamped with
// the ball on screen (over.ball). The engine always writes it (cheap, capped); the panel shows it only when toggled on.
// Privacy: callers never pass keys, prompts, the user's words or any personal data — only what the system did.
import { create } from 'zustand';

export type XKind = 'ball' | 'moment' | 'line' | 'voice' | 'duck' | 'prefetch' | 'away' | 'live' | 'you' | 'wrap';
export interface XEntry { id: number; at: number; ball: string; kind: XKind; text: string }

export const XRAY_MAX = 400;
let nextId = 1;

export const useXray = create<{ on: boolean; entries: XEntry[] }>(() => ({ on: false, entries: [] }));

export function xlog(kind: XKind, ball: string, text: string) {
  const e: XEntry = { id: nextId++, at: Date.now(), ball, kind, text };
  useXray.setState((s) => ({ entries: s.entries.length >= XRAY_MAX ? [...s.entries.slice(-XRAY_MAX + 1), e] : [...s.entries, e] }));
}
export const xclear = () => useXray.setState({ entries: [] });
export const xtoggle = (on?: boolean) => useXray.setState((s) => ({ on: on ?? !s.on }));

export const ms = (n: number) => (n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(1)} s`);

/** Why each moment rule fires, in plain words (spec §4.2 F-A). */
export const RULE_WHY: Record<string, string> = {
  R1: "a gang member's hero is out",
  R2: "a gang member's villain is out",
  R3: "a gang member's hero bowler went for 15+ in the over",
  R4: "a gang member's hero bowler was hit for six",
  R5: "a gang member's hero reached a milestone",
  R6: 'the chase is down to the wire',
  R7: 'the last ball of the match',
};
