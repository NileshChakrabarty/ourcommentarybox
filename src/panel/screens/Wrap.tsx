// Match wrap (v1.3): opens on "Leave the box" or at the last ball. It summarises what THIS viewer experienced —
// top moments they saw, the best line, a short audio reel. Extras (memory shelf, the numbers, Gang Calls for next
// time) sit behind "More" so the wrap itself needs no explanation.
import { useState } from 'react';
import { useRoom, patch } from '../../store/room';
import { engine, SELF } from '../../services/engine';
import { audio } from '../../services/audio/engine';
import { Avatar } from '../components/Avatar';
import { toShelf } from '../commands';
import { saveGangCalls } from '../../services/lang';
import { Attribution } from '../components/Attribution';
import './screens.css';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function WrapScreen() {
  const wrap = useRoom((s) => s.wrap);
  const feed = useRoom((s) => s.feed);
  const members = useRoom((s) => s.members);
  const match = useRoom((s) => s.match)!;
  const storageOk = useRoom((s) => s.storageOk);
  const memories = useRoom((s) => s.memories);
  const gangCalls = useRoom((s) => s.gangCalls);
  const [reelIdx, setReelIdx] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const byId = new Map(members.map((m) => [m.id, m]));
  const who = (id: string) => (id === SELF ? 'You' : byId.get(id)?.name ?? id);

  if (!wrap) {
    return <main className="wrap"><div className="wrap-loading"><p className="shimmer">The gang is putting your wrap together…</p></div></main>;
  }
  const best = wrap.roast ? feed.find((f) => f.id === wrap.roast!.itemId) : undefined;
  const reel = wrap.reel.map((id) => feed.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f);
  const playReel = () => {
    audio.clear();
    reel.forEach((it, i) => {
      const src = it.audioKey ? engine?.audioSrc.get(it.audioKey) : undefined;
      if (src) audio.enqueue({ id: it.memberId, src, onStart: () => setReelIdx(i), onEnd: () => i === reel.length - 1 && setReelIdx(null) });
    });
  };
  const ball = (seq: number) => match.balls[seq];
  const w = wrap.watched;

  return (
    <main className="wrap">
      <header className="wrap-cover">
        <p className="wrap-result">
          {match.title.replace(' · ', ', ')}. {w.complete ? `${match.result}.` : `You watched ${ball(w.fromSeq).label} to ${ball(w.toSeq).label} live, about ${plural(w.minutes, 'minute')}.`}
        </p>
        <h1>{wrap.title}</h1>
        <p className="muted small">{wrap.source === 'live' ? 'Written by Gemini from what your gang said.' : 'Your gang wrap.'} {storageOk ? 'Saved to your memories.' : "This browser can't save it."}</p>
      </header>

      <section className="wrap-grid">
        <article className="w-card top">
          <h2>Top moments</h2>
          {wrap.top.length ? (
            <ol>{wrap.top.map((m) => <li key={m.seq}><span className="num muted">{ball(m.seq).label}</span> {m.text}</li>)}</ol>
          ) : <p className="muted">No wickets or sixes while you were in the box. Quiet one.</p>}
        </article>
        {best && (
          <article className="w-card roast" style={{ '--c': byId.get(best.memberId)?.colour } as React.CSSProperties}>
            <h2>Best line</h2>
            <blockquote>“{best.text}”</blockquote>
            <p className="muted">{who(best.memberId)}{best.targetId ? `, to ${who(best.targetId)}` : ''}, at {ball(best.anchorSeq).label}</p>
          </article>
        )}
        <article className="w-card reel">
          <h2>The audio reel</h2>
          {reel.length ? (
            <>
              <ol>{reel.map((it, i) => <li key={it.id} className={reelIdx === i ? 'on' : ''}><b style={{ color: byId.get(it.memberId)?.colour }}>{who(it.memberId)}</b> {it.text ?? 'clip'}</li>)}</ol>
              <button className="btn btn-primary" onClick={playReel}>Play the reel</button>
            </>
          ) : <p className="muted">No voice clips yet. Stay a little longer next time.</p>}
        </article>
      </section>

      <footer className="wrap-foot">
        <button className="btn btn-primary" onClick={() => patch({ screen: 'start' })}>Back to the start</button>
        <button className="btn btn-ghost" aria-expanded={more} aria-controls="wrap-more" onClick={() => setMore((m) => !m)}>{more ? 'Less' : 'More'}</button>
      </footer>

      {more && (
        <section id="wrap-more" className="wrap-more" aria-label="More">
          <article className="w-card stats">
            <h2>The numbers</h2>
            <ul>
              {members.map((m) => (
                <li key={m.id}>
                  <Avatar m={m} size={28} />
                  <span>{who(m.id)}</span>
                  <span className="num muted">{plural(wrap.stats.clips[m.id] ?? 0, 'line')}</span>
                  {gangCalls && <span className="num muted">{plural(wrap.stats.callsWon[m.id] ?? 0, 'call')} won</span>}
                  {wrap.stats.mostRoasted?.memberId === m.id && <span className="chip">Most roasted ({wrap.stats.mostRoasted.count})</span>}
                </li>
              ))}
            </ul>
          </article>
          <article className="w-card">
            <h2>Extras</h2>
            <p><button className="btn btn-sm" onClick={toShelf}>Your memories ({memories.length})</button></p>
            <label className="extra-toggle">
              <input type="checkbox" checked={gangCalls} onChange={(e) => { patch({ gangCalls: e.target.checked }); saveGangCalls(e.target.checked); }} />
              <span><b>Gang Calls</b> next time: before some overs, everyone calls "wicket" or "six". Bragging rights only.</span>
            </label>
          </article>
        </section>
      )}
      <Attribution className="wrap-attr" />
    </main>
  );
}
