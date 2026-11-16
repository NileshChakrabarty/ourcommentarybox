// Room engine: wires the pure core (timeline, tracker, rules, director, sync) to side effects
// (match source, AI, audio, storage) and the store. Time comes ONLY from the MatchSource, so the same engine runs
// in the web host (YouTube embed as a live broadcast) and the extension host (the viewer's own <video>).
// v1.3: live from the join point to the last ball, Hinglish by default, behind-the-scenes log (ADR-0014..0016).
import type { FeedItem, GangCall, Line, LiveConfig, Match, Member, Moment, CallType, ID } from '../core/types';
import { buildPlan, type RoomPlan } from '../core/plan';
import { Timeline } from '../core/timeline';
import { BallTracker, type TrackEvent } from '../core/tracker';
import { DeliveryQueue, anchorFor } from '../core/sync/delivery';
import { cardKind, cardTargetFor } from '../core/moments/rules';
import { stateLine, joinTime, type Beat, type Intent } from '../core/friends/director';
import { callStatusAt, friendCall, CALL_LABEL } from '../core/calls';
import { computeStats, awayEvents, fallbackCatchup, ensureWickets } from '../core/wrapStats/stats';
import { FRIENDS, SELF_ID, speakerFor } from '../content/gang';
import { cardTemplate, beatTemplate } from '../content/templates';
import { api, type PersonDTO } from './api/client';
import { audio } from './audio/engine';
import { storage } from './storage/db';
import type { MatchSource } from './source/types';
import { ScoreboardSource } from './source/scoreboard';
import { unwrap } from './source/live';
import { Ducker, DUCK_TO } from './source/ducker';
import { xlog, ms, RULE_WHY } from './xray';
import type { Lang } from './lang';
import { patch, room, type CardState, type LineSource, type WrapState, type MemorySummary } from '../store/room';

const uid = () => Math.random().toString(36).slice(2, 10);
const sleep = (n: number) => new Promise((r) => setTimeout(r, n));
const withTimeout = <T,>(p: Promise<T> | undefined, n: number): Promise<T | undefined> =>
  p ? Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), n))]) : Promise.resolve(undefined);

/** Safety-net lines, keyed `${lang}:${beatId}` and `${lang}:${momentId}|${kind}` (built by `npm run precompute`). */
export interface Precomputed { beats: Record<string, { text: string; audio?: string }>; cards: Record<string, string[]> }
let precomputed: Precomputed = { beats: {}, cards: {} };
export async function loadPrecomputed(base = '') {
  try { const r = await fetch(`${base}/data/precomputed.json`); if (r.ok) precomputed = await r.json(); } catch { /* safety net optional */ }
  precomputedBase = base;
}
let precomputedBase = '';
export const setPrecomputed = (p: Precomputed) => { precomputed = p; };

export interface SavedRoom {
  id: string; matchId: string; title: string; date: string; endedAt: number; result: string;
  loyalty: Member['loyalty']; feed: FeedItem[]; calls: GangCall[]; wrap?: WrapState;
}
/** Enough to rejoin the same live room after a reload: the broadcast kept running on the wall clock meanwhile. */
export interface LiveSnapshot { roomId: string; joinedAt: number; rate: number; maxRevealed: number; roomStart?: number; loyalty: Member['loyalty']; feed: FeedItem[]; calls: GangCall[]; label: string }

/** How far ahead (video seconds) we ask Gemini for lines, and what counts as urgent. */
export const LOOKAHEAD_S = 240;
const URGENT_S = 75;
/** When a ball is revealed and its live line is still in flight, wait at most this long (the video never waits). */
const LATE_LINE_MS = 1_200;
const POLL_MS = 250;
/** A line card that nobody used disappears after this long. */
const CARD_TTL_MS = 45_000;
/** After you step away, a friend remarks on it (you hear it in the catch-up). */
const AWAY_REMARK_MS = 8_000;

interface Resolved { text: string; speech?: string; audio?: Blob | string; source: FeedItem['source']; voice?: string; lang: Lang }

export interface EngineOpts { roomId?: string; lang: Lang; gangCalls?: boolean; selfId?: ID }

export class RoomEngine {
  plan: RoomPlan;
  readonly tracker: BallTracker;
  source?: MatchSource;
  lang: Lang;
  readonly roomId: string;
  private unsub: (() => void)[] = [];
  private loop?: ReturnType<typeof setInterval>;
  private delivery = new DeliveryQueue<FeedItem>();
  // request/result maps are keyed `${lang}:${id}`, so a request still in flight after a language switch can never
  // write its (old-language) answer over the new one
  private beatReq = new Map<string, Promise<Resolved | null>>();
  private beatDone = new Map<string, { r: Resolved | null; at: number }>();
  private cardReq = new Map<string, Promise<string[] | null>>();
  private cardDone = new Map<string, string[] | null>();
  readonly audioSrc = new Map<string, Blob | string>();
  private lastReplyAt = 0;
  private lastSpeaker?: ID;
  private P: Map<string, Match['players'][number]>;
  private beatsBySeq = new Map<number, Beat[]>();
  private timed: Beat[] = [];
  private timedIdx = 0;
  private cardsBySeq = new Map<number, Moment>();
  private ducker = new Ducker(() => this.source);
  private ended = false;
  /** friend lines still being resolved (the room must not end before they are in the feed) */
  private inflight = new Set<Promise<void>>();
  private lastPrefetchAt = 0;
  private lastPersistAt = 0;
  private lastTimePatch = -1;
  private awaitCallback = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  /** first ball of this room: the wrap and its stats only count what happened from here on */
  roomStart?: number;
  /** wall-clock ms when this viewer joined (live hosts), for resume and the wrap */
  joinedAt?: number;
  /** extension host: the viewer owns the player, so nudges/step-away are theirs to act on */
  readonly t0: number;

  constructor(public match: Match, public members: Member[], public timeline: Timeline, public live: LiveConfig, opts: EngineOpts) {
    this.lang = opts.lang;
    this.roomId = opts.roomId ?? uid();
    this.plan = buildPlan(match, members, SELF_ID, timeline, live, { gangCalls: opts.gangCalls });
    this.P = new Map(match.players.map((p) => [p.id, p]));
    for (const b of this.plan.beats) {
      if (b.atTime !== undefined) this.timed.push(b);
      else this.beatsBySeq.set(b.seq, [...(this.beatsBySeq.get(b.seq) ?? []), b]);
    }
    this.timed.sort((a, b) => a.atTime! - b.atTime!);
    for (const c of this.plan.cards) this.cardsBySeq.set(c.ballSeq, c);
    this.tracker = new BallTracker(timeline);
    this.t0 = joinTime(timeline, live);
  }

