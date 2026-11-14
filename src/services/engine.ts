// Room engine: wires the pure core (timeline, tracker, rules, director, sync) to side effects
// (match source, AI, audio, storage) and the store. Time comes ONLY from the MatchSource (v1.2).
import type { Chapter, FeedItem, GangCall, Match, Member, Moment, CallType, ID } from '../core/types';
import { buildPlan, type RoomPlan } from '../core/plan';
import { Timeline } from '../core/timeline';
import { BallTracker, type TrackEvent } from '../core/tracker';
import { DeliveryQueue, anchorFor } from '../core/sync/delivery';
import { cardKind } from '../core/moments/rules';
import { stateLine, type Beat, type Intent } from '../core/friends/director';
import { callStatusAt, friendCall, CALL_LABEL } from '../core/calls';
import { computeStats, awayEvents, fallbackCatchup, ensureWickets } from '../core/wrapStats/stats';
import { FRIENDS, SELF_ID } from '../content/gang';
import { cardTemplate, beatTemplate } from '../content/templates';
import { api, type PersonDTO } from './api/client';
import { audio } from './audio/engine';
import { storage } from './storage/db';
import type { MatchSource } from './source/types';
import { ScoreboardSource } from './source/scoreboard';
import { Ducker } from './source/ducker';
import { patch, room, type CardState, type LineSource, type WrapState, type MemorySummary } from '../store/room';

const uid = () => Math.random().toString(36).slice(2, 10);
const withTimeout = <T,>(p: Promise<T> | undefined, ms: number): Promise<T | undefined> =>
  p ? Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]) : Promise.resolve(undefined);

export interface Precomputed { beats: Record<string, { text: string; audio?: string }>; cards: Record<string, string[]> }
let precomputed: Precomputed = { beats: {}, cards: {} };
export async function loadPrecomputed() {
  try { const r = await fetch('/data/precomputed.json'); if (r.ok) precomputed = await r.json(); } catch { /* safety net optional */ }
}

export interface SavedRoom {
  id: string; matchId: string; title: string; date: string; endedAt: number; result: string;
  loyalty: Member['loyalty']; feed: FeedItem[]; calls: GangCall[]; wrap?: WrapState;
}
export interface LiveSnapshot { roomId: string; videoTime: number; maxRevealed: number; loyalty: Member['loyalty']; feed: FeedItem[]; calls: GangCall[]; label: string }

/** How far ahead (video seconds) we ask Gemini for lines, and what counts as urgent. */
export const LOOKAHEAD_S = 240;
const URGENT_S = 75;
/** When a ball is revealed and its live line is still in flight, wait at most this long (the video never waits). */
const LATE_LINE_MS = 1_200;
const POLL_MS = 250;
/** A chapter starts this many seconds before its first ball, so the scene-setting line lands first. */
export const CHAPTER_LEAD_S = 12;
/** Away time-skip lands this many seconds before the call-back ball. */
const CALLBACK_LEAD_S = 6;
/** After a chapter's last ball, give the gang this long to react before offering the next chapter. */
const UP_NEXT_AFTER_MS = 20_000;
/** A line card that nobody used disappears after this long, even if the next ball is far away (DRS, drinks). */
const CARD_TTL_MS = 30_000;

type ResolvedLine = { text: string; audio: Blob | null } | null;

export class RoomEngine {
  plan: RoomPlan;
  readonly tracker: BallTracker;
  source?: MatchSource;
  private unsub: (() => void)[] = [];
  private loop?: ReturnType<typeof setInterval>;
  private delivery = new DeliveryQueue<FeedItem>();
  private beatReq = new Map<string, Promise<ResolvedLine>>();
  private beatDone = new Map<string, ResolvedLine>();
  private cardReq = new Map<string, Promise<string[] | null>>();
  private cardDone = new Map<string, string[] | null>();
  readonly audioSrc = new Map<string, Blob | string>();
  private lastReplyAt = 0;
  private lastSpeaker?: ID;
  private P: Map<string, Match['players'][number]>;
  private beatsBySeq = new Map<number, Beat[]>();
  private cardsBySeq = new Map<number, Moment>();
  private ducker = new Ducker(() => this.source);
  private ended = false;
  private lastPrefetchAt = 0;
  private lastPersistAt = 0;
  private lastTimePatch = -1;
  private awaitCallback = false;

