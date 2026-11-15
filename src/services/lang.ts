// Banter language (v1.3): Hinglish by default, English on the toggle. Stored locally per browser (ADR-0013).
export type Lang = 'hi' | 'en';
const KEY = 'acb-lang';

export function loadLang(): Lang {
  try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'hi'; } catch { return 'hi'; }
}
export function saveLang(l: Lang) {
  try { localStorage.setItem(KEY, l); } catch { /* private mode: the choice lasts for this visit */ }
}
export const LANG_LABEL: Record<Lang, string> = { hi: 'Hinglish', en: 'English' };

/** Extras chosen behind "More" after the wrap (per browser): Gang Calls for the next room. */
const CALLS_KEY = 'acb-gang-calls';
export function loadGangCalls(): boolean { try { return localStorage.getItem(CALLS_KEY) === '1'; } catch { return false; } }
export function saveGangCalls(on: boolean) { try { localStorage.setItem(CALLS_KEY, on ? '1' : '0'); } catch { /* this visit only */ } }
