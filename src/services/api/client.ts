// Thin client for the AI proxy. Every call has a timeout and never throws to the UI: callers get null on failure.
// v1.3: every request carries the banter language; spoken lines come back as {display, speech}.
// API_BASE is empty for the web app (same origin) and the deployed origin for the Chrome extension (VITE_API_BASE).
import type { Line } from '../../core/types';
import type { Lang } from '../lang';

export const API_BASE: string = (import.meta.env?.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE}/api/${path}`, {
      method: 'POST', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

export interface PersonDTO { name: string; team?: string; hero?: string; isUser?: boolean }
export interface LinesBody {
  kind: 'tease' | 'comeback' | 'brag';
  moment: { ruleId: string; headline: string; fact: string; ballText?: string };
  player?: { name: string; story?: string };
  speaker: PersonDTO; target?: PersonDTO; matchState: string;
}
export interface ReactCardDTO { id: string; kind: 'tease' | 'comeback' | 'brag'; headline: string; fact: string; player?: { name: string; story?: string }; target?: PersonDTO; matchState?: string }
export interface ReactBeatDTO { id: string; friendId: string; intent: string; fact: string; target?: PersonDTO; ballText?: string }
export interface ReactRes { lines: Record<string, Line>; cards?: Record<string, Line[]>; model?: string }

export const api = {
  lines: (b: LinesBody, lang: Lang, t = 9_000) => post<{ lines: Line[]; model?: string }>('lines', { ...b, language: lang }, t),
  react: (beats: ReactBeatDTO[], matchState: string, lang: Lang, t = 13_000, cards: ReactCardDTO[] = [], userTeam?: string) =>
    post<ReactRes>('react', { beats, cards, matchState, userName: 'you', userTeam, language: lang }, t),
  reply: (friendId: string, userSaid: string, matchState: string, lang: Lang, context?: string, t = 7_000) =>
    post<{ line: Line; model?: string }>('reply', { friendId, userSaid, matchState, context, language: lang }, t),
  catchup: (b: { events: { seq: number; text: string }[]; said: { who: string; text: string }[]; self: string; maxWords: number }, lang: Lang, t = 3_000) =>
    post<{ summary: string }>('catchup', { ...b, language: lang }, t),
  wrap: (b: object, lang: Lang, t = 6_000) => post<WrapAI>('wrap', { ...b, language: lang }, t),
  /** Voice a line's `speech` form. Resolves to the mp3 blob and the model that voiced it, or null. */
  async speak(text: string, speaker: string, lang: Lang, timeoutMs = 7_000): Promise<{ blob: Blob; model: string } | null> {
    try {
      const r = await fetch(`${API_BASE}/api/speak`, {
        method: 'POST', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, speaker, language: lang }),
      });
      if (!r.ok) return null;
      const b = await r.blob();
      return b.size > 0 ? { blob: b, model: r.headers.get('x-voice-model') ?? 'Sarvam Bulbul' } : null;
    } catch { return null; }
  },
  async transcribe(blob: Blob, lang: Lang, timeoutMs = 9_000): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'clip');
      fd.append('language', lang);
      const r = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: fd, signal: AbortSignal.timeout(timeoutMs) });
      if (!r.ok) return null;
      const t = ((await r.json()) as { text?: string }).text?.trim();
      return t || null;
    } catch { return null; }
  },
};

export interface WrapAI {
  title: string;
  roastOfTheNight?: { itemId: string; title: string };
  high?: { seq: number; caption: string }; low?: { seq: number; caption: string };
  reel: string[];
}