  private later(f: () => void, n: number) { const h = setTimeout(() => { this.timers.delete(h); f(); }, n); this.timers.add(h); }
  private label(seq = room().position) { return seq >= 0 ? this.match.balls[seq]?.label ?? '–' : '–'; }

  // ───────────────────────── source lifecycle
  /** Attach (or swap to) a match source. Keeps the tracker, so a fallback mid-match never re-delivers anything. */
  attach(src: MatchSource, note?: string) {
    this.unsub.forEach((f) => f()); this.unsub = [];
    this.source?.destroy();
    this.source = src;
    const lbl = () => this.label();
    audio.setDucker({
      duck: () => { this.ducker.duck(); xlog('duck', lbl(), `Match audio ducked to ${DUCK_TO}% while a friend talks`); },
      restore: () => { this.ducker.restore(); xlog('duck', lbl(), 'Match audio back to your volume'); },
    });
    const inner = unwrap(src);
    if (inner instanceof ScoreboardSource) {
      audio.startCrowd(); audio.setCrowdVolume(inner.getVolume());
      this.unsub.push(inner.onVolume((v) => audio.setCrowdVolume(v)));
    } else audio.stopCrowd();
    this.unsub.push(src.onStateChange((s) => { patch({ sourceState: s }); if (s === 'ended') void this.onEnded(); }));
    patch({ sourceKind: src.kind, sourceState: src.getState(), sourceNote: note });
    xlog('live', lbl(), `Match source: ${src.kind === 'youtube' ? 'YouTube embed (official ECB upload)' : src.kind === 'video' ? 'your YouTube tab (<video> element)' : 'scoreboard replay (fallback)'}${note ? ` — ${note}` : ''}`);
  }

  /** Begin at video time `t`. Balls up to `silentUpTo` (default: the ball on screen) count as already seen. */
  start(t: number, opts: { silentUpTo?: number } = {}) {
    audio.unlock();
    const seenUpTo = opts.silentUpTo ?? this.timeline.ballAt(t);
    this.roomStart ??= Math.max(0, seenUpTo + 1);
    this.joinedAt ??= Date.now();
    this.tracker.resetTo(seenUpTo);
    while (this.timed[this.timedIdx] && this.timed[this.timedIdx].atTime! < t - 0.5) this.timedIdx++;
    patch({ plan: this.plan, status: 'live', roomId: this.roomId, position: seenUpTo, playhead: Math.max(room().playhead, seenUpTo), videoTime: t });
    this.source?.seekTo(t);
    this.source?.play();
    clearInterval(this.loop);
    this.loop = setInterval(() => this.tick(), POLL_MS);
    this.prefetch(t, true);
  }
  stop() {
    clearInterval(this.loop); this.timers.forEach(clearTimeout); this.timers.clear();
    this.unsub.forEach((f) => f()); this.unsub = []; this.source?.destroy(); this.source = undefined;
    audio.clear(); audio.setDucker(undefined); audio.stopCrowd();
  }

  /** One poll: read the source, turn time into ball events and timed lines. */
  tick() {
    const s = this.source; if (!s || this.ended) return;
    const t = s.getCurrentTime();
    const st = s.getState();
    if (Math.abs(t - this.lastTimePatch) >= 0.5) { this.lastTimePatch = t; patch({ videoTime: t }); }
    for (const ev of this.tracker.update(t, st)) this.handle(ev, t);
    if (st === 'playing') while (this.timed[this.timedIdx] && this.timed[this.timedIdx].atTime! <= t) this.fireTimed(this.timed[this.timedIdx++]);
    const now = Date.now();
    if (now - this.lastPrefetchAt > 2_000) this.prefetch(t);
    if (now - this.lastPersistAt > 8_000) { this.lastPersistAt = now; void this.persistLive(); }
  }

  private handle(ev: TrackEvent, t: number) {
    if (ev.type === 'reveal') this.onRevealed(ev.seq, t);
    else if (ev.type === 'skip') this.onSkip(ev.from, ev.to, t);
    else patch({ position: ev.type === 'rewind' ? ev.to : ev.seq });
  }

  // ───────────────────────── helpers
  member = (id: ID) => this.members.find((m) => m.id === id)!;
  pname = (id?: ID) => (id ? this.P.get(id)?.short ?? id : '');
  team = (id: ID) => this.match.teams.find((t) => t.id === id)!;
  matchState(seq: number): string { return stateLine(this.match, this.plan.snaps[Math.max(0, seq)]); }
  scoreText = (seq: number) => { const s = this.plan.snaps[Math.max(0, seq)]; return `${this.team(s.innings === 1 ? this.match.battingFirst : this.match.chasing).short} ${s.runs}/${s.wickets} (${s.overs})`; };
  person(id?: ID): PersonDTO | undefined {
    if (!id) return undefined;
    const m = this.member(id);
    return { name: m.isSelf ? 'you' : m.name, team: m.loyalty.teamId, hero: this.P.get(m.loyalty.heroId ?? '')?.name, isUser: m.isSelf || undefined };
  }
  private push(item: FeedItem) { patch({ feed: [...room().feed, item] }); }
  private update(id: string, p: Partial<FeedItem>) { patch({ feed: room().feed.map((f) => (f.id === id ? { ...f, ...p } : f)) }); }
  private toast(text: string) { patch({ toast: { text, at: Date.now() } }); }
  private when(b: Beat) { return b.atTime ?? this.timeline.timeOf(b.seq); }
  private voice(friendId: ID) { return speakerFor(this.member(friendId), this.lang); }
  private k(id: string, lang: Lang = this.lang) { return `${lang}:${id}`; }

  // ───────────────────────── language
  /** Switch the banter language. Lines already said stay; everything not yet said is re-requested. */
  setLang(l: Lang) {
    if (l === this.lang) return;
    this.lang = l;
    const c = room().card; if (c && c.usedIdx === undefined) patch({ card: undefined }); // its lines are in the old language
    xlog('prefetch', this.label(), `Language switched to ${l === 'hi' ? 'Hinglish (hi-IN voices)' : 'English (en-IN voices)'}; upcoming lines re-requested`);
    if (this.source) this.prefetch(this.source.getCurrentTime(), true);
  }