  constructor(public match: Match, public members: Member[], public timeline: Timeline, public chapters: Chapter[],
    public mode: 'live' | 'rewatch' = 'live', public roomId = uid()) {
    this.plan = buildPlan(match, members, SELF_ID, chapters);
    this.P = new Map(match.players.map((p) => [p.id, p]));
    for (const b of this.plan.beats) this.beatsBySeq.set(b.seq, [...(this.beatsBySeq.get(b.seq) ?? []), b]);
    for (const c of this.plan.cards) this.cardsBySeq.set(c.ballSeq, c);
    this.tracker = new BallTracker(timeline);
  }

  // ───────────────────────── source lifecycle
  /** Attach (or swap to) a match source. Keeps the tracker, so a fallback mid-match never re-delivers anything. */
  attach(src: MatchSource, note?: string) {
    this.unsub.forEach((f) => f()); this.unsub = [];
    this.source?.destroy();
    this.source = src;
    audio.setDucker(this.ducker);
    if (src instanceof ScoreboardSource) {
      audio.startCrowd(); audio.setCrowdVolume(src.getVolume());
      this.unsub.push(src.onVolume((v) => audio.setCrowdVolume(v)));
    } else audio.stopCrowd();
    this.unsub.push(src.onStateChange((s) => { patch({ sourceState: s }); if (s === 'ended') void this.onEnded(); }));
    patch({ sourceKind: src.kind, sourceState: src.getState(), sourceNote: note });
  }

  /** Begin playing at video time `t` (chapter start, resume point…). Balls up to the one on screen count as seen. */
  start(t: number, opts: { silentUpTo?: number } = {}) {
    audio.unlock();
    const seenUpTo = opts.silentUpTo ?? this.timeline.ballAt(t) - 1;
    this.tracker.resetTo(seenUpTo);
    patch({ plan: this.plan, status: 'live', roomId: this.roomId, position: seenUpTo, playhead: Math.max(room().playhead, seenUpTo), videoTime: t });
    this.source?.seekTo(t);
    this.source?.play();
    clearInterval(this.loop);
    this.loop = setInterval(() => this.tick(), POLL_MS);
    if (this.mode === 'live') this.prefetch(t, true);
  }
  stop() { clearInterval(this.loop); this.unsub.forEach((f) => f()); this.unsub = []; this.source?.destroy(); this.source = undefined; audio.clear(); audio.setDucker(undefined); audio.stopCrowd(); }
  togglePause() { const s = this.source; if (!s) return; if (s.getState() === 'playing') s.pause(); else s.play(); }

  /** One poll: read the source, turn time into ball events. */
  tick() {
    const s = this.source; if (!s || this.ended) return;
    const t = s.getCurrentTime();
    const st = s.getState();
    if (Math.abs(t - this.lastTimePatch) >= 0.5) { this.lastTimePatch = t; patch({ videoTime: t }); }
    for (const ev of this.tracker.update(t, st)) this.handle(ev);
    const now = Date.now();
    if (this.mode === 'live' && now - this.lastPrefetchAt > 2_000) this.prefetch(t);
    if (now - this.lastPersistAt > 8_000) { this.lastPersistAt = now; void this.persistLive(); }
  }

  private handle(ev: TrackEvent) {
    if (ev.type === 'reveal') this.onRevealed(ev.seq);
    else if (ev.type === 'skip') this.onSkip(ev.from, ev.to);
    else {
      const seq = ev.type === 'rewind' ? ev.to : ev.seq;
      const ch = this.chapters.find((c) => seq >= c.startBallSeq - 1 && seq <= c.endBallSeq);
      patch({ position: seq, chapterId: ch?.id });
    }
  }

  // ───────────────────────── chapters
  /** "Jump to moment". Forward jumps deliver what you skipped into catch-up; backward jumps never re-deliver. */
  jumpTo(chapterId: ID) {
    const ch = this.chapters.find((c) => c.id === chapterId); if (!ch || !this.source) return;
    patch({ chapterId, card: undefined, callOffer: undefined, upNext: undefined, nudge: false });
    const t = this.timeline.timeOf(ch.startBallSeq) - CHAPTER_LEAD_S;
    if (this.mode === 'live') this.prefetch(t, true);
    this.source.seekTo(t);
    if (this.source.getState() !== 'playing') this.source.play();
  }

  /** Journey guide: once a chapter's last ball has landed, offer the next chapter. */
  private maybeOfferNext(seq: number) {
    const i = this.chapters.findIndex((c) => c.endBallSeq === seq);
    const next = i >= 0 ? this.chapters[i + 1] : undefined;
    if (!next || this.mode !== 'live') return;
    setTimeout(() => {
      const st = room();
      if (this.ended || st.status !== 'live' || st.away?.active || st.playhead >= next.startBallSeq) return;
      patch({ upNext: { chapterId: next.id, at: Date.now() } });
    }, UP_NEXT_AFTER_MS);
  }
  dismissUpNext() { patch({ upNext: undefined }); }

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

