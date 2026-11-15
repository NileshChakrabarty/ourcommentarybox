// Away (S-4) and call-back (S-5), shown IN the panel. The broadcast keeps playing live beside it, uncovered (v1.3:
// no time-skip). A seconds counter shows how long you've been gone; the gang's lines wait for your catch-up.
import { useEffect, useState } from 'react';
import { useRoom } from '../../store/room';
import { engine } from '../../services/engine';
import { Avatar } from './Avatar';

export function AwayView() {
  const away = useRoom((s) => s.away)!;
  const members = useRoom((s) => s.members);
  const stepSec = useRoom((s) => s.live?.stepAwaySec ?? 20);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1_000); return () => clearInterval(iv); }, []);
  const gone = Math.max(0, Math.floor((now - away.since) / 1000));
  const caller = away.calledBack ? members.find((m) => m.id === away.calledBack!.friendId) : undefined;
  if (caller) {
    return (
      <section className="away callback" role="alertdialog" aria-label={`${caller.name} is calling you back`} style={{ '--c': caller.colour } as React.CSSProperties}>
        <div className="ring" aria-hidden="true"><Avatar m={caller} size={72} speaking /></div>
        <p className="cb-who">{caller.name} is calling you back</p>
        <blockquote className="cb-line">{away.calledBack!.text}</blockquote>
        <button className="btn btn-primary btn-lg" onClick={() => void engine?.comeBack()} autoFocus>Back to the match</button>
      </section>
    );
  }
  return (
    <section className="away" aria-label="You stepped away">
      <p className="away-big">You stepped away</p>
      <p className="away-timer num" aria-live="off">{gone} s</p>
      <p className="muted">The match is still live and the gang is still talking. Come back in about {stepSec} s and they'll catch you up.</p>
      <button className={`btn${gone >= stepSec ? ' btn-primary' : ''}`} onClick={() => void engine?.comeBack()}>I'm back</button>
    </section>
  );
}