  // ───────────────────────── look-ahead prefetch (live AI well before the ball arrives)
  // One Gemini call covers every friend line and user card in the next window (free tier = 5 RPM per model).
  private lastBatchAt = 0;
  prefetch(t: number, force = false) {
    this.lastPrefetchAt = Date.now();
    const beats: Beat[] = []; const cards: Moment[] = []; let urgent = force;
    for (const b of [...this.timed.slice(this.timedIdx), ...[...this.beatsBySeq.values()].flat()]) {
      const dt = this.when(b) - t;
      if (dt < -5 || dt > LOOKAHEAD_S || this.beatReq.has(this.k(b.id))) continue;
      beats.push(b); urgent ||= dt < URGENT_S;
    }
    const from = Math.max(0, this.timeline.ballAt(t));
    for (let s = from; s < this.match.balls.length; s++) {
      const dt = this.timeline.timeOf(s) - t;
      if (dt > LOOKAHEAD_S) break;
      const c = this.cardsBySeq.get(s); if (c && !this.cardReq.has(this.k(c.id))) { cards.push(c); urgent ||= dt < URGENT_S; }
    }
    if (!beats.length && !cards.length) return;
    if (!urgent && beats.length + cards.length < 6 && Date.now() - this.lastBatchAt < 15_000) return;
    beats.sort((a, b) => this.when(a) - this.when(b));
    // Urgent windows go out small, with the user's card in its own parallel request: Hinglish lines carry a
    // Devanagari copy, and a big first batch timed out (12 s) in the v1.3 walkthrough. Later windows can be larger.
    if (urgent) {
      if (beats.length) this.requestWindow(beats.slice(0, 3), []);
      if (cards.length) this.requestWindow([], cards.slice(0, 1));
    } else this.requestWindow(beats.slice(0, 8), cards.slice(0, 2));
  }

  private requestWindow(beats: Beat[], cards: Moment[]) {
    this.lastBatchAt = Date.now();
    const lang = this.lang;
    const firstSeq = Math.min(...beats.map((b) => b.seq), ...cards.map((c) => c.ballSeq));
    const lastSeq = Math.max(...beats.map((b) => b.seq), ...cards.map((c) => c.ballSeq));
    const dto = beats.map((b) => ({ id: b.id, friendId: b.friendId, intent: b.intent, fact: b.fact, target: this.person(b.targetId), ballText: this.match.balls[b.seq].text }));
    const cdto = cards.map((m) => this.cardDTO(m));
    const t0 = Date.now();
    xlog('prefetch', this.label(), `Prefetch → Gemini: ${beats.length} friend line${beats.length === 1 ? '' : 's'}${cards.length ? ` + ${cards.length} card${cards.length === 1 ? '' : 's'}` : ''} for balls ${this.label(firstSeq)}–${this.label(lastSeq)} (${lang === 'hi' ? 'Hinglish' : 'English'})`);
    const batch = api.react(dto, this.matchState(firstSeq - 1), lang, 14_000, cdto, this.member(SELF_ID).loyalty.teamId);
    void batch.then((r) => xlog('prefetch', this.label(), r ? `Gemini answered in ${ms(Date.now() - t0)}${r.model ? ` (${r.model})` : ''}: ${Object.keys(r.lines).length} lines, ${Object.keys(r.cards ?? {}).length} cards` : `Gemini failed or timed out after ${ms(Date.now() - t0)}; prepared lines will cover these balls`));
    for (const b of beats) {
      const p = batch.then(async (r): Promise<Resolved | null> => {
        const line = r?.lines?.[b.id];
        if (!line) return null;
        const v0 = Date.now();
        const sp = await api.speak(line.speech, speakerFor(this.member(b.friendId), lang), lang);
        const voice = sp ? `Sarvam ${sp.model}, voice ${speakerFor(this.member(b.friendId), lang)} (${lang === 'hi' ? 'hi-IN' : 'en-IN'}), made in ${ms(Date.now() - v0)}` : undefined;
        return { text: line.display, speech: line.speech, audio: sp?.blob, source: 'live', voice, lang };
      });
      this.beatReq.set(this.k(b.id, lang), p);
      void p.then((r) => this.beatDone.set(this.k(b.id, lang), { r, at: Date.now() }));
    }
    for (const m of cards) {
      this.cardReq.set(this.k(m.id, lang), batch.then((r) => { const l = r?.cards?.[m.id]?.length ? r.cards[m.id].map((x: Line) => x.display) : null; this.cardDone.set(this.k(m.id, lang), l); return l; }));
    }
  }
  private cardDTO(m: Moment) {
    const kind = cardKind(m, SELF_ID);
    const pl = m.playerId ? this.P.get(m.playerId) : undefined;
    return { id: m.id, kind, headline: m.headline, fact: m.fact, player: pl ? { name: pl.name, story: pl.story } : undefined, target: this.person(this.cardTarget(m, kind)), matchState: this.matchState(m.ballSeq) };
  }
  private requestCard(m: Moment) {
    const key = this.k(m.id);
    const kind = cardKind(m, SELF_ID);
    const target = this.cardTarget(m, kind);
    const p = api.lines({
      kind, moment: { ruleId: m.ruleId, headline: m.headline, fact: m.fact, ballText: this.match.balls[m.ballSeq].text },
      player: m.playerId ? { name: this.P.get(m.playerId)!.name, story: this.P.get(m.playerId)!.story } : undefined,
      speaker: { name: 'You', team: this.member(SELF_ID).loyalty.teamId }, target: this.person(target),
      matchState: this.matchState(m.ballSeq),
    }, this.lang).then((r) => { const lines = r?.lines?.length ? r.lines.map((l) => l.display) : null; this.cardDone.set(key, lines); return lines; });
    this.cardReq.set(key, p);
  }
  private cardTarget(m: Moment, kind: CardState['kind']): ID | undefined {
    return cardTargetFor(m, kind, SELF_ID, this.beatsBySeq.get(m.ballSeq) ?? [], this.plan.moments, FRIENDS[0].id);
  }

  // ───────────────────────── ball events
  private onRevealed(seq: number, t: number) {
    const ball = this.match.balls[seq];
    const st = room();
    const away = !!st.away?.active;
    const p: Parameters<typeof patch>[0] = { playhead: Math.max(st.playhead, seq), position: seq };
    if (ball.wicket) p.wicketAt = { seq, at: Date.now() };
    if (st.callOffer && seq >= st.callOffer.beforeSeq + 6) p.callOffer = undefined;
    patch(p);
    const e = this.timeline.entries[seq];
    xlog('ball', ball.label, `Video ${t.toFixed(1)} s → ball ${ball.label} (${e?.src === 'tag' ? 'hand-tagged' : e?.src === 'scorebug' ? 'read off the scorebug' : 'interpolated'} at ${this.timeline.timeOf(seq).toFixed(1)} s). ${ball.text}`);
    for (const m of this.plan.moments.filter((x) => x.ballSeq === seq)) xlog('moment', ball.label, `${m.ruleId} fired: ${m.headline}. Why: ${RULE_WHY[m.ruleId] ?? 'rule matched'}.`);
    if (!away && this.source?.kind === 'scoreboard') audio.swell(ball.wicket || ball.runsBat === 6 ? 2 : ball.runsBat === 4 ? 1 : 0);
    if (ball.wicket && !away) try { navigator.vibrate?.(60); } catch { /* optional */ }

    // ball-pinned delivery: anything anchored ≤ this ball is now visible (F-SYNC)
    for (const it of this.delivery.release(seq)) this.deliver(it, !away);

    const card = this.cardsBySeq.get(seq);
    if (card && !away) this.scheduleCard(card);

    const offer = this.plan.callOffers.find((c) => c.beforeSeq === seq + 1);
    if (offer && !away) this.offerCall(offer);
    this.updateCalls(seq);

    for (const [i, b] of (this.beatsBySeq.get(seq) ?? []).entries()) this.track(this.playBeat(b, i));

    // stepped away: the gang calls you back on the next wicket
    if (away && this.awaitCallback && ball.wicket && !room().away?.calledBack && !room().away?.auto) {
      this.awaitCallback = false;
      void this.liveLine(FRIENDS[0].id, 'callback', `${this.matchState(seq)}. ${ball.text} Urgently call your friend back to the screen.`, SELF_ID, seq)
        .then((text) => this.raiseCallback(FRIENDS[0].id, text));
    }
    if (seq >= this.live.endBallSeq) void this.onEnded();
  }