  // ───────────────────────── look-ahead prefetch (live AI well before the ball arrives)
  // One Gemini call covers every friend line and user card in the next window (free tier = 5 RPM per model).
  private lastBatchAt = 0;
  prefetch(t: number, force = false) {
    this.lastPrefetchAt = Date.now();
    const beats: Beat[] = []; const cards: Moment[] = []; let urgent = force;
    const from = Math.max(0, this.timeline.ballAt(t));
    for (let s = from; s < this.match.balls.length; s++) {
      const dt = this.timeline.timeOf(s) - t;
      if (dt > LOOKAHEAD_S) break;
      const near = dt < URGENT_S;
      for (const b of this.beatsBySeq.get(s) ?? []) if (!this.beatReq.has(b.id)) { beats.push(b); urgent ||= near; }
      const c = this.cardsBySeq.get(s); if (c && !this.cardReq.has(c.id)) { cards.push(c); urgent ||= near; }
    }
    if (!beats.length && !cards.length) return;
    if (!urgent && beats.length + cards.length < 6 && Date.now() - this.lastBatchAt < 15_000) return;
    this.requestWindow(beats.slice(0, 10), cards.slice(0, 4));
  }

  private requestWindow(beats: Beat[], cards: Moment[]) {
    this.lastBatchAt = Date.now();
    const firstSeq = Math.min(...beats.map((b) => b.seq), ...cards.map((c) => c.ballSeq));
    const dto = beats.map((b) => ({ id: b.id, friendId: b.friendId, intent: b.intent, fact: b.fact, target: this.person(b.targetId), ballText: this.match.balls[b.seq].text }));
    const cdto = cards.map((m) => this.cardDTO(m));
    const batch = api.react(dto, this.matchState(firstSeq - 1), 14_000, cdto, this.member(SELF_ID).loyalty.teamId);
    for (const b of beats) {
      const p = batch.then(async (r): Promise<ResolvedLine> => {
        const text = r?.lines?.[b.id];
        if (!text) return null;
        const blob = await api.speak(text, this.member(b.friendId).speaker!);
        return { text, audio: blob };
      });
      this.beatReq.set(b.id, p);
      void p.then((r) => this.beatDone.set(b.id, r));
    }
    for (const m of cards) {
      this.cardReq.set(m.id, batch.then((r) => { const l = r?.cards?.[m.id]?.length ? r.cards[m.id] : null; this.cardDone.set(m.id, l); return l; }));
    }
  }
  private cardDTO(m: Moment) {
    const kind = cardKind(m, SELF_ID);
    const pl = m.playerId ? this.P.get(m.playerId) : undefined;
    return { id: m.id, kind, headline: m.headline, fact: m.fact, player: pl ? { name: pl.name, story: pl.story } : undefined, target: this.person(this.cardTarget(m, kind)), matchState: this.matchState(m.ballSeq) };
  }
  private requestCard(m: Moment) {
    const kind = cardKind(m, SELF_ID);
    const target = this.cardTarget(m, kind);
    const p = api.lines({
      kind, moment: { ruleId: m.ruleId, headline: m.headline, fact: m.fact, ballText: this.match.balls[m.ballSeq].text },
      player: m.playerId ? { name: this.P.get(m.playerId)!.name, story: this.P.get(m.playerId)!.story } : undefined,
      speaker: { name: 'You', team: this.member(SELF_ID).loyalty.teamId }, target: this.person(target),
      matchState: this.matchState(m.ballSeq),
    }).then((r) => { const lines = r?.lines?.length ? r.lines : null; this.cardDone.set(m.id, lines); return lines; });
    this.cardReq.set(m.id, p);
  }
  private cardTarget(m: Moment, kind: CardState['kind']): ID | undefined {
    if (kind === 'tease') return m.victimId;
    const teaser = (this.beatsBySeq.get(m.ballSeq) ?? []).find((b) => b.targetId === SELF_ID)?.friendId;
    if (kind === 'comeback') return teaser ?? FRIENDS[0].id;
    const r1 = this.plan.moments.find((x) => x.ballSeq === m.ballSeq && x.ruleId === 'R1' && x.victimId !== SELF_ID)?.victimId;
    return r1 ?? teaser ?? FRIENDS[0].id;
  }

