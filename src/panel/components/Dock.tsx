// The dock: one prompt at a time (catch-up → line card → Gang Call), then reactions and the mic.
// Zero typing during play: you talk, tap a reaction, or send the line the gang hands you.
import { useEffect, useRef, useState } from 'react';
import { useRoom } from '../../store/room';
import { engine, SELF } from '../../services/engine';
import { CALL_LABEL } from '../../core/calls';
import type { CallType } from '../../core/types';
import { TalkButton } from './TalkButton';

const KIND: Record<string, (t?: string) => string> = {
  tease: (t) => `Your line: tease ${t ?? 'the gang'}`,
  comeback: (t) => `Your comeback${t ? ` to ${t}` : ''}`,
  brag: () => 'Your moment to gloat',
};

function LineCard() {
  const card = useRoom((s) => s.card);
  const members = useRoom((s) => s.members);
  const lastTap = useRef(0);
  if (!card) return null;
  const target = members.find((m) => m.id === card.targetId);
  const sent = card.usedIdx !== undefined;
  const send = () => { if (Date.now() - lastTap.current < 500 || sent) return; lastTap.current = Date.now(); engine?.sendCardLine(); };
  return (
    <section key={card.moment.id} className={`prompt line-card kind-${card.kind}`} aria-label="A line for you" style={{ '--c': target?.colour ?? 'var(--marigold)' } as React.CSSProperties}>
      <header className="prompt-head">
        <span className="prompt-label">{KIND[card.kind](target && !target.isSelf ? target.name : undefined)}</span>
        <span className="chip" title={card.source === 'live' ? 'Written just now by Gemini' : card.source === 'precomputed' ? 'Prepared earlier by Gemini as a safety net' : 'Fallback line'}>
          {card.source === 'live' ? 'live AI' : card.source === 'precomputed' ? 'AI, prepared' : 'fallback'}
        </span>
      </header>
      <p className="line-text" aria-live="polite">“{card.lines[sent ? card.usedIdx! : card.idx]}”</p>
      <div className="prompt-actions">
        <button className="btn btn-primary btn-sm" onClick={send} disabled={sent}>{sent ? 'Sent' : 'Send it'}</button>
        {!sent && card.lines.length > 1 && <button className="btn btn-sm" onClick={() => engine?.nextLine()}>Another line <span className="muted num">{card.idx + 1}/{card.lines.length}</span></button>}
        <span className="prompt-hint muted">or hold Space and say it</span>
      </div>
    </section>
  );
}

function CallRow() {
  const offer = useRoom((s) => s.callOffer);
  const calls = useRoom((s) => s.calls);
  const members = useRoom((s) => s.members);
  const result = useRoom((s) => s.callResult);
  if (!offer) return null;
  const mine = calls.find((c) => c.memberId === SELF && c.innings === offer.innings && c.over === offer.over);
  const fresh = result && Date.now() - result.at < 15_000 ? result : undefined;
  return (
    <section className="prompt call-row" aria-label="Gang Call">
      <header className="prompt-head">
        <span className="prompt-label">Gang Call: over {offer.over + 1}, {offer.bowler} bowling</span>
        <span className="chip" title="Bragging rights only. No points, no money.">For fun</span>
      </header>
      {fresh ? <p className={`call-result${fresh.won ? ' won' : ''}`} role="status">{fresh.text}</p> : (
        <div className="call-btns" role="group" aria-label="Your call for this over">
          {(['wicket', 'six'] as CallType[]).map((t) => (
            <button key={t} className={`btn btn-sm${mine?.type === t ? ' btn-primary' : ''}`} disabled={!!mine} aria-pressed={mine?.type === t} onClick={() => engine?.placeCall(t)}>{CALL_LABEL[t]}</button>
          ))}
        </div>
      )}
      <p className="call-gang">
        {offer.friendCalls.map((c) => { const m = members.find((x) => x.id === c.memberId)!; return <span key={c.memberId} style={{ color: m.colour }}>{m.name}: {c.type}</span>; })}
      </p>
    </section>
  );
}

