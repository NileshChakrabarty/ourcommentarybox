// v1.3 engine on a simulated live broadcast (fake timers, AI offline so the safety nets speak):
// journey timing beats fire, X-ray logs every ball, a hidden tab gets a catch-up on return, "Leave the box" opens the
// wrap of what this viewer saw, the room runs past 3 minutes to the last ball, and the English toggle switches language.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { match, gang, seqOf, live, tl } from './helpers';
import { RoomEngine, setPrecomputed } from '../../src/services/engine';
import { LiveBroadcast } from '../../src/services/source/live';
import { ScoreboardSource } from '../../src/services/source/scoreboard';
import { joinTime } from '../../src/core/friends/director';
import { useXray, xclear } from '../../src/services/xray';
import { room, patch } from '../../src/store/room';
import { BEAT_TEMPLATES } from '../../src/content/templates';

const t0 = joinTime(tl, live);
const rohitOut = seqOf(2, '2.4');
let bodies: { url: string; body: Record<string, unknown> }[] = [];

function boot(rate = 1, lang: 'hi' | 'en' = 'hi') {
  patch({ feed: [], calls: [], card: undefined, away: undefined, catchup: undefined, wrap: undefined, nudge: false, coach: true,
    playhead: -1, position: -1, status: 'pre_match', screen: 'live', match, timeline: tl, live, lang });
  xclear();
  const e = new RoomEngine(match, gang(), tl, live, { lang });
  const clock = { now: () => Date.now() };
  const lb = new LiveBroadcast(new ScoreboardSource(t0, rate, Infinity, clock), { joinT: t0, endT: tl.timeOf(live.endBallSeq) + 20, rate });
  e.attach(lb);
  e.start(t0);
  return { e, lb };
}
/** Advance the wall clock (and the engine's 250 ms poll) by `s` seconds. */
const run = (s: number) => vi.advanceTimersByTimeAsync(s * 1000);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Date'] });
  setPrecomputed({ beats: {}, cards: {} });
  bodies = [];
  // AI offline: every call fails, so lines come from the Hinglish/English templates; record what was asked for
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    try { bodies.push({ url, body: JSON.parse(String(init?.body ?? '{}')) }); } catch { bodies.push({ url, body: {} }); }
    return new Response('{}', { status: 503 });
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('journey timing beats fire (first minutes)', () => {
  it('join line → first wicket with two teases at ~38 s → comeback card ~1 min → nudge at 2 min', async () => {
    const { e } = boot();
    await run(6);
    expect(room().feed.some((f) => f.intent === 'setup')).toBe(true);
    await run(36); // past Rohit's wicket (38 s)
    const onWicket = room().feed.filter((f) => f.anchorSeq === rohitOut && f.intent === 'tease');
    expect(onWicket).toHaveLength(2);
    expect(onWicket.every((f) => f.targetId === 'me')).toBe(true);
    expect(room().card).toBeUndefined(); // the card waits for the gang to have its say
    await run(20); // ~62 s
    expect(room().card?.kind).toBe('comeback');
    expect(room().coach).toBe(false); // the one coach hint is gone once there's a card
    await run(60); // ~122 s
    expect(room().nudge).toBe(true);
    expect(room().feed.some((f) => f.intent === 'nudge_away' && f.memberId === 'sunny')).toBe(true);
    e.stop();
  });
  it('Hinglish by default: fallback lines are the Hinglish templates and every AI request asks for "hi"', async () => {
    const { e } = boot();
    await run(45);
    const setup = room().feed.find((f) => f.intent === 'setup')!;
    expect(BEAT_TEMPLATES.hi.setup).toContain(setup.text);
    const ai = bodies.filter((b) => /\/api\/(react|lines|reply|catchup|wrap)$/.test(b.url));
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.every((b) => b.body.language === 'hi')).toBe(true);
    e.stop();
  });
  it('the English toggle switches the banter: new lines and requests are English, earlier lines stay', async () => {
    const { e } = boot();
    await run(6);
    const before = room().feed.find((f) => f.intent === 'setup')!.text;
    bodies = [];
    e.setLang('en');
    await run(40);
    expect(room().feed.find((f) => f.intent === 'setup')!.text).toBe(before);
    const teases = room().feed.filter((f) => f.anchorSeq === rohitOut && f.intent === 'tease').map((f) => f.text);
    for (const t of teases) expect(BEAT_TEMPLATES.en.tease.map((x) => x.replace('{target}', 'bro'))).toContain(t);
    const ai = bodies.filter((b) => b.url.endsWith('/api/react'));
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.every((b) => b.body.language === 'en')).toBe(true);
    e.stop();
  });
});