  // ───────────────────────── ball events
  private onRevealed(seq: number) {
    const ball = this.match.balls[seq];
    const st = room();
    const away = !!st.away?.active;
    const p: Parameters<typeof patch>[0] = { playhead: Math.max(st.playhead, seq) };
    if (st.card && st.card.moment.ballSeq < seq) p.card = undefined;               // AC-B-4: card disappears at the next ball
    if (st.callOffer && seq >= st.callOffer.beforeSeq + 6) p.callOffer = undefined;
    if (ball.wicket) p.wicketAt = { seq, at: Date.now() };
    patch(p);
    if (!away && this.source instanceof ScoreboardSource) audio.swell(ball.wicket || ball.runsBat === 6 ? 2 : ball.runsBat === 4 ? 1 : 0);
    if (ball.wicket && !away) try { navigator.vibrate?.(60); } catch { /* optional */ }

    // ball-pinned delivery: anything anchored ≤ this ball is now visible (F-SYNC)
    for (const it of this.delivery.release(seq)) this.deliver(it, !away);
    if (this.mode === 'rewatch') { if (seq === this.match.balls.length - 1) void this.onEnded(); return; }

    const card = this.cardsBySeq.get(seq);
    if (card && !away) this.showCard(card);

    const offer = this.plan.callOffers.find((c) => c.beforeSeq === seq + 1);
    if (offer && !away) this.offerCall(offer);
    this.updateCalls(seq);

    if (this.plan.nudges.some((n) => n.seq === seq) && !away) patch({ nudge: true });
    this.maybeOfferNext(seq);

    for (const [i, b] of (this.beatsBySeq.get(seq) ?? []).entries()) void this.playBeat(b, seq, i);

    // stepped away with no scripted call-back ahead: call them back on the next wicket
    if (away && this.awaitCallback && ball.wicket && !room().away?.calledBack) {
      this.awaitCallback = false;
      const caller = FRIENDS[0];
      this.raiseCallback(caller.id, beatTemplate('callback', seq, {}), seq);
    }
    if (seq === this.match.balls.length - 1) void this.onEnded();
  }

  private async playBeat(b: Beat, seq: number, i: number) {
    const isCallback = b.intent === 'callback';
    const away = room().away;
    if (isCallback && !away?.active) return;     // a call-back only makes sense if you stepped away
    const r = await this.resolveBeat(b);
    if (isCallback) this.raiseCallback(b.friendId, r.text, seq);
    const nowAway = !!room().away?.active;
    const item: FeedItem = {
      id: `beat-${b.id}`, memberId: b.friendId, kind: r.audio ? 'clip' : 'text', anchorSeq: seq, sentAt: Date.now() + i,
      text: r.text, transcriptStatus: 'ok', source: r.source, momentId: b.momentId, targetId: b.targetId, intent: b.intent,
      audioKey: r.audio ? `beat-${b.id}` : undefined, unheard: nowAway && !isCallback,
    };
    if (r.audio) { this.audioSrc.set(item.audioKey!, r.audio); if (r.audio instanceof Blob) void storage.putBlob(item.audioKey!, r.audio); }
    this.deliver(item, isCallback || !nowAway);
  }

  private raiseCallback(friendId: ID, text: string, seq: number) {
    const a = room().away; if (!a?.active) return;
    patch({ away: { ...a, skipping: false, calledBack: { friendId, text } } });
    this.catchupReq = { from: a.startSeq, to: seq, p: this.requestCatchup(a.startSeq, seq, 10_000) };
    if (typeof Notification !== 'undefined' && document.hidden && Notification.permission === 'granted') {
      try { new Notification(`${this.member(friendId).name} is calling you back`, { body: text }); } catch { /* optional */ }
    }
  }

  /** Seek forward past several balls: nothing bursts out. Skipped gang lines land as "while you were away" items. */
  private onSkip(from: number, to: number) {
    const away = !!room().away?.active;
    const skipped: FeedItem[] = [];
    for (let s = from + 1; s < to; s++) {
      for (const [i, b] of (this.beatsBySeq.get(s) ?? []).entries()) {
        if (b.intent === 'callback' || b.intent === 'nudge_away' || b.intent === 'setup') continue;
        const r = this.quickLine(b);
        const it: FeedItem = { id: `beat-${b.id}`, memberId: b.friendId, kind: r.audio ? 'clip' : 'text', anchorSeq: s, sentAt: Date.now() + i,
          text: r.text, transcriptStatus: 'ok', source: r.source, momentId: b.momentId, targetId: b.targetId, intent: b.intent,
          audioKey: r.audio ? `beat-${b.id}` : undefined, unheard: true };
        if (r.audio) this.audioSrc.set(it.audioKey!, r.audio);
        skipped.push(it);
      }
    }
    for (const it of this.delivery.release(to - 1)) skipped.push({ ...it, unheard: true });
    const wk = awayEvents(this.match, from, to - 1).filter((e) => e.wicketOf).map((e) => e.wicketOf!);
    const fresh = skipped.filter((it) => !room().feed.some((f) => f.id === it.id));
    const marker: FeedItem[] = away ? [] : [{ id: `skip-${from}-${to}`, memberId: SELF_ID, kind: 'skip', anchorSeq: to - 1, sentAt: Date.now(),
      text: `Skipped ${this.match.balls[Math.min(from + 1, to - 1)].label} to ${this.match.balls[to - 1].label}. ${this.scoreText(to - 1)}${wk.length ? `. Wickets: ${wk.join(', ')}` : ''}.`,
      source: 'template' }];
    patch({ feed: [...room().feed, ...fresh, ...marker], playhead: Math.max(room().playhead, to - 1) });
    this.updateCalls(to - 1);
    this.onRevealed(to);
  }

