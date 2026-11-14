// Room engine: wires the pure core (clock, rules, director, sync) to side effects (AI, audio, storage) and the store.
import type { FeedItem, GangCall, Match, Member, Moment, CallType, ID } from '../core/types';
import { buildPlan, type RoomPlan } from '../core/plan';
import { ReplayClock } from '../core/replay/clock';
import { DeliveryQueue, anchorFor } from '../core/sync/delivery';
import { endsOver } from '../core/replay/scoreboard';
import { cardKind } from '../core/moments/rules';
import type { Beat, Intent } from '../core/friends/director';
import { resolveCall, friendCall, CALL_LABEL } from '../core/calls';
import { computeStats, awayEvents, fallbackCatchup, ensureWickets } from '../core/wrapStats/stats';
import { FRIENDS, SELF_ID } from '../content/gang';
import { cardTemplate, beatTemplate } from '../content/templates';
import { api, type PersonDTO } from './api/client';
import { audio } from './audio/engine';
import { storage } from './storage/db';
import { patch, room, type CardState, type LineSource, type WrapState, type MemorySummary } from '../store/room';

const uid = () => Math.random().toString(36).slice(2, 10);
const withTimeout = <T,>(p: Promise<T> | undefined, ms: number): Promise<T | undefined> =>
  p ? Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]) : Promise.resolve(undefined);

export interface Precomputed {
  beats: Record<string, { text: string; audio?: string }>;
  cards: Record<string, string[]>;
}
let precomputed: Precomputed = { beats: {}, cards: {} };
export async function loadPrecomputed() {
  try { const r = await fetch('/data/precomputed.json'); if (r.ok) precomputed = await r.json(); } catch { /* safety net optional */ }
}

export interface SavedRoom {
  id: string; matchId: string; title: string; date: string; endedAt: number; result: string;
  loyalty: Member['loyalty']; feed: FeedItem[]; calls: GangCall[]; wrap?: WrapState;
}

const LOOKAHEAD_MS = 60_000;
const URGENT_MS = 20_000;
const BEAT_WAIT_MS = 3_500;
const AWAY_SPEED = 4;

export class RoomEngine {
  plan: RoomPlan;
  clock: ReplayClock;
  private loop?: ReturnType<typeof setInterval>;
  private delivery = new DeliveryQueue<FeedItem>();
  private beatReq = new Map<string, Promise<{ text: string; audio: Blob | null } | null>>();
  private cardReq = new Map<string, Promise<string[] | null>>();
  private cardDone = new Map<string, string[] | null>();
  readonly audioSrc = new Map<string, Blob | string>();
  private lastReplyAt = 0;
  private lastSpeaker?: ID;
  private P: Map<string, Match['players'][number]>;
  private beatsBySeq = new Map<number, Beat[]>();
  private cardsBySeq = new Map<number, Moment>();

  constructor(public match: Match, public members: Member[], public mode: 'live' | 'rewatch' = 'live', startAt = 0, public roomId = uid()) {
    this.plan = buildPlan(match, members, SELF_ID);
    this.P = new Map(match.players.map((p) => [p.id, p]));
    for (const b of this.plan.beats) this.beatsBySeq.set(b.seq, [...(this.beatsBySeq.get(b.seq) ?? []), b]);
    for (const c of this.plan.cards) this.cardsBySeq.set(c.ballSeq, c);
    this.clock = new ReplayClock(this.plan.durations, {
      ballStarted: (s) => this.onStarted(s),
      ballRevealed: (s) => void this.onRevealed(s),
      ended: () => void this.onEnded(),
    }, startAt);
    const speed = Number(new URLSearchParams(location.search).get('speed'));
    if (speed > 0 && speed <= 20) this.baseSpeed = speed; // hidden debug control (spec F-REPLAY)
    this.clock.speed = this.baseSpeed;
  }
  private baseSpeed = 1;

  // ───────────────────────── lifecycle
  start() {
    audio.unlock();
    patch({ plan: this.plan, status: 'live', paused: false, roomId: this.roomId });
    this.clock.play(performance.now());
    this.loop = setInterval(() => this.clock.tick(performance.now()), 60);
    if (this.mode === 'live') this.prefetch();
  }
  stop() { clearInterval(this.loop); this.clock.pause(); audio.clear(); }
  togglePause() {
    if (this.clock.paused) { this.clock.play(performance.now()); patch({ paused: false }); }
    else { this.clock.pause(); patch({ paused: true }); }
  }