  private fireTimed(b: Beat) {
    const away = room().away?.active;
    if (b.intent === 'nudge_away' && !away) {
      patch({ nudge: true });
      xlog('away', this.label(), 'Journey beat: the gang suggests stepping away for 20 s');
      this.later(() => { if (room().nudge && !room().away?.active) patch({ nudge: false }); }, 45_000);
    }
    this.track(this.playBeat(b, 0));
  }
  private track(p: Promise<void>) { const q = p.finally(() => this.inflight.delete(q)); this.inflight.add(q); }

  private async playBeat(b: Beat, i: number) {
    const asked = Date.now();
    const r = await this.resolveBeat(b);
    const away = !!room().away?.active;
    const item: FeedItem = {
      id: `beat-${b.id}`, memberId: b.friendId, kind: r.audio ? 'clip' : 'text', anchorSeq: b.seq, sentAt: Date.now() + i,
      text: r.text, transcriptStatus: 'ok', source: r.source, momentId: b.momentId, targetId: b.targetId, intent: b.intent,
      audioKey: r.audio ? `beat-${b.id}` : undefined, unheard: away, lang: r.lang,
    };
    const done = this.beatDone.get(this.k(b.id, r.lang));
    const how = r.source === 'live'
      ? done && done.at <= asked ? `prefetched (ready ${ms(asked - done.at)} before it was needed)` : `live (waited ${ms(Date.now() - asked)})`
      : r.source === 'precomputed' ? 'fallback: prepared earlier by Gemini' : 'fallback: template line';
    xlog('line', this.label(b.seq), `${this.member(b.friendId).name} · ${b.intent}${b.atTime !== undefined ? ' (timed)' : ''} · ${how}${away ? ' · you are away, saved for your catch-up' : ''}`);
    if (r.audio) { this.audioSrc.set(item.audioKey!, r.audio); if (r.audio instanceof Blob) void storage.putBlob(item.audioKey!, r.audio); }
    this.deliver(item, !away, r.voice);
  }

  private raiseCallback(friendId: ID, text: string) {
    const a = room().away; if (!a?.active || a.auto) return;
    patch({ away: { ...a, calledBack: { friendId, text } } });
    xlog('away', this.label(), `${this.member(friendId).name} calls you back (a wicket fell while you were away)`);
    if (typeof Notification !== 'undefined' && document.hidden && Notification.permission === 'granted') {
      try { new Notification(`${this.member(friendId).name} is calling you back`, { body: text }); } catch { /* optional */ }
    }
  }

  /** Several balls at once (the tab was hidden, a reload, or the viewer seeked in the extension): nothing bursts out.
   *  Gang lines from the jump land as "missed" items; the catch-up tells you what happened. */
  private onSkip(from: number, to: number, t: number) {
    const away = !!room().away?.active;
    const skipped: FeedItem[] = [];
    for (let s = from + 1; s < to; s++) {
      for (const [i, b] of (this.beatsBySeq.get(s) ?? []).entries()) {
        const r = this.quickLine(b);
        const it: FeedItem = { id: `beat-${b.id}`, memberId: b.friendId, kind: r.audio ? 'clip' : 'text', anchorSeq: s, sentAt: Date.now() + i,
          text: r.text, transcriptStatus: 'ok', source: r.source, momentId: b.momentId, targetId: b.targetId, intent: b.intent,
          audioKey: r.audio ? `beat-${b.id}` : undefined, unheard: true, lang: r.lang };
        if (r.audio) this.audioSrc.set(it.audioKey!, r.audio);
        skipped.push(it);
      }
    }
    // timed lines (breaks in play, the nudge) inside the jump are missed too, never fired all at once afterwards
    while (this.timed[this.timedIdx] && this.timed[this.timedIdx].atTime! <= t) {
      const b = this.timed[this.timedIdx++];
      if (b.intent === 'nudge_away' || b.intent === 'setup') continue;
      const r = this.quickLine(b);
      const it: FeedItem = { id: `beat-${b.id}`, memberId: b.friendId, kind: r.audio ? 'clip' : 'text', anchorSeq: b.seq, sentAt: Date.now(),
        text: r.text, transcriptStatus: 'ok', source: r.source, intent: b.intent, audioKey: r.audio ? `beat-${b.id}` : undefined, unheard: true, lang: r.lang };
      if (r.audio) this.audioSrc.set(it.audioKey!, r.audio);
      skipped.push(it);
    }
    for (const it of this.delivery.release(to - 1)) skipped.push({ ...it, unheard: true });
    const wk = awayEvents(this.match, from, to - 1).filter((e) => e.wicketOf).map((e) => e.wicketOf!);
    const fresh = skipped.filter((it) => !room().feed.some((f) => f.id === it.id));
    xlog('ball', this.label(to), `Video jumped ${this.label(from)} → ${this.label(to)} (${to - from} balls at once): ${fresh.length} gang lines saved as missed`);
    const marker: FeedItem[] = away ? [] : [{ id: `skip-${from}-${to}`, memberId: SELF_ID, kind: 'skip', anchorSeq: to - 1, sentAt: Date.now(),
      text: `You missed ${this.match.balls[Math.min(from + 1, to - 1)].label} to ${this.match.balls[to - 1].label}. ${this.scoreText(to - 1)}${wk.length ? `. Wickets: ${wk.join(', ')}` : ''}.`,
      source: 'template' }];
    patch({ feed: [...room().feed, ...marker, ...fresh], playhead: Math.max(room().playhead, to - 1) });
    this.updateCalls(to - 1);
    this.onRevealed(to, t);
  }