  /** A line right now, without waiting: live if already done, else precomputed, else template. */
  private quickLine(b: Beat): { text: string; audio?: Blob | string; source: FeedItem['source'] } {
    const live = this.beatDone.get(b.id);
    if (live) return { text: live.text, audio: live.audio ?? undefined, source: 'live' };
    const pre = precomputed.beats[b.id];
    if (pre) return { text: pre.text, audio: pre.audio, source: 'precomputed' };
    const target = b.targetId ? (b.targetId === SELF_ID ? 'bro' : this.member(b.targetId).name) : '';
    return { text: beatTemplate(b.intent, b.seq, { target }), source: 'template' };
  }
  private async resolveBeat(b: Beat): Promise<{ text: string; audio?: Blob | string; source: FeedItem['source'] }> {
    if (!this.beatReq.has(b.id) && this.mode === 'live') this.requestWindow([b], []);
    // the chapter-opening line has nothing else to wait for, so it can wait a little longer for live AI
    if (!this.beatDone.has(b.id)) await withTimeout(this.beatReq.get(b.id), b.intent === 'setup' ? 5_000 : LATE_LINE_MS);
    return this.quickLine(b);
  }

  /** Put an item in the feed and, if it has audio and the user is present, queue it. */
  private deliver(item: FeedItem, play = true) {
    if (!room().feed.some((f) => f.id === item.id)) this.push(item);
    const src = item.audioKey ? this.audioSrc.get(item.audioKey) : undefined;
    if (src && play && item.memberId !== SELF_ID) {
      audio.enqueue({ id: item.memberId, src, onEnd: () => this.update(item.id, { unheard: false }) });
    }
    if (item.memberId !== SELF_ID) this.lastSpeaker = item.memberId;
  }

