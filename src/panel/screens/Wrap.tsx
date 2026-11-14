// Gang wrap (S-7): the night's headline, roast of the night, high/low, audio reel, stats. Saved as a memory.
import { useState } from 'react';
import { useRoom, patch } from '../../store/room';
import { engine, SELF } from '../../services/engine';
import { audio } from '../../services/audio/engine';
import { Avatar } from '../components/Avatar';
import { rewatch } from '../actions';
import './screens.css';

export function WrapScreen() {
  const wrap = useRoom((s) => s.wrap);
  const feed = useRoom((s) => s.feed);
  const members = useRoom((s) => s.members);
  const match = useRoom((s) => s.match)!;
  const roomId = useRoom((s) => s.roomId);
  const storageOk = useRoom((s) => s.storageOk);
  const [reelIdx, setReelIdx] = useState<number | null>(null);
  const byId = new Map(members.map((m) => [m.id, m]));
  const who = (id: string) => (id === SELF ? 'You' : byId.get(id)?.name ?? id);

  if (!wrap) {
    return <main className="wrap"><div className="wrap-loading"><p className="shimmer">The gang is putting tonight's wrap together…</p></div></main>;
  }
  const roastItem = wrap.roast ? feed.find((f) => f.id === wrap.roast!.itemId) : undefined;
  const reel = wrap.reel.map((id) => feed.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f);
  const playReel = () => {
    audio.clear();
    reel.forEach((it, i) => {
      const src = it.audioKey ? engine?.audioSrc.get(it.audioKey) : undefined;
      if (src) audio.enqueue({ id: it.memberId, src, onStart: () => setReelIdx(i), onEnd: () => i === reel.length - 1 && setReelIdx(null) });
    });
  };
  const ball = (seq: number) => match.balls[seq];

  return (
    <main className="wrap">
      <header className="wrap-cover">
        <p className="wrap-result">{match.title.replace(' · ', ', ')}. {match.result}.</p>
        <h1>{wrap.title}</h1>
        <p className="muted small">{wrap.source === 'live' ? 'Written by Gemini from what your gang said tonight.' : 'Your gang wrap.'} {storageOk ? 'Saved to your memories.' : "This browser can't save it."}</p>
      </header>

      <section className="wrap-grid">
        {roastItem && (
          <article className="w-card roast" style={{ '--c': byId.get(roastItem.memberId)?.colour } as React.CSSProperties}>
            <h2>{wrap.roast!.title}</h2>
            <blockquote>“{roastItem.text}”</blockquote>
            <p className="muted">{who(roastItem.memberId)}{roastItem.targetId ? `, to ${who(roastItem.targetId)}` : ''}, at {ball(roastItem.anchorSeq).label}</p>
          </article>
        )}
        <article className="w-card reel">
          <h2>The audio reel</h2>
          {reel.length ? (
            <>
              <ol>{reel.map((it, i) => <li key={it.id} className={reelIdx === i ? 'on' : ''}><b style={{ color: byId.get(it.memberId)?.colour }}>{who(it.memberId)}</b> {it.text ?? 'clip'}</li>)}</ol>
              <button className="btn btn-primary" onClick={playReel}>Play the reel</button>
            </>
          ) : <p className="muted">No clips with audio tonight.</p>}
        </article>
        {(wrap.high || wrap.low) && (
          <article className="w-card hilo">
            {wrap.high && <div><h2>Loudest moment</h2><p className="num">{ball(wrap.high.seq).label}: {ball(wrap.high.seq).text}</p><p>{wrap.high.caption}</p></div>}
            {wrap.low && <div><h2>When the gang went quiet</h2><p className="num">{ball(wrap.low.seq).label}: {ball(wrap.low.seq).text}</p><p>{wrap.low.caption}</p></div>}
          </article>
        )}
        <article className="w-card stats">
          <h2>The numbers</h2>
          <ul>
            {members.map((m) => (
              <li key={m.id}>
                <Avatar m={m} size={28} />
                <span>{who(m.id)}</span>
                <span className="num muted">{wrap.stats.clips[m.id] ?? 0} said</span>
                <span className="num muted">{wrap.stats.callsWon[m.id] ?? 0} calls won</span>
                {wrap.stats.mostRoasted?.memberId === m.id && <span className="tag">Most roasted ({wrap.stats.mostRoasted.count})</span>}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <footer className="wrap-foot">
        <button className="btn btn-primary" onClick={() => patch({ screen: 'shelf' })}>See your memory shelf</button>
        {roomId && storageOk && <button className="btn" onClick={() => void rewatch(roomId)}>Rewatch with the gang</button>}
        <button className="btn btn-ghost" onClick={() => patch({ screen: 'landing' })}>Back to start</button>
      </footer>
    </main>
  );
}
