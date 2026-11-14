// Away overlay (S-4), call-back banner (S-5) and catch-up card (S-6). Rendered over the stream area.
import { useRoom } from '../../store/room';
import { engine } from '../../services/engine';
import { Avatar } from './Avatar';

export function AwayLayer() {
  const away = useRoom((s) => s.away);
  const catchup = useRoom((s) => s.catchup);
  const members = useRoom((s) => s.members);
  if (catchup) {
    return (
      <div className="away-layer">
        <section className="catchup" role="dialog" aria-label="While you were away">
          <h3>While you were away</h3>
          {catchup.source === 'loading' ? <p className="shimmer">The gang is filling you in…</p> : <p key={catchup.source} className="cu-text">{catchup.text}</p>}
          {catchup.source === 'live' && <span className="src">live AI</span>}
          {catchup.missed > 0 && <p className="muted small">{catchup.missed} gang clip{catchup.missed > 1 ? 's' : ''} waiting in the feed, marked "While you were away".</p>}
          <button className="btn btn-primary" onClick={() => engine?.dismissCatchup()} autoFocus>Rejoin the match</button>
        </section>
      </div>
    );
  }
  if (!away?.active) return null;
  const caller = away.calledBack ? members.find((m) => m.id === away.calledBack!.friendId) : undefined;
  return (
    <div className="away-layer dim">
      {caller ? (
        <section className="callback" role="alertdialog" aria-label={`${caller.name} is calling you back`} style={{ '--c': caller.colour } as React.CSSProperties}>
          <Avatar m={caller} size={64} speaking />
          <p className="cb-who">{caller.name} is calling you back</p>
          <blockquote>{away.calledBack!.text}</blockquote>
          <button className="btn btn-primary btn-lg" onClick={() => void engine?.comeBack()} autoFocus>Back to the match</button>
        </section>
      ) : (
        <section className="away-card">
          <p className="away-big">You stepped away</p>
          <p>The match keeps going. The gang will call you when it matters.</p>
          <button className="btn" onClick={() => void engine?.comeBack()}>I'm back</button>
        </section>
      )}
    </div>
  );
}