  private showCard(m: Moment) {
    const kind = cardKind(m, SELF_ID);
    const targetId = this.cardTarget(m, kind);
    const done = this.cardDone.get(m.id);
    const pre = precomputed.cards[`${m.id}|${kind}`];
    let lines: string[]; let source: LineSource;
    if (done) { lines = done; source = 'live'; }
    else if (pre?.length) { lines = pre; source = 'precomputed'; }
    else {
      const b = this.match.balls[m.ballSeq];
      const runs = b.wicket ? this.plan.snaps[m.ballSeq].batters[b.wicket.playerOutId]?.runs : this.plan.snaps[m.ballSeq].overRuns;
      lines = cardTemplate(kind, m.ruleId, { target: targetId ? this.member(targetId).name : 'everyone', player: this.pname(m.playerId), runs });
      source = 'template';
    }
    patch({ card: { moment: m, kind, lines, idx: 0, source, targetId } });
    setTimeout(() => { const c = room().card; if (c?.moment.id === m.id && c.usedIdx === undefined) patch({ card: undefined }); }, CARD_TTL_MS);
    // live lines arriving late (still before the next ball) replace the fallback
    if (source !== 'live') void withTimeout(this.cardReq.get(m.id), 4_000).then((l) => {
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
    if (card && opts.fromLine !== undefined) patch({ card: { ...card, usedIdx: opts.fromLine } });
    void this.replyTo(t);
  }
  sendCardLine() { const c = room().card; if (c && c.usedIdx === undefined) this.sendText(c.lines[c.idx], { fromLine: c.idx }); }
  react(emoji: string) {
    this.push({ id: uid(), memberId: SELF_ID, kind: 'reaction', anchorSeq: this.anchorNow(), sentAt: Date.now(), emoji, source: 'user' });
  }
  async sendClip(blob: Blob, durationMs: number) {
    const id = uid();
    const card = room().card;
    this.audioSrc.set(id, blob); void storage.putBlob(id, blob);
    this.push({ id, memberId: SELF_ID, kind: 'clip', anchorSeq: this.anchorNow(), sentAt: Date.now(), audioKey: id, durationMs, transcriptStatus: 'pending', source: 'user', targetId: card?.targetId });
    const text = await api.transcribe(blob);
    this.update(id, text ? { text, transcriptStatus: 'ok' } : { transcriptStatus: 'failed' });
    if (text) void this.replyTo(text);
  }
  playItem(item: FeedItem) {
    const src = item.audioKey ? this.audioSrc.get(item.audioKey) : undefined;
    if (src) audio.enqueue({ id: item.memberId, src, onEnd: () => this.update(item.id, { unheard: false }) });
  }

  /** A friend answers the user live (Gemini text → Sarvam voice), pinned to the user's current ball. */
  private async replyTo(said: string) {
    if (room().away?.active || this.mode !== 'live' || room().status !== 'live') return;
    if (Date.now() - this.lastReplyAt < 5_000) return;
    this.lastReplyAt = Date.now();
    const card = room().card;
    const named = FRIENDS.find((f) => new RegExp(`\\b${f.name}\\b`, 'i').test(said));
    const friendId = (card?.targetId && card.targetId !== SELF_ID ? card.targetId : undefined) ?? named?.id ?? this.lastSpeaker ?? FRIENDS[0].id;
    const anchor = this.anchorNow();
    const r = await api.reply(friendId, said, this.matchState(anchor), card?.moment.headline);
    const text = r?.line ?? beatTemplate('reply', Date.now(), {});
    const blob = r?.line ? await api.speak(text, this.member(friendId).speaker!) : null;
    const item: FeedItem = { id: uid(), memberId: friendId, kind: blob ? 'clip' : 'text', anchorSeq: anchor, sentAt: Date.now(), text, transcriptStatus: 'ok', source: r ? 'live' : 'template', targetId: SELF_ID, intent: 'reply', audioKey: blob ? `reply-${uid()}` : undefined };
    if (blob) { this.audioSrc.set(item.audioKey!, blob); void storage.putBlob(item.audioKey!, blob); }
    this.delivery.add(item);
    for (const it of this.delivery.release(room().playhead)) this.deliver(it);
  }

  // ───────────────────────── Gang Calls
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
    if (room().calls.some((c) => c.memberId === SELF_ID && c.innings === o.innings && c.over === o.over)) return;
    patch({ calls: [...room().calls, { id: uid(), memberId: SELF_ID, type, innings: o.innings, over: o.over, status: 'open' }] });
  }
  /** Calls are won the moment the event happens, lost when the over ends without it. */
  private updateCalls(seq: number) {
    const before = room().calls;
    const open = before.filter((c) => c.status === 'open');
    if (!open.length) return;
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
      void withTimeout(this.cardReq.get(m.id), 2_500).then(() => { if (room().playhead === seq) this.showCard(m); });
    } else if (mine?.status === 'lost') {
      const w = room().calls.find((c) => c.memberId !== SELF_ID && c.status === 'won' && c.over === mine.over && c.innings === mine.innings);
      if (w) void this.liveBeat(w.memberId, 'call_brag', `${this.member(w.memberId).name} predicted "${CALL_LABEL[w.type]}" correctly; the user called "${CALL_LABEL[mine.type]}" and was wrong.`, SELF_ID);
    }
  }
  /** One-off friend line generated live outside the plan (e.g. call results). */
  private async liveBeat(friendId: ID, intent: Intent, fact: string, targetId?: ID) {
    const seq = room().playhead;
    const id = `${seq}-${friendId}-${intent}-${uid()}`;
    const r = await api.react([{ id, friendId, intent, fact, target: this.person(targetId) }], this.matchState(seq), 6_000);
    const text = r?.lines[id] ?? beatTemplate(intent, seq, {});
    const blob = r?.lines[id] ? await api.speak(text, this.member(friendId).speaker!) : null;
    const item: FeedItem = { id, memberId: friendId, kind: blob ? 'clip' : 'text', anchorSeq: seq, sentAt: Date.now(), text, transcriptStatus: 'ok', source: r ? 'live' : 'template', targetId, intent, audioKey: blob ? id : undefined };
    if (blob) { this.audioSrc.set(id, blob); void storage.putBlob(id, blob); }
    this.deliver(item, !room().away?.active);
  }

