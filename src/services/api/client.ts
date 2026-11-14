// Thin client for the AI proxy. Every call has a timeout and never throws to the UI: callers get null on failure.
async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T | null> {
  try {
    const r = await fetch(`/api/${path}`, {
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

export const api = {
  lines: (b: LinesBody, t = 9_000) => post<{ lines: string[]; source: 'live' }>('lines', b, t),
  react: (beats: ReactBeatDTO[], matchState: string, t = 13_000, cards: ReactCardDTO[] = [], userTeam?: string) =>
    post<{ lines: Record<string, string>; cards?: Record<string, string[]> }>('react', { beats, cards, matchState, userName: 'you', userTeam }, t),
  reply: (friendId: string, userSaid: string, matchState: string, context?: string, t = 7_000) =>
    post<{ line: string }>('reply', { friendId, userSaid, matchState, context }, t),
  catchup: (b: { events: { seq: number; text: string }[]; said: { who: string; text: string }[]; self: string; maxWords: number }, t = 3_000) =>
    post<{ summary: string }>('catchup', b, t),
  wrap: (b: unknown, t = 6_000) => post<WrapAI>('wrap', b, t),
  async speak(text: string, speaker: string, timeoutMs = 7_000): Promise<Blob | null> {
    try {
      const r = await fetch('/api/speak', {
        method: 'POST', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, speaker }),
      });
      if (!r.ok) return null;
      const b = await r.blob();
      return b.size > 0 ? b : null;
    } catch { return null; }
  },
  async transcribe(blob: Blob, timeoutMs = 9_000): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'clip');
      const r = await fetch('/api/transcribe', { method: 'POST', body: fd, signal: AbortSignal.timeout(timeoutMs) });
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
