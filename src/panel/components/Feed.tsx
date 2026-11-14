import { useEffect, useRef } from 'react';
import { useRoom } from '../../store/room';
import { engine } from '../../services/engine';
import type { FeedItem, Member } from '../../core/types';

function Bars({ seed, n = 18 }: { seed: string; n?: number }) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return <span className="bars" aria-hidden="true">{Array.from({ length: n }, (_, i) => { h = (h * 1103515245 + 12345) >>> 0; return <i key={i} style={{ height: `${25 + (h % 70)}%` }} />; })}</span>;
}

function Item({ it, m, speaking }: { it: FeedItem; m: Member; speaking: boolean }) {
  const self = m.isSelf;
  if (it.kind === 'reaction') return <li className={`fi fi-react${self ? ' self' : ''}`} style={{ '--c': m.colour } as React.CSSProperties}><span className="who">{self ? 'You' : m.name}</span> <span className="emoji">{it.emoji}</span></li>;
  return (
    <li className={`fi${self ? ' self' : ''}${speaking ? ' playing' : ''}${it.unheard ? ' unheard' : ''}`} style={{ '--c': m.colour } as React.CSSProperties}>
      <div className="fi-head">
        <span className="who">{self ? 'You' : m.name}</span>
        {it.unheard && <span className="tag">While you were away</span>}
        {it.source === 'live' && !self && <span className="src" title="Written live by Gemini, voiced by Sarvam">live AI</span>}
      </div>
      {it.kind === 'clip' && (
        <button className="clip" onClick={() => engine?.playItem(it)} aria-label={`Play ${self ? 'your' : `${m.name}'s`} clip`}>
          <span className="play" aria-hidden="true" /> <Bars seed={it.id} />
          {it.durationMs ? <span className="dur num">{(it.durationMs / 1000).toFixed(1)}s</span> : null}
        </button>
      )}
      {it.kind === 'clip' && it.transcriptStatus === 'pending' && <p className="tx shimmer">Transcribing…</p>}
      {it.kind === 'clip' && it.transcriptStatus === 'failed' && <p className="tx muted">Transcript unavailable</p>}
      {it.text && <p className="tx">{it.text}</p>}
    </li>
  );
}

export function Feed() {
  const feed = useRoom((s) => s.feed);
  const members = useRoom((s) => s.members);
  const match = useRoom((s) => s.match)!;
  const playhead = useRoom((s) => s.playhead);
  const speakingId = useRoom((s) => s.speakingId);
  const ref = useRef<HTMLDivElement>(null);
  const byId = new Map(members.map((m) => [m.id, m]));

  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [feed.length]);

  // group by anchor ball with a marker
  const groups: { seq: number; items: FeedItem[] }[] = [];
  for (const it of feed) {
    const g = groups.at(-1);
    if (g && g.seq === it.anchorSeq) g.items.push(it); else groups.push({ seq: it.anchorSeq, items: [it] });
  }
  const lastSpeakingItem = speakingId ? [...feed].reverse().find((f) => f.memberId === speakingId && f.kind === 'clip')?.id : undefined;

  return (
    <div className="feed" ref={ref} aria-live="polite" aria-label="Gang feed">
      {feed.length === 0 && <p className="empty">{playhead < 0 ? 'The gang is warming up…' : 'Quiet so far. Say something, or wait for the gang.'}</p>}
      <ol>
        {groups.map((g) => {
          const b = match.balls[g.seq];
          return (
            <li key={`${g.seq}-${g.items[0].id}`} className="fg">
              <div className="marker num"><span>{b.label}</span> {b.text}</div>
              <ol>{g.items.map((it) => <Item key={it.id} it={it} m={byId.get(it.memberId)!} speaking={it.id === lastSpeakingItem} />)}</ol>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