  // ───────────────────────── helpers
  member = (id: ID) => this.members.find((m) => m.id === id)!;
  pname = (id?: ID) => (id ? this.P.get(id)?.short ?? id : '');
  team = (id: ID) => this.match.teams.find((t) => t.id === id)!;
  matchState(seq: number): string {
    const s = this.plan.snaps[Math.max(0, seq)];
    const bat = this.team(s.innings === 1 ? this.match.battingFirst : this.match.chasing).short;
    const base = `${bat} ${s.runs}/${s.wickets} after ${s.overs} overs`;
    return s.innings === 2 ? `${base}, need ${s.need} off ${s.ballsLeft} (target ${this.match.target})` : `${base}, batting first`;
  }
  scoreText = (seq: number) => { const s = this.plan.snaps[seq]; return `${this.team(s.innings === 1 ? this.match.battingFirst : this.match.chasing).short} ${s.runs}/${s.wickets} (${s.overs})`; };
  person(id?: ID): PersonDTO | undefined {
    if (!id) return undefined;
    const m = this.member(id);
    return { name: m.isSelf ? 'you' : m.name, team: m.loyalty.teamId, hero: this.P.get(m.loyalty.heroId ?? '')?.name, isUser: m.isSelf || undefined };
  }
  private push(item: FeedItem) { patch({ feed: [...room().feed, item] }); }
  private update(id: string, p: Partial<FeedItem>) { patch({ feed: room().feed.map((f) => (f.id === id ? { ...f, ...p } : f)) }); }
  private toast(text: string) { patch({ toast: { text, at: Date.now() } }); }

