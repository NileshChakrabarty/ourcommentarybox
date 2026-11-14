// Away (S-4) and call-back (S-5), shown IN the panel. The match keeps playing beside it, uncovered.
import { useRoom } from '../../store/room';
import { engine } from '../../services/engine';
import { Avatar } from './Avatar';

export function AwayView() {
  const away = useRoom((s) => s.away)!;
  const members = useRoom((s) => s.members);
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
      <p className="muted">The gang keeps watching. They'll call you back when something big happens.</p>
      {away.skipping && <p className="away-skip">Demo time-skip: jumping the video ahead to the next big moment, so you don't have to wait.</p>}
      <button className="btn" onClick={() => void engine?.comeBack()}>I'm back</button>
    </section>
  );
}