  /** A line right now, without waiting: live if already done, else precomputed, else template. */
  private quickLine(b: Beat): Resolved {
    const live = this.beatDone.get(this.k(b.id))?.r;
    if (live) return live;
    const pre = precomputed.beats[`${this.lang}:${b.id}`];
    if (pre) return { text: pre.text, audio: pre.audio ? `${precomputedBase}${pre.audio}` : undefined, source: 'precomputed', voice: pre.audio ? `prepared audio (Sarvam, ${this.voice(b.friendId)})` : undefined, lang: this.lang };
    const target = b.targetId ? (b.targetId === SELF_ID ? 'bro' : this.member(b.targetId).name) : '';
    return { text: beatTemplate(b.intent, b.seq, { target }, this.lang), source: 'template', lang: this.lang };
  }
  private async resolveBeat(b: Beat): Promise<Resolved> {
    if (!this.beatReq.has(this.k(b.id))) this.requestWindow([b], []);
    // the join line and timed lines have nothing else to wait for, so they can wait a little longer for live AI
    if (!this.beatDone.has(this.k(b.id))) await withTimeout(this.beatReq.get(this.k(b.id)), b.intent === 'setup' ? 5_000 : b.atTime !== undefined ? 3_000 : LATE_LINE_MS);
    return this.quickLine(b);
  }

  /** Put an item in the feed and, if it has audio and the user is present, queue it. */
  private deliver(item: FeedItem, play = true, voice?: string) {
    if (!room().feed.some((f) => f.id === item.id)) this.push(item);
    const src = item.audioKey ? this.audioSrc.get(item.audioKey) : undefined;
    if (src && play && item.memberId !== SELF_ID) {
      const who = this.member(item.memberId).name;
      audio.enqueue({ id: item.memberId, src, onEnd: () => this.update(item.id, { unheard: false }),
        onPlaying: (d) => xlog('voice', this.label(item.anchorSeq), `${who} speaks${Number.isFinite(d) ? ` for ${d.toFixed(1)} s` : ''}${voice ? ` · ${voice}` : ''}`) });
    }
    if (item.memberId !== SELF_ID) this.lastSpeaker = item.memberId;
  }

  /** The user's card waits until the gang has had its say (comeback ≈ a minute in), then stays until used or stale. */
  private scheduleCard(m: Moment) {
    const kind = cardKind(m, SELF_ID);
    const delay = (kind === 'comeback' ? this.live.comebackCardDelaySec : 4) * 1000;
    this.later(async () => {
      const t0 = Date.now();
      while (audio.busy && Date.now() - t0 < 10_000) await sleep(250);
      const c = room().card;
      if (this.ended || room().away?.active || (c && c.moment.ballSeq > m.ballSeq)) return;
      this.showCard(m);
    }, delay);
  }

  private showCard(m: Moment) {
    const kind = cardKind(m, SELF_ID);
    const targetId = this.cardTarget(m, kind);
    const done = this.cardDone.get(this.k(m.id));
    const pre = precomputed.cards[`${this.lang}:${m.id}|${kind}`];
    let lines: string[]; let source: LineSource;
    if (done) { lines = done; source = 'live'; }
    else if (pre?.length) { lines = pre; source = 'precomputed'; }
    else {
      const b = this.match.balls[m.ballSeq];
      const runs = b.wicket ? this.plan.snaps[m.ballSeq].batters[b.wicket.playerOutId]?.runs : this.plan.snaps[m.ballSeq].overRuns;
      lines = cardTemplate(kind, m.ruleId, { target: targetId ? this.member(targetId).name : 'everyone', player: this.pname(m.playerId), runs }, this.lang);
      source = 'template';
    }
    patch({ card: { moment: m, kind, lines, idx: 0, source, targetId, shownAt: Date.now() }, coach: false });
    xlog('line', this.label(m.ballSeq), `Your ${kind} card (${m.ruleId}) · ${source === 'live' ? 'written live by Gemini' : source === 'precomputed' ? 'fallback: prepared earlier' : 'fallback: template'} · ${lines.length} options`);
    this.later(() => { const c = room().card; if (c?.moment.id === m.id && c.usedIdx === undefined) patch({ card: undefined }); }, CARD_TTL_MS);
    // live lines arriving late replace the fallback, if the card is still unused
    const lang = this.lang;
    if (source !== 'live') void withTimeout(this.cardReq.get(this.k(m.id)), 4_000).then((l) => {
      if (lang !== this.lang) return;
      const c = room().card;
      if (l?.length && c?.moment.id === m.id && c.usedIdx === undefined) patch({ card: { ...c, lines: l, idx: 0, source: 'live' } });
    });
  }
  /** "Another line" on the line card. */
  nextLine() { const c = room().card; if (c && c.usedIdx === undefined) patch({ card: { ...c, idx: (c.idx + 1) % c.lines.length } }); }
  dismissCard() { patch({ card: undefined }); }

  // ───────────────────────── user actions
  private anchorNow() { return anchorFor(room().position); }
  sendText(text: string, opts: { fromLine?: number } = {}) {
    const t = text.trim().slice(0, 140);
    if (!t) return;
    const card = room().card;
    const item: FeedItem = { id: uid(), memberId: SELF_ID, kind: 'text', anchorSeq: this.anchorNow(), sentAt: Date.now(), text: t, source: 'user', targetId: card?.targetId, momentId: opts.fromLine !== undefined ? card?.moment.id : undefined };
    this.push(item);
    if (card && opts.fromLine !== undefined) {
      patch({ card: { ...card, usedIdx: opts.fromLine } });
      this.later(() => { if (room().card?.moment.id === card.moment.id) patch({ card: undefined }); }, 6_000); // free the dock
    }
    xlog('you', this.label(), opts.fromLine !== undefined ? 'You sent the suggested line' : 'You sent a line');
    void this.replyTo(t);
  }
  sendCardLine() { const c = room().card; if (c && c.usedIdx === undefined) this.sendText(c.lines[c.idx], { fromLine: c.idx }); }
  react(emoji: string) {
    this.push({ id: uid(), memberId: SELF_ID, kind: 'reaction', anchorSeq: this.anchorNow(), sentAt: Date.now(), emoji, source: 'user' });
  }
  async sendClip(blob: Blob, durationMs: number) {
    const id = uid();
    const card = room().card;
    patch({ coach: false });
    this.audioSrc.set(id, blob); void storage.putBlob(id, blob);
    this.push({ id, memberId: SELF_ID, kind: 'clip', anchorSeq: this.anchorNow(), sentAt: Date.now(), audioKey: id, durationMs, transcriptStatus: 'pending', source: 'user', targetId: card?.targetId });
    const t0 = Date.now();
    const text = await api.transcribe(blob, this.lang);
    xlog('you', this.label(), text
      ? `Your ${(durationMs / 1000).toFixed(1)} s clip → Sarvam ${this.lang === 'hi' ? 'saaras:v3 (translit: Roman Hinglish)' : 'saaras:v4 (en-IN)'} in ${ms(Date.now() - t0)}, ${text.split(/\s+/).length} words`
      : `Your clip couldn't be transcribed (${ms(Date.now() - t0)}); it still plays for the gang`);
    this.update(id, text ? { text, transcriptStatus: 'ok' } : { transcriptStatus: 'failed' });
    if (text) {
      // a spoken comeback counts as using the card
      const cur = room().card;
      if (card && cur && cur.moment.id === card.moment.id && cur.usedIdx === undefined) {
        patch({ card: { ...cur, usedIdx: cur.idx } });
        this.later(() => { if (room().card?.moment.id === card.moment.id) patch({ card: undefined }); }, 6_000);
      }
      void this.replyTo(text);
    }
  }
  playItem(item: FeedItem) {
    const src = item.audioKey ? this.audioSrc.get(item.audioKey) : undefined;
    if (src) audio.enqueue({ id: item.memberId, src, onEnd: () => this.update(item.id, { unheard: false }) });
  }

