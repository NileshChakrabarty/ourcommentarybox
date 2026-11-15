// Memory shelf (S-8): one memory per match room. Behind "More" after the wrap (v1.3). No rewatch: the broadcast
// is live-only, so a memory is the gang's lines and the wrap, not a replay.
import { useEffect, useState } from 'react';
import { useRoom, patch } from '../../store/room';
import { storage } from '../../services/storage/db';
import { refreshShelf, type SavedRoom } from '../../services/engine';
import { FRIENDS, SELF_ID } from '../../content/gang';
import './screens.css';

export function Shelf() {
  const memories = useRoom((s) => s.memories);
  const match = useRoom((s) => s.match)!;
  const [open, setOpen] = useState<SavedRoom | null>(null);
  useEffect(() => { void refreshShelf(); }, []);
  const name = (id: string) => (id === SELF_ID ? 'You' : FRIENDS.find((f) => f.id === id)?.name ?? id);
  const colour = (id: string) => (id === SELF_ID ? 'var(--you)' : FRIENDS.find((f) => f.id === id)?.colour);

  return (
    <main className="shelf">
      <header className="shelf-head">
        <h1>Your memories</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => patch({ screen: 'start' })}>Back to start</button>
      </header>
      {memories.length === 0 && <p className="empty">No memories yet. Watch a match with the gang and it lands here.</p>}
      <div className="shelf-body">
        <ul className="shelf-list">
          {memories.map((m) => (
            <li key={m.id}>
              <button className={`mem${open?.id === m.id ? ' on' : ''}`} onClick={() => void storage.getRoom<SavedRoom>(m.id).then((r) => setOpen(r))}>
                <span className="mem-title">{m.cover}</span>
                <span className="muted small">{m.title.replace(' · ', ', ')}. {m.result}. Watched {new Date(m.endedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            </li>
          ))}
        </ul>
        {open && (
          <section className="mem-detail" aria-label="Memory">
            <h2>{open.wrap?.title ?? open.result}</h2>
            <div className="mem-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => void storage.deleteRoom(open.id).then(() => { setOpen(null); void refreshShelf(); })}>Delete memory</button>
            </div>
            <ol className="timeline">
              {open.feed.filter((f) => f.kind !== 'reaction' && f.kind !== 'skip' && f.text).map((f) => (
                <li key={f.id}>
                  <span className="num muted">{match.balls[f.anchorSeq]?.label}</span>
                  <b style={{ color: colour(f.memberId) }}>{name(f.memberId)}</b>
                  <span>{f.text}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}