function Catchup() {
  const c = useRoom((s) => s.catchup);
  const feed = useRoom((s) => s.feed);
  const members = useRoom((s) => s.members);
  if (!c) return null;
  const missed = feed.filter((f) => c.missed.includes(f.id) && f.text);
  return (
    <section className="prompt catchup" aria-label="While you were away">
      <header className="prompt-head">
        <span className="prompt-label">While you were away</span>
        {c.source === 'live' && <span className="chip chip-live">live AI</span>}
      </header>
      {c.source === 'loading' ? <p className="shimmer">The gang is filling you in…</p> : <p key={c.source} className="cu-text">{c.text}</p>}
      {missed.length > 0 && (
        <ul className="missed" aria-label="Lines you missed">
          {missed.slice(-4).map((f) => { const m = members.find((x) => x.id === f.memberId)!; return (
            <li key={f.id} style={{ '--c': m.colour } as React.CSSProperties}>
              <button className="missed-btn" onClick={() => engine?.playItem(f)} disabled={f.kind !== 'clip'}><b>{m.name}</b> {f.text}</button>
            </li>); })}
        </ul>
      )}
      <button className="btn btn-primary btn-sm" onClick={() => engine?.dismissCatchup()} autoFocus>Back to the banter</button>
    </section>
  );
}

const UP_NEXT_S = 10;
function UpNext() {
  const up = useRoom((s) => s.upNext);
  const chapters = useRoom((s) => s.chapters);
  const [left, setLeft] = useState(UP_NEXT_S);
  useEffect(() => {
    if (!up) return;
    setLeft(UP_NEXT_S);
    const iv = setInterval(() => setLeft((l) => l - 1), 1_000);
    return () => clearInterval(iv);
  }, [up]);
  useEffect(() => { if (up && left <= 0) engine?.jumpTo(up.chapterId); }, [left, up]);
  const ch = chapters.find((c) => c.id === up?.chapterId);
  if (!up || !ch) return null;
  return (
    <section className="prompt up-next" aria-label="Up next">
      <header className="prompt-head"><span className="prompt-label">Up next: {ch.title}</span><span className="chip num">{Math.max(0, left)}s</span></header>
      <p className="muted small">{ch.blurb}</p>
      <div className="prompt-actions">
        <button className="btn btn-primary btn-sm" onClick={() => engine?.jumpTo(ch.id)}>Jump there now</button>
        <button className="btn btn-sm" onClick={() => engine?.dismissUpNext()}>Keep watching</button>
      </div>
    </section>
  );
}

const REACTIONS = [{ e: '😂', l: 'Laughing' }, { e: '🔥', l: 'Fire' }, { e: '😭', l: 'Crying' }, { e: '🤡', l: 'Clown' }];
function Reactions() {
  const [bursts, setBursts] = useState<{ id: number; e: string; x: number }[]>([]);
  const tap = (e: string, i: number) => {
    engine?.react(e);
    const id = Date.now() + Math.random();
    setBursts((b) => [...b, { id, e, x: i }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);
  };
  return (
    <div className="reacts" role="group" aria-label="React">
      {REACTIONS.map((r, i) => <button key={r.e} className="react-btn" onClick={() => tap(r.e, i)} aria-label={`React: ${r.l}`}>{r.e}</button>)}
      {bursts.map((b) => <span key={b.id} className="react-burst" style={{ '--x': b.x } as React.CSSProperties} aria-hidden="true">{b.e}</span>)}
    </div>
  );
}

export function Dock() {
  const mode = useRoom((s) => s.mode);
  const catchup = useRoom((s) => !!s.catchup);
  const card = useRoom((s) => !!s.card);
  const upNext = useRoom((s) => !!s.upNext);
  if (mode === 'rewatch') return <p className="rewatch-note">Rewatching with the gang. Their lines play on the balls they were said on.</p>;
  return (
    <div className="dock">
      {catchup ? <Catchup /> : card ? <LineCard /> : upNext ? <UpNext /> : <CallRow />}
      <Reactions />
      <TalkButton />
    </div>
  );
}