  /** A friend answers the user live (Gemini text → Sarvam voice), pinned to the user's current ball. */
  private async replyTo(said: string) {
    if (room().away?.active || room().status !== 'live') return;
    if (Date.now() - this.lastReplyAt < 5_000) return;
    this.lastReplyAt = Date.now();
    const card = room().card;
    const named = FRIENDS.find((f) => new RegExp(`\\b${f.name}\\b`, 'i').test(said));
    const friendId = (card?.targetId && card.targetId !== SELF_ID ? card.targetId : undefined) ?? named?.id ?? this.lastSpeaker ?? FRIENDS[0].id;
    const anchor = this.anchorNow();
    const t0 = Date.now();
    const r = await api.reply(friendId, said, this.matchState(anchor), this.lang, card?.moment.headline);
    const text = r?.line.display ?? beatTemplate('reply', Date.now(), {}, this.lang);
    const v0 = Date.now();
    const sp = r?.line ? await api.speak(r.line.speech, this.voice(friendId), this.lang) : null;
    xlog('line', this.label(anchor), `${this.member(friendId).name} replies to you · ${r ? `live Gemini in ${ms(v0 - t0)}` : 'fallback: template'}`);
    const item: FeedItem = { id: uid(), memberId: friendId, kind: sp ? 'clip' : 'text', anchorSeq: anchor, sentAt: Date.now(), text, transcriptStatus: 'ok', source: r ? 'live' : 'template', targetId: SELF_ID, intent: 'reply', audioKey: sp ? `reply-${uid()}` : undefined };
    if (sp) { this.audioSrc.set(item.audioKey!, sp.blob); void storage.putBlob(item.audioKey!, sp.blob); }
    this.delivery.add(item);
    for (const it of this.delivery.release(room().playhead)) this.deliver(it, true, sp ? `Sarvam ${sp.model}, voice ${this.voice(friendId)}, made in ${ms(Date.now() - v0)}` : undefined);
  }

  // ───────────────────────── Gang Calls (an extra, off by default in v1.3)
  private offerCall(o: RoomPlan['callOffers'][number]) {
    if (room().calls.some((c) => c.innings === o.innings && c.over === o.over)) return;
    const first = this.match.balls[o.beforeSeq];
    const battingTeam = first.innings === 1 ? this.match.battingFirst : this.match.chasing;
    const friendCalls = FRIENDS.map((f) => ({ memberId: f.id, type: friendCall(f, battingTeam, o.over) }));
    const calls = [...room().calls, ...friendCalls.map((c) => ({ id: uid(), memberId: c.memberId, type: c.type, innings: o.innings, over: o.over, status: 'open' as const }))];
    patch({ callOffer: { ...o, bowler: this.pname(first.bowlerId), friendCalls }, calls });
  }
  placeCall(type: CallType) {
    const o = room().callOffer; if (!o) return;
    if (room().playhead >= o.beforeSeq) return; // calls lock when the over's first ball is bowled
    if (room().calls.some((c) => c.memberId === SELF_ID && c.innings === o.innings && c.over === o.over)) return;
    patch({ calls: [...room().calls, { id: uid(), memberId: SELF_ID, type, innings: o.innings, over: o.over, status: 'open' }] });
  }
  /** Calls are won the moment the event happens, lost when the over ends without it. */
  private updateCalls(seq: number) {
    const before = room().calls;
    if (!before.some((c) => c.status === 'open')) return;
    const changed: GangCall[] = [];
    const calls = before.map((c) => {
      if (c.status !== 'open') return c;
      const status = callStatusAt(this.match, c, seq);
      if (status !== 'open') { const n = { ...c, status }; changed.push(n); return n; }
      return c;
    });
    if (!changed.length) return;
    patch({ calls });
    const mine = changed.find((c) => c.memberId === SELF_ID);
    const winners = changed.filter((c) => c.status === 'won').map((c) => (c.memberId === SELF_ID ? 'You' : this.member(c.memberId).name));
    if (winners.length) patch({ callResult: { text: `${winners.join(' & ')} called it`, won: mine?.status === 'won', at: Date.now() } });
    else if (changed.some((c) => c.status === 'lost') && !before.some((c) => c.status === 'won' && c.over === changed[0].over && c.innings === changed[0].innings)) {
      patch({ callResult: { text: 'Nobody called that over', won: false, at: Date.now() } });
    }
    if (room().away?.active) return;
    if (mine?.status === 'won' && !this.cardsBySeq.has(seq)) {
      const m: Moment = { id: `call-${mine.innings}-${mine.over}`, ruleId: 'R5', ballSeq: seq, severity: 2, headline: `You called it: ${CALL_LABEL[mine.type].toLowerCase()}`, fact: `The user correctly predicted "${CALL_LABEL[mine.type]}" for this over.`, ownerId: SELF_ID };
      this.requestCard(m); this.cardsBySeq.set(seq, m);
      void withTimeout(this.cardReq.get(this.k(m.id)), 2_500).then(() => { if (room().playhead === seq) this.showCard(m); });
    } else if (mine?.status === 'lost') {
      const w = room().calls.find((c) => c.memberId !== SELF_ID && c.status === 'won' && c.over === mine.over && c.innings === mine.innings);
      if (w) void this.liveLine(w.memberId, 'call_brag', `${this.member(w.memberId).name} predicted "${CALL_LABEL[w.type]}" correctly; the user called "${CALL_LABEL[mine.type]}" and was wrong.`, SELF_ID, seq).then(() => undefined);
    }
  }