describe('behind the scenes (X-ray)', () => {
  it('logs every ball as it is detected (video time → ball), the rule that fired and why, line source and ducking', async () => {
    const { e } = boot();
    await run(45);
    const x = useXray.getState().entries;
    const balls = x.filter((r) => r.kind === 'ball');
    expect(balls.map((r) => r.ball)).toEqual(['2.3', '2.4']); // one entry per ball revealed
    expect(balls[1].text).toMatch(/^Video 139\d\d\.\d s → ball 2\.4 \(read off the scorebug at 13949\.0 s\)/);
    expect(x.some((r) => r.kind === 'moment' && r.ball === '2.4' && /R1 fired: Rohit out .*Why: a gang member's hero is out/.test(r.text))).toBe(true);
    expect(x.some((r) => r.kind === 'line' && /fallback: template/.test(r.text))).toBe(true);
    expect(x.some((r) => r.kind === 'prefetch' && /Prefetch → Gemini/.test(r.text))).toBe(true);
    // never keys, never the viewer's words
    for (const r of x) expect(r.text).not.toMatch(/key|AIza|sk-/i);
    e.stop();
  });
});

describe('stepping away while the broadcast stays live', () => {
  it('a hidden tab keeps the clock running; lines are saved as missed; coming back shows the catch-up', async () => {
    const { e, lb } = boot();
    await run(30);
    e.setHidden(true);
    expect(room().away?.auto).toBe(true);
    await run(60); // the wicket happens while you're gone
    expect(lb.liveTime()).toBeCloseTo(t0 + 90, 0);
    const missed = room().feed.filter((f) => f.unheard);
    expect(missed.length).toBeGreaterThanOrEqual(2);
    e.setHidden(false);
    await run(4);
    const c = room().catchup!;
    expect(c.fromSeq).toBeLessThan(rohitOut);
    expect(c.toSeq).toBeGreaterThanOrEqual(rohitOut);
    expect(c.text).toMatch(/Rohit/); // the fallback catch-up names every wicket
    expect(c.missed).toEqual(expect.arrayContaining(missed.map((f) => f.id)));
    e.stop();
  });
  it('"Step away" does not seek: the broadcast keeps its live position and a friend remarks on it', async () => {
    const { e, lb } = boot();
    await run(100);
    e.stepAway();
    await run(20);
    expect(lb.getCurrentTime()).toBeCloseTo(t0 + 120, 0);
    expect(room().feed.some((f) => f.intent === 'away' && f.unheard)).toBe(true);
    await e.comeBack();
    await run(4);
    expect(room().catchup?.missed.length).toBeGreaterThan(0);
    e.stop();
  });
});

describe('the end of the room', () => {
  it('"Leave the box" opens the wrap of what THIS viewer saw', async () => {
    const { e } = boot();
    await run(70);
    e.finish();
    await run(15);
    expect(room().screen).toBe('wrap');
    const w = room().wrap!;
    expect(w.watched.complete).toBe(false);
    expect(w.watched.fromSeq).toBe(live.joinBallSeq);
    expect(w.watched.toSeq).toBe(rohitOut);
    expect(w.top.map((t) => t.seq)).toEqual([rohitOut]);
    expect(room().status).toBe('ended');
  });
  it('runs past 3 minutes to the last ball, then the wrap opens by itself', async () => {
    const { e } = boot(50); // 50× speed: ~2.5 hours of match in ~3 minutes
    await run(60);
    expect(room().status).toBe('live');
    await run(130);
    expect(room().playhead).toBe(live.endBallSeq);
    await run(30);
    expect(room().screen).toBe('wrap');
    expect(room().wrap!.watched.complete).toBe(true);
    expect(room().feed.some((f) => f.intent === 'final')).toBe(true);
    e.stop();
  });
});