  // ───────────────────────── look-ahead prefetch (live AI before the ball arrives)
  // One Gemini call covers every friend line and user card in the next window (free tier = 5 RPM per model).
  private lastBatchAt = 0;
  private prefetch() {
    let t = 0; let urgent = false;
    const beats: Beat[] = []; const cards: Moment[] = [];
    for (let s = Math.max(0, this.clock.slot); s < this.plan.durations.length && t < LOOKAHEAD_MS; s++) {
      t += this.plan.durations[s] / (this.clock.speed || 1);
      const near = t < URGENT_MS;
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
    const dto = beats.map((b) => ({
      id: b.id, friendId: b.friendId, intent: b.intent, fact: this.beatFact(b), target: this.person(b.targetId), ballText: this.match.balls[b.seq].text,
    }));
    const cdto = cards.map((m) => this.cardDTO(m));
    const batch = api.react(dto, this.matchState(firstSeq - 1), 13_000, cdto, this.member(SELF_ID).loyalty.teamId);
    for (const b of beats) {
      this.beatReq.set(b.id, batch.then(async (r) => {
        const text = r?.lines?.[b.id];
        if (!text) return null;
        const blob = await api.speak(text, this.member(b.friendId).speaker!);
        return { text, audio: blob };
      }));
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
  private requestBeats(beats: Beat[]) { this.requestWindow(beats, []); }
  private beatFact(b: Beat) {
    if (b.intent === 'callback') { const s = this.plan.snaps[b.seq]; return `${b.fact} Chasing side needs ${s.need} off ${s.ballsLeft}.`; }
    return b.fact;
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
    const teaser = (this.beatsBySeq.get(m.ballSeq) ?? []).find((b) => b.targetId === SELF_ID || b.intent === 'lament')?.friendId;
    if (kind === 'comeback') return teaser ?? FRIENDS.find((f) => f.loyalty.teamId !== this.member(SELF_ID).loyalty.teamId)?.id;
    const r1 = this.plan.moments.find((x) => x.ballSeq === m.ballSeq && x.ruleId === 'R1' && x.victimId !== SELF_ID)?.victimId;
    return r1 ?? FRIENDS.find((f) => f.loyalty.teamId !== this.member(SELF_ID).loyalty.teamId)?.id;
  }

  // ───────────────────────── clock events
  private onStarted(seq: number) {
    const st = room();
    const p: Parameters<typeof patch>[0] = { slot: seq };
    if (st.card && st.card.moment.ballSeq < seq) p.card = undefined; // AC-B-4: card disappears at next ball
    if (st.callOffer && seq >= st.callOffer.beforeSeq) p.callOffer = undefined;
    if (st.nudge && seq > this.plan.nudgeSeq + 18) p.nudge = false;
    patch(p);
  }

  private async onRevealed(seq: number) {
    const ball = this.match.balls[seq];
    patch({ playhead: seq, revealAt: Date.now() });
    const away = room().away?.active;
    if (!away) audio.swell(ball.wicket || ball.runsBat === 6 ? 2 : ball.runsBat === 4 ? 1 : 0);

    // ball-pinned delivery: anything anchored ≤ playhead is now visible (F-SYNC)
    for (const it of this.delivery.release(seq)) this.deliver(it);
    if (this.mode === 'rewatch') return;

    // moment card for the user (not while away — it becomes part of the catch-up)
    const card = this.cardsBySeq.get(seq);
    if (card && !away) this.showCard(card);

    // Gang Calls: offer before the over; resolve at its end
    const offer = this.plan.callOffers.find((c) => c.beforeSeq === seq + 1);
    if (offer && !away) this.offerCall(offer);
    if (endsOver(this.match, seq)) this.resolveCalls(ball.innings, ball.over);

    if (seq === this.plan.nudgeSeq && !away) patch({ nudge: true });

    // friends' lines at this ball
    const beats = this.beatsBySeq.get(seq) ?? [];
    if (beats.length) {
      const key = `beats-${seq}`;
      this.clock.hold(key, performance.now(), BEAT_WAIT_MS);
      const resolved = await Promise.all(beats.map((b) => this.resolveBeat(b)));
      this.clock.release(key);
      for (const [i, b] of beats.entries()) {
        const r = resolved[i];
        const isCallback = b.intent === 'callback';
        if (isCallback && room().away?.active) {
          patch({ away: { ...room().away!, calledBack: { friendId: b.friendId, text: r.text } } });
          this.clock.hold('callback', performance.now(), 45_000); // wait for the user to come back
          // the away window is now fixed (clock is held) → start writing the catch-up before they return
          this.catchupReq = { from: room().away!.startSeq, to: seq, p: this.requestCatchup(room().away!.startSeq, seq, 10_000) };
          if (typeof Notification !== 'undefined' && document.hidden && Notification.permission === 'granted') {
            try { new Notification(`${this.member(b.friendId).name} is calling you back`, { body: r.text }); } catch { /* optional */ }
          }
        }
        const item: FeedItem = {
          id: `beat-${b.id}`, memberId: b.friendId, kind: r.audio ? 'clip' : 'text', anchorSeq: seq, sentAt: Date.now() + i,
          text: r.text, transcriptStatus: 'ok', source: r.source, momentId: b.momentId, targetId: b.targetId, intent: b.intent,
          audioKey: r.audio ? `beat-${b.id}` : undefined, unheard: !!room().away?.active && !isCallback,
        };
        if (r.audio) { this.audioSrc.set(item.audioKey!, r.audio); if (r.audio instanceof Blob) void storage.putBlob(item.audioKey!, r.audio); }
        this.deliver(item, isCallback || !room().away?.active);
      }
    }

    if (this.mode === 'live') this.prefetch();
    if (seq % 6 === 0) void this.persistLive();
  }

  private async resolveBeat(b: Beat): Promise<{ text: string; audio?: Blob | string; source: FeedItem['source'] }> {
    if (!this.beatReq.has(b.id)) this.requestBeats([b]);
    const live = await withTimeout(this.beatReq.get(b.id), BEAT_WAIT_MS);
    if (live) return { text: live.text, audio: live.audio ?? undefined, source: 'live' };
    const pre = precomputed.beats[b.id];
    if (pre) return { text: pre.text, audio: pre.audio, source: 'precomputed' };
    const s = this.plan.snaps[b.seq];
    const text = beatTemplate(b.intent, b.seq, { target: b.targetId ? this.member(b.targetId).name : '', need: s.need, balls: s.ballsLeft });
    return { text, source: 'template' };
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
    patch({ card: { moment: m, kind, lines, source, targetId } });
    // live lines arriving late (still before the next ball) replace the fallback
    if (source !== 'live') void withTimeout(this.cardReq.get(m.id), 2_000).then((l) => {
      const c = room().card;
      if (l?.length && c?.moment.id === m.id && c.usedIdx === undefined) patch({ card: { ...c, lines: l, source: 'live' } });
    });
  }

  // ───────────────────────── user actions
  sendText(text: string, opts: { fromLine?: number } = {}) {
    const t = text.trim().slice(0, 140);
    if (!t) return;
    const card = room().card;
    const item: FeedItem = { id: uid(), memberId: SELF_ID, kind: 'text', anchorSeq: anchorFor(room().playhead), sentAt: Date.now(), text: t, source: 'user', targetId: card?.targetId, momentId: opts.fromLine !== undefined ? card?.moment.id : undefined };
    this.push(item);
    if (card && opts.fromLine !== undefined) patch({ card: { ...card, usedIdx: opts.fromLine } });
    void this.replyTo(t);
  }
  react(emoji: string) {
    this.push({ id: uid(), memberId: SELF_ID, kind: 'reaction', anchorSeq: anchorFor(room().playhead), sentAt: Date.now(), emoji, source: 'user' });
  }
  async sendClip(blob: Blob, durationMs: number) {
    const id = uid();
    const card = room().card;
    this.audioSrc.set(id, blob); void storage.putBlob(id, blob);
    this.push({ id, memberId: SELF_ID, kind: 'clip', anchorSeq: anchorFor(room().playhead), sentAt: Date.now(), audioKey: id, durationMs, transcriptStatus: 'pending', source: 'user', targetId: card?.targetId });
    const text = await api.transcribe(blob);
    this.update(id, text ? { text, transcriptStatus: 'ok' } : { transcriptStatus: 'failed' });
    if (text) void this.replyTo(text);
  }
  playItem(item: FeedItem) {
    const src = item.audioKey ? this.audioSrc.get(item.audioKey) : undefined;
    if (src) audio.enqueue({ id: item.memberId, src, onEnd: () => this.update(item.id, { unheard: false }) });
  }

  /** A friend answers the user live (Gemini text → Sarvam voice). */
  private async replyTo(said: string) {
    if (room().away?.active || this.mode !== 'live' || room().status !== 'live') return;
    if (Date.now() - this.lastReplyAt < 5_000) return;
    this.lastReplyAt = Date.now();
    const card = room().card;
    const named = FRIENDS.find((f) => new RegExp(`\\b${f.name}\\b`, 'i').test(said));
    const friendId = (card?.targetId && card.targetId !== SELF_ID ? card.targetId : undefined) ?? named?.id ?? this.lastSpeaker ?? FRIENDS[0].id;
    const r = await api.reply(friendId, said, this.matchState(room().playhead), card?.moment.headline);
    const text = r?.line ?? beatTemplate('reply', Date.now(), {});
    const blob = r?.line ? await api.speak(text, this.member(friendId).speaker!) : null;
    const item: FeedItem = { id: uid(), memberId: friendId, kind: blob ? 'clip' : 'text', anchorSeq: anchorFor(room().playhead), sentAt: Date.now(), text, transcriptStatus: 'ok', source: r ? 'live' : 'template', targetId: SELF_ID, intent: 'reply', audioKey: blob ? `reply-${uid()}` : undefined };
    if (blob) { this.audioSrc.set(item.audioKey!, blob); void storage.putBlob(item.audioKey!, blob); }
    this.delivery.add(item);
    for (const it of this.delivery.release(room().playhead)) this.deliver(it);
  }

  // ───────────────────────── Gang Calls
  private offerCall(o: RoomPlan['callOffers'][number]) {
    const first = this.match.balls[o.beforeSeq];
    const battingTeam = first.innings === 1 ? this.match.battingFirst : this.match.chasing;
    const friendCalls = FRIENDS.map((f) => ({ memberId: f.id, type: friendCall(f.loyalty.teamId, battingTeam) }));
    const calls = [...room().calls, ...friendCalls.map((c) => ({ id: uid(), memberId: c.memberId, type: c.type, innings: o.innings, over: o.over, status: 'open' as const }))];
    patch({ callOffer: { ...o, bowler: this.pname(first.bowlerId), friendCalls }, calls });
  }
  placeCall(type: CallType) {
    const o = room().callOffer; if (!o) return;
    if (room().calls.some((c) => c.memberId === SELF_ID && c.innings === o.innings && c.over === o.over)) return;
    patch({ calls: [...room().calls, { id: uid(), memberId: SELF_ID, type, innings: o.innings, over: o.over, status: 'open' }] });
  }
  private resolveCalls(innings: 1 | 2, over: number) {
    const open = room().calls.filter((c) => c.status === 'open' && c.innings === innings && c.over === over);
    if (!open.length) return;
    const calls = room().calls.map((c) => (open.some((o) => o.id === c.id) ? { ...c, status: resolveCall(this.match, c) } : c));
    patch({ calls });
    const res = calls.filter((c) => open.some((o) => o.id === c.id));
    const winners = res.filter((c) => c.status === 'won').map((c) => (c.memberId === SELF_ID ? 'You' : this.member(c.memberId).name));
    const mine = res.find((c) => c.memberId === SELF_ID);
    this.toast(winners.length ? `Gang Call: ${winners.join(' & ')} called it right` : 'Gang Call: nobody called that over');
    patch({ callResult: { text: winners.length ? `${winners.join(' & ')} called it` : 'Nobody called it', at: Date.now() } });
    const seq = room().playhead;
    if (mine?.status === 'won' && !this.cardsBySeq.has(seq)) {
      const victim = res.find((c) => c.memberId !== SELF_ID && c.status === 'lost')?.memberId;
      const m: Moment = { id: `call-${innings}-${over}`, ruleId: 'R5', ballSeq: seq, severity: 2, headline: `You called it: ${CALL_LABEL[mine.type].toLowerCase()}`, fact: `The user correctly predicted "${CALL_LABEL[mine.type]}" for this over.`, ownerId: SELF_ID };
      this.requestCard(m); this.cardsBySeq.set(seq, m);
      void withTimeout(this.cardReq.get(m.id), 2_500).then(() => { if (room().playhead === seq && victim) this.showCard({ ...m }); else if (room().playhead === seq) this.showCard(m); });
    } else if (mine?.status === 'lost') {
      const w = res.find((c) => c.memberId !== SELF_ID && c.status === 'won');
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
  stepAway() {
    if (room().away?.active || room().status !== 'live') return;
    patch({ away: { active: true, startSeq: room().playhead }, nudge: false, card: undefined, callOffer: undefined });
    audio.clear();
    this.clock.speed = this.baseSpeed * AWAY_SPEED;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') { try { void Notification.requestPermission(); } catch { /* optional */ } }
  }
  private catchupReq?: { from: number; to: number; p: Promise<{ text: string; source: 'live' | 'fallback' }> };
  private requestCatchup(from: number, to: number, timeoutMs: number) {
    const said = room().feed.filter((f) => f.anchorSeq > from && f.anchorSeq <= to && f.text && f.memberId !== SELF_ID)
      .slice(-12).map((f) => ({ who: this.member(f.memberId).name, text: f.text! }));
    const events = awayEvents(this.match, from, to).map((e) => ({ seq: e.seq, text: e.text }));
    events.unshift({ seq: from, text: `When you left: ${this.scoreText(Math.max(0, from))}` });
    events.push({ seq: to, text: `Now: ${this.scoreText(to)}` });
    return api.catchup({ events: events.slice(-60), said, self: 'You', maxWords: 60 }, timeoutMs).then((r) => (r?.summary
      ? { text: ensureWickets(r.summary, this.match, from, to), source: 'live' as const }
      : { text: fallbackCatchup(this.match, from, to, this.scoreText), source: 'fallback' as const }));
  }
  async comeBack() {
    const a = room().away; if (!a?.active) return;
    this.clock.speed = this.baseSpeed;
    this.clock.release('callback');
    const from = a.startSeq, to = room().playhead;
    const missed = room().feed.filter((f) => f.unheard).length;
    patch({ away: { ...a, active: false }, catchup: { text: '', source: 'loading', fromSeq: from, toSeq: to, missed } });
    this.clock.hold('catchup', performance.now(), 20_000);
    const pre = this.catchupReq && this.catchupReq.from === from && this.catchupReq.to === to ? this.catchupReq.p : undefined;
    this.catchupReq = undefined;
    // AC-CATCH-3: shown within 3 s of return, else the deterministic fallback
    const req = pre ?? this.requestCatchup(from, to, 8_000);
    const res = await withTimeout(req, 3_000)
      ?? { text: fallbackCatchup(this.match, from, to, this.scoreText), source: 'fallback' as const };
    if (room().catchup) patch({ catchup: { text: res.text, source: res.source, fromSeq: from, toSeq: to, missed } });
    // a live summary that lands after the 3 s fallback still replaces it while the card is open
    if (res.source === 'fallback') void req.then((late) => {
      const c = room().catchup;
      if (late.source === 'live' && c && c.fromSeq === from && c.source === 'fallback') patch({ catchup: { ...c, text: late.text, source: 'live' } });
    });
  }
  dismissCatchup() { patch({ catchup: undefined }); this.clock.release('catchup'); }

  // ───────────────────────── end → wrap → memory
  private async onEnded() {
    clearInterval(this.loop);
    if (this.mode === 'rewatch') { patch({ status: 'ended', screen: 'shelf', mode: 'live' }); return; }
    const t0 = Date.now();
    while (audio.busy && Date.now() - t0 < 8_000) await new Promise((r) => setTimeout(r, 200));
    if (room().away?.active) patch({ away: { ...room().away!, active: false } });
    patch({ status: 'ended', card: undefined, callOffer: undefined, catchup: undefined });
    const st = room();
    const stats = computeStats(this.members, this.plan.moments, st.feed, st.calls, SELF_ID);
    const highlights = st.feed.filter((f) => f.text && f.kind !== 'reaction').slice(-50)
      .map((f) => ({ itemId: f.id, who: f.memberId === SELF_ID ? 'You' : this.member(f.memberId).name, text: f.text!.slice(0, 200), seq: f.anchorSeq }));
    const moments = this.plan.moments.filter((m) => m.ruleId !== 'R7').slice(0, 30).map((m) => ({ seq: m.ballSeq, text: m.headline }));
    patch({ screen: 'wrap', wrap: undefined });
    const ai = await api.wrap({
      match: this.match.title, result: this.match.result,
      stats: { mostRoasted: stats.mostRoasted ? this.member(stats.mostRoasted.memberId).name : undefined, counts: stats.clips },
      moments, highlights,
    }, 6_000);
    const clipIds = st.feed.filter((f) => f.kind === 'clip' && f.audioKey && this.audioSrc.has(f.audioKey));
    const fallbackReel = [...clipIds].sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0)).slice(0, 3).sort((a, b) => a.anchorSeq - b.anchorSeq).map((f) => f.id);
    const roastFallback = st.feed.find((f) => f.intent === 'tease' && f.text);
    const wrap: WrapState = ai ? {
      title: ai.title, source: 'live', roast: ai.roastOfTheNight, high: ai.high, low: ai.low,
      reel: ai.reel.filter((id) => clipIds.some((c) => c.id === id)).length ? ai.reel.filter((id) => clipIds.some((c) => c.id === id)) : fallbackReel, stats,
    } : {
      title: `${this.match.result}. What a night.`, source: 'fallback',
      roast: roastFallback ? { itemId: roastFallback.id, title: 'Roast of the night' } : undefined,
      high: this.plan.moments.find((m) => m.severity === 3 && m.ruleId !== 'R7') ? { seq: this.plan.moments.find((m) => m.severity === 3 && m.ruleId !== 'R7')!.ballSeq, caption: 'The loudest the gang got all night' } : undefined,
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
    // friend clips from precomputed assets are URLs (strings); persist blobs only
    const ok = await storage.putRoom(saved);
    await storage.clearLive();
    if (!ok) { patch({ storageOk: false }); this.toast("This browser can't save memories, so this match won't be on the shelf after reload."); }
    await refreshShelf();
  }

  private async persistLive() {
    const st = room();
    if (st.status !== 'live' || this.mode !== 'live') return;
    await storage.putLive({ roomId: this.roomId, slot: this.clock.slot, loyalty: this.member(SELF_ID).loyalty, feed: st.feed, calls: st.calls, label: this.scoreText(Math.max(0, st.playhead)) });
  }

  /** Rewatch: preload saved items so they play at their anchored balls. */
  loadForRewatch(items: FeedItem[], sources: Map<string, Blob | string>) {
    sources.forEach((v, k) => this.audioSrc.set(k, v));
    for (const it of items) if (it.kind !== 'reaction') this.delivery.add({ ...it, unheard: false });
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