  /** One-off friend line generated live outside the plan (call-backs, remarks while you're away, call results). */
  private async liveLine(friendId: ID, intent: Intent, fact: string, targetId: ID | undefined, seq: number): Promise<string> {
    const id = `${seq}-${friendId}-${intent}-${uid()}`;
    const lang = this.lang;
    const t0 = Date.now();
    const r = await api.react([{ id, friendId, intent, fact, target: this.person(targetId) }], this.matchState(seq), lang, 6_000);
    const line = r?.lines[id];
    const text = line?.display ?? beatTemplate(intent, seq, {}, lang);
    const sp = line ? await api.speak(line.speech, this.voice(friendId), lang) : null;
    const away = !!room().away?.active;
    xlog('line', this.label(seq), `${this.member(friendId).name} · ${intent} · ${line ? `live Gemini in ${ms(Date.now() - t0)}` : 'fallback: template'}${away && intent !== 'callback' ? ' · saved for your catch-up' : ''}`);
    const item: FeedItem = { id, memberId: friendId, kind: sp ? 'clip' : 'text', anchorSeq: seq, sentAt: Date.now(), text, transcriptStatus: 'ok', source: line ? 'live' : 'template', targetId, intent, audioKey: sp ? id : undefined, unheard: away && intent !== 'callback' };
    if (sp) { this.audioSrc.set(id, sp.blob); void storage.putBlob(id, sp.blob); }
    this.deliver(item, intent === 'callback' || !away);
    return text;
  }

  // ───────────────────────── step away / call-back / catch-up
  /** Step away. The broadcast keeps running live; the gang carries on (you hear it in the catch-up). */
  stepAway(auto = false) {
    if (room().away?.active || room().status !== 'live') return;
    const from = room().playhead;
    patch({ away: { active: true, startSeq: from, since: Date.now(), auto }, nudge: false, card: undefined, callOffer: undefined });
    audio.clear();
    this.awaitCallback = true;
    xlog('away', this.label(), auto ? 'Tab hidden: the broadcast keeps running; lines are saved for your catch-up' : 'You stepped away: the broadcast keeps running; lines are saved for your catch-up');
    if (!auto) {
      const f = FRIENDS[(from + 1) % FRIENDS.length];
      this.later(() => { if (room().away?.active) void this.liveLine(f.id, 'away', `${this.matchState(room().playhead)}. Your friend just stepped away from the screen for a few seconds.`, SELF_ID, room().playhead); }, AWAY_REMARK_MS);
    }
    if (!auto && typeof Notification !== 'undefined' && Notification.permission === 'default') { try { void Notification.requestPermission(); } catch { /* optional */ } }
  }
  /** The host reports page visibility: a hidden tab counts as away, coming back plays the catch-up. */
  setHidden(hidden: boolean) {
    const a = room().away;
    if (hidden && !a?.active) this.stepAway(true);
    else if (!hidden && a?.active && a.auto) void this.comeBack();
  }
  private requestCatchup(from: number, to: number, timeoutMs: number) {
    const said = room().feed.filter((f) => f.anchorSeq >= from && f.anchorSeq <= to && f.unheard && f.text && f.memberId !== SELF_ID && f.kind !== 'skip')
      .slice(-12).map((f) => ({ who: this.member(f.memberId).name, text: f.text! }));
    const events = awayEvents(this.match, from, to).map((e) => ({ seq: e.seq, text: e.text }));
    events.unshift({ seq: from, text: `When you left: ${this.scoreText(Math.max(0, from))}` });
    events.push({ seq: to, text: `Now: ${this.scoreText(to)}${to === from ? ' (no ball bowled while you were away)' : ''}` });
    const t0 = Date.now();
    return api.catchup({ events: events.slice(-60), said, self: 'You', maxWords: 45 }, this.lang, timeoutMs).then((r) => {
      xlog('line', this.label(to), r?.summary ? `Catch-up written live by Gemini in ${ms(Date.now() - t0)}` : `Catch-up: Gemini unavailable, fallback summary`);
      return r?.summary
        ? { text: ensureWickets(r.summary, this.match, from, to), source: 'live' as const }
        : { text: fallbackCatchup(this.match, from, to, this.scoreText), source: 'fallback' as const };
    });
  }
  async comeBack() {
    const a = room().away; if (!a?.active) return;
    const from = a.startSeq, to = room().playhead;
    this.awaitCallback = false;
    const missedItems = room().feed.filter((f) => f.unheard);
    const missed = missedItems.map((f) => f.id);
    // the catch-up covers them: they stop counting as missed (a later step-away only counts new lines)
    if (missed.length) patch({ feed: room().feed.map((f) => (f.unheard ? { ...f, unheard: false } : f)) });
    const secs = Math.round((Date.now() - a.since) / 1000);
    xlog('away', this.label(), `Back after ${secs} s: ${to - from} ball${to - from === 1 ? '' : 's'} and ${missed.length} gang line${missed.length === 1 ? '' : 's'} missed`);
    if (a.auto && to === from && !missed.length) { patch({ away: undefined }); return; }
    patch({ away: undefined, catchup: { text: '', source: 'loading', fromSeq: from, toSeq: to, missed } });
    // AC-CATCH-3: shown within 3 s of return, else the deterministic fallback
    const req = this.requestCatchup(from, to, 8_000);
    const res = await withTimeout(req, 3_000) ?? { text: fallbackCatchup(this.match, from, to, this.scoreText), source: 'fallback' as const };
    if (room().catchup?.fromSeq === from) patch({ catchup: { ...room().catchup!, text: res.text, source: res.source } });
    if (res.source === 'fallback') void req.then((late) => {
      const c = room().catchup;
      if (late.source === 'live' && c && c.fromSeq === from && c.source === 'fallback') patch({ catchup: { ...c, text: late.text, source: 'live' } });
    });
    // then the gang's own voices: the last few things they said while you were gone
    for (const it of missedItems.filter((f) => f.kind === 'clip').slice(-3)) this.playItem(it);
  }
  dismissCatchup() { patch({ catchup: undefined }); }