  // ───────────────────────── step away / call-back / catch-up
  /** Step away. Demo time-skip: the video jumps to just before the next call-back point (labelled in the UI). */
  stepAway() {
    if (room().away?.active || room().status !== 'live') return;
    const from = room().playhead;
    const next = this.plan.callbacks.find((c) => c.seq > from + 1);
    patch({ away: { active: true, startSeq: from, skipping: !!next }, nudge: false, card: undefined, callOffer: undefined, upNext: undefined });
    audio.clear();
    this.awaitCallback = !next;
    if (next) {
      const t = this.timeline.timeOf(next.seq) - CALLBACK_LEAD_S;
      this.prefetch(t, true);
      setTimeout(() => { if (room().away?.active) this.source?.seekTo(t); }, 1_400);
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') { try { void Notification.requestPermission(); } catch { /* optional */ } }
  }
  private catchupReq?: { from: number; to: number; p: Promise<{ text: string; source: 'live' | 'fallback' }> };
  private requestCatchup(from: number, to: number, timeoutMs: number) {
    const said = room().feed.filter((f) => f.anchorSeq > from && f.anchorSeq <= to && f.text && f.memberId !== SELF_ID && f.kind !== 'skip')
      .slice(-12).map((f) => ({ who: this.member(f.memberId).name, text: f.text! }));
    const events = awayEvents(this.match, from, to).map((e) => ({ seq: e.seq, text: e.text }));
    events.unshift({ seq: from, text: `When you left: ${this.scoreText(Math.max(0, from))}` });
    events.push({ seq: to, text: `Now: ${this.scoreText(to)}` });
    return api.catchup({ events: events.slice(-60), said, self: 'You', maxWords: 55 }, timeoutMs).then((r) => (r?.summary
      ? { text: ensureWickets(r.summary, this.match, from, to), source: 'live' as const }
      : { text: fallbackCatchup(this.match, from, to, this.scoreText), source: 'fallback' as const }));
  }
  async comeBack() {
    const a = room().away; if (!a?.active) return;
    const from = a.startSeq, to = room().playhead;
    this.awaitCallback = false;
    const missed = room().feed.filter((f) => f.unheard).map((f) => f.id);
    patch({ away: undefined, catchup: { text: '', source: 'loading', fromSeq: from, toSeq: to, missed } });
    const pre = this.catchupReq && this.catchupReq.from === from && this.catchupReq.to === to ? this.catchupReq.p : undefined;
    this.catchupReq = undefined;
    // AC-CATCH-3: shown within 3 s of return, else the deterministic fallback
    const req = pre ?? this.requestCatchup(from, to, 8_000);
    const res = await withTimeout(req, 3_000) ?? { text: fallbackCatchup(this.match, from, to, this.scoreText), source: 'fallback' as const };
    if (room().catchup?.fromSeq === from) patch({ catchup: { ...room().catchup!, text: res.text, source: res.source } });
    if (res.source === 'fallback') void req.then((late) => {
      const c = room().catchup;
      if (late.source === 'live' && c && c.fromSeq === from && c.source === 'fallback') patch({ catchup: { ...c, text: late.text, source: 'live' } });
    });
  }
  dismissCatchup() { patch({ catchup: undefined }); }

  // ───────────────────────── end → wrap → memory
  /** End the room now (match over, or the reviewer taps "Finish"). */
  finish() { void this.onEnded(); }
  private async onEnded() {
    if (this.ended) return;
    this.ended = true;
    clearInterval(this.loop);
    if (this.mode === 'rewatch') { this.source?.pause(); patch({ status: 'ended', screen: 'shelf', mode: 'live' }); return; }
    const t0 = Date.now();
    while (audio.busy && Date.now() - t0 < 8_000) await new Promise((r) => setTimeout(r, 200));
    this.source?.pause();
    patch({ status: 'ended', card: undefined, callOffer: undefined, catchup: undefined, away: undefined });
    const st = room();
    const stats = computeStats(this.members, this.plan.moments.filter((m) => m.ballSeq <= st.playhead), st.feed, st.calls, SELF_ID);
    const highlights = st.feed.filter((f) => f.text && f.kind !== 'reaction' && f.kind !== 'skip').slice(-50)
      .map((f) => ({ itemId: f.id, who: f.memberId === SELF_ID ? 'You' : this.member(f.memberId).name, text: f.text!.slice(0, 200), seq: f.anchorSeq }));
    const moments = this.plan.moments.filter((m) => m.ruleId !== 'R7' && m.ballSeq <= st.playhead).slice(0, 30).map((m) => ({ seq: m.ballSeq, text: m.headline }));
    patch({ screen: 'wrap', wrap: undefined });
    const ai = await api.wrap({
      match: this.match.title, result: st.playhead >= this.match.balls.length - 1 ? this.match.result : `Stopped at ${this.scoreText(st.playhead)}`,
      stats: { mostRoasted: stats.mostRoasted ? this.member(stats.mostRoasted.memberId).name : undefined, counts: stats.clips },
      moments, highlights,
    }, 7_000);
    const clipIds = st.feed.filter((f) => f.kind === 'clip' && f.audioKey && this.audioSrc.has(f.audioKey));
    const fallbackReel = [...clipIds].sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0)).slice(0, 3).sort((a, b) => a.anchorSeq - b.anchorSeq).map((f) => f.id);
    const roastFallback = st.feed.find((f) => f.intent === 'tease' && f.text);
    const loudest = this.plan.moments.find((m) => m.severity === 3 && m.ruleId !== 'R7' && m.ballSeq <= st.playhead);
    const roasted = stats.mostRoasted ? (stats.mostRoasted.memberId === SELF_ID ? 'You' : this.member(stats.mostRoasted.memberId).name) : undefined;
    const valid = (ids: string[]) => ids.filter((id) => clipIds.some((c) => c.id === id));
    const wrap: WrapState = ai ? {
      title: ai.title, source: 'live', roast: ai.roastOfTheNight, high: ai.high, low: ai.low,
      reel: valid(ai.reel).length ? valid(ai.reel) : fallbackReel, stats,
    } : {
      title: roasted ? `${roasted} took the most stick tonight` : 'The gang watched it together', source: 'fallback',
      roast: roastFallback ? { itemId: roastFallback.id, title: 'Roast of the night' } : undefined,
      high: loudest ? { seq: loudest.ballSeq, caption: 'The loudest the gang got' } : undefined,
      reel: fallbackReel, stats,
    };
    patch({ wrap });
    await this.saveMemory(wrap);
  }

  private async saveMemory(wrap: WrapState) {
    const st = room();
    const saved: SavedRoom = {
      id: this.roomId, matchId: this.match.id, title: this.match.shortTitle, date: this.match.date, endedAt: Date.now(), result: this.match.result,
      loyalty: this.member(SELF_ID).loyalty, feed: st.feed, calls: st.calls, wrap,
    };
    const ok = await storage.putRoom(saved);
    await storage.clearLive();
    if (!ok) { patch({ storageOk: false }); this.toast("This browser can't save memories, so this match won't be on the shelf after reload."); }
    await refreshShelf();
  }

  private async persistLive() {
    const st = room();
    if (st.status !== 'live' || this.mode !== 'live' || !this.source) return;
    const snap: LiveSnapshot = { roomId: this.roomId, videoTime: this.source.getCurrentTime(), maxRevealed: this.tracker.maxRevealed, loyalty: this.member(SELF_ID).loyalty, feed: st.feed, calls: st.calls, label: this.scoreText(Math.max(0, st.playhead)) };
    await storage.putLive(snap);
  }

  /** Rewatch: preload saved items so they play at their anchored balls. */
  loadForRewatch(items: FeedItem[], sources: Map<string, Blob | string>) {
    sources.forEach((v, k) => this.audioSrc.set(k, v));
    for (const it of items) if (it.kind !== 'reaction' && it.kind !== 'skip') this.delivery.add({ ...it, unheard: false });
  }
  /** Resume: restore feed without replaying it. */
  restore(feed: FeedItem[], calls: GangCall[], sources: Map<string, Blob | string>) {
    sources.forEach((v, k) => this.audioSrc.set(k, v));
    patch({ feed, calls });
  }
}

export async function refreshShelf() {
  const rooms = await storage.listRooms<SavedRoom>();
  const memories: MemorySummary[] = rooms.sort((a, b) => b.endedAt - a.endedAt).map((r) => ({
    id: r.id, title: r.title, date: r.date, endedAt: r.endedAt, result: r.result, cover: r.wrap?.title ?? r.result, loyalty: r.loyalty,
  }));
  patch({ memories });
}

export async function loadSources(feed: FeedItem[]): Promise<Map<string, Blob | string>> {
  const m = new Map<string, Blob | string>();
  await Promise.all(feed.filter((f) => f.audioKey).map(async (f) => {
    const b = await storage.getBlob(f.audioKey!);
    if (b) m.set(f.audioKey!, b);
    else if (f.id.startsWith('beat-')) { const pre = precomputed.beats[f.id.slice(5)]; if (pre?.audio) m.set(f.audioKey!, pre.audio); }
  }));
  return m;
}

export let engine: RoomEngine | undefined;
export function setEngine(e?: RoomEngine) { engine?.stop(); engine = e; }
export const SELF = SELF_ID;