  // ───────────────────────── end → wrap → memory
  /** "Leave the box": end the room now and show the wrap. The match itself ends the same way at the last ball. */
  finish() { void this.onEnded(); }
  private async onEnded() {
    if (this.ended) return;
    this.ended = true;
    clearInterval(this.loop);
    const st0 = room();
    const complete = st0.playhead >= this.live.endBallSeq;
    xlog('wrap', this.label(), complete ? 'Match over: building the wrap' : 'You left the box: building the wrap from what you watched');
    // let the last ball's lines land and play before the wrap (the final reactions belong in the memory)
    await withTimeout(Promise.allSettled([...this.inflight]), complete ? 6_000 : 1_500);
    await sleep(300);
    const t0 = Date.now();
    while (complete && audio.busy && Date.now() - t0 < 12_000) await sleep(200);
    if (!complete) audio.clear();
    this.timers.forEach(clearTimeout); this.timers.clear();
    this.source?.pause();
    if (this.source?.kind !== 'video') this.source?.setVolume(0); // the extension never touches the viewer's volume at the end
    this.ducker.restore();
    patch({ status: 'ended', card: undefined, callOffer: undefined, catchup: undefined, away: undefined, nudge: false, coach: false });
    const st = room();
    const fromSeq = this.roomStart ?? 0, toSeq = Math.max(fromSeq, st.playhead);
    const inRoom = (seq: number) => seq >= fromSeq && seq <= toSeq;
    const stats = computeStats(this.members, this.plan.moments.filter((m) => inRoom(m.ballSeq)), st.feed, st.calls, SELF_ID);
    const highlights = st.feed.filter((f) => f.text && f.kind !== 'reaction' && f.kind !== 'skip').slice(-50)
      .map((f) => ({ itemId: f.id, who: f.memberId === SELF_ID ? 'You' : this.member(f.memberId).name, text: f.text!.slice(0, 200), seq: f.anchorSeq }));
    const moments = this.plan.moments.filter((m) => m.ruleId !== 'R7' && inRoom(m.ballSeq)).slice(0, 30).map((m) => ({ seq: m.ballSeq, text: m.headline }));
    // top moments of what THIS viewer saw: wickets first, then sixes, in match order
    const seen = this.match.balls.filter((b) => inRoom(b.seq) && (b.wicket || b.runsBat === 6));
    const top = [...seen.filter((b) => b.wicket), ...seen.filter((b) => !b.wicket)].slice(0, 4).sort((a, b) => a.seq - b.seq).map((b) => ({ seq: b.seq, text: b.text }));
    const minutes = Math.max(1, Math.round((Date.now() - (this.joinedAt ?? Date.now())) / 60_000));
    patch({ screen: 'wrap', wrap: undefined });
    const a0 = Date.now();
    const ai = await api.wrap({
      match: this.match.title, result: complete ? this.match.result : `The viewer left at ${this.scoreText(toSeq)}; the match was still going`,
      stats: { mostRoasted: stats.mostRoasted ? this.member(stats.mostRoasted.memberId).name : undefined, counts: stats.clips },
      moments, highlights,
    }, this.lang, 7_000);
    xlog('wrap', this.label(toSeq), ai ? `Wrap written live by Gemini in ${ms(Date.now() - a0)}` : 'Wrap: Gemini unavailable, built from the feed instead');
    const clipIds = st.feed.filter((f) => f.kind === 'clip' && f.audioKey && this.audioSrc.has(f.audioKey));
    const fallbackReel = [...clipIds].sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0)).slice(0, 3).sort((a, b) => a.anchorSeq - b.anchorSeq).map((f) => f.id);
    const roastFallback = st.feed.find((f) => f.intent === 'tease' && f.text) ?? st.feed.find((f) => f.memberId !== SELF_ID && f.text && f.kind !== 'skip');
    const loudest = this.plan.moments.find((m) => m.severity === 3 && m.ruleId !== 'R7' && inRoom(m.ballSeq));
    const roasted = stats.mostRoasted ? (stats.mostRoasted.memberId === SELF_ID ? 'You' : this.member(stats.mostRoasted.memberId).name) : undefined;
    const valid = (ids: string[]) => ids.filter((id) => clipIds.some((c) => c.id === id)).slice(0, 4);
    const watched = { fromSeq, toSeq, minutes, complete };
    const wrap: WrapState = ai ? {
      title: ai.title, source: 'live', watched, top, roast: ai.roastOfTheNight, high: ai.high, low: ai.low,
      reel: valid(ai.reel).length ? valid(ai.reel) : fallbackReel, stats,
    } : {
      title: roasted ? `${roasted} took the most stick tonight` : 'The gang watched it together', source: 'fallback', watched, top,
      roast: roastFallback ? { itemId: roastFallback.id, title: 'Line of the night' } : undefined,
      high: loudest ? { seq: loudest.ballSeq, caption: 'The loudest the gang got' } : undefined,
      reel: fallbackReel, stats,
    };
    patch({ wrap });
    await this.saveMemory(wrap);
  }

  private async saveMemory(wrap: WrapState) {
    const st = room();
    const saved: SavedRoom = {
      id: this.roomId, matchId: this.match.id, title: this.match.shortTitle, date: this.match.date, endedAt: Date.now(), result: wrap.watched.complete ? this.match.result : `Watched ${this.label(wrap.watched.fromSeq)}–${this.label(wrap.watched.toSeq)}`,
      loyalty: this.member(SELF_ID).loyalty, feed: st.feed, calls: st.calls, wrap,
    };
    const ok = await storage.putRoom(saved);
    await storage.clearLive();
    if (!ok) { patch({ storageOk: false }); this.toast("This browser can't save memories, so this match won't be on the shelf after reload."); }
    await refreshShelf();
  }

  private async persistLive() {
    const st = room();
    if (st.status !== 'live' || !this.source || this.joinedAt === undefined || this.source.kind === 'video') return;
    const snap: LiveSnapshot = { roomId: this.roomId, joinedAt: this.joinedAt, rate: liveRate(), maxRevealed: this.tracker.maxRevealed, roomStart: this.roomStart, loyalty: this.member(SELF_ID).loyalty, feed: st.feed, calls: st.calls, label: this.scoreText(Math.max(0, st.playhead)) };
    await storage.putLive(snap);
  }

  /** Resume: restore feed without replaying it. */
  restore(feed: FeedItem[], calls: GangCall[], sources: Map<string, Blob | string>) {
    sources.forEach((v, k) => this.audioSrc.set(k, v));
    patch({ feed, calls });
  }
}

/** Test/demo speed-up for the live clock (?speed=N, max 50). 1 in normal use. */
export function liveRate(): number {
  try { const n = Number(new URLSearchParams(location.search).get('speed')); return n > 0 && n <= 50 ? n : 1; } catch { return 1; }
}

export async function refreshShelf() {
  const rooms = await storage.listRooms<SavedRoom>();
  const memories: MemorySummary[] = rooms.sort((a, b) => b.endedAt - a.endedAt).map((r) => ({
    id: r.id, title: r.title, date: r.date, endedAt: r.endedAt, result: r.result, cover: r.wrap?.title ?? r.result, loyalty: r.loyalty,
  }));
  patch({ memories });
}

export async function loadSources(feed: FeedItem[], lang: Lang): Promise<Map<string, Blob | string>> {
  const m = new Map<string, Blob | string>();
  await Promise.all(feed.filter((f) => f.audioKey).map(async (f) => {
    const b = await storage.getBlob(f.audioKey!);
    if (b) m.set(f.audioKey!, b);
    else if (f.id.startsWith('beat-')) { const pre = precomputed.beats[`${f.lang ?? lang}:${f.id.slice(5)}`]; if (pre?.audio) m.set(f.audioKey!, `${precomputedBase}${pre.audio}`); }
  }));
  return m;
}

export let engine: RoomEngine | undefined;
export function setEngine(e?: RoomEngine) { engine?.stop(); engine = e; }
export const SELF = SELF_ID;
