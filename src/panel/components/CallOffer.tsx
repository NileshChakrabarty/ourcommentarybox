import { useRoom } from '../../store/room';
import { engine, SELF } from '../../services/engine';
import { CALL_LABEL } from '../../core/calls';
import type { CallType } from '../../core/types';

export function CallOffer() {
  const offer = useRoom((s) => s.callOffer);
  const calls = useRoom((s) => s.calls);
  const members = useRoom((s) => s.members);
  if (!offer) return null;
  const mine = calls.find((c) => c.memberId === SELF && c.innings === offer.innings && c.over === offer.over);
  return (
    <section className="calls" aria-label="Gang Call">
      <h3>Call over {offer.over + 1}: {offer.bowler} to bowl</h3>
      <div className="call-btns">
        {(['wicket', 'six'] as CallType[]).map((t) => (
          <button key={t} className={`btn btn-sm${mine?.type === t ? ' btn-primary' : ''}`} disabled={!!mine} onClick={() => engine?.placeCall(t)}>{CALL_LABEL[t]}</button>
        ))}
      </div>
      <p className="call-gang">
        {offer.friendCalls.map((c) => { const m = members.find((x) => x.id === c.memberId)!; return <span key={c.memberId} style={{ color: m.colour }}>{m.name}: {CALL_LABEL[c.type].toLowerCase()}</span>; })}
      </p>
      <p className="muted small">Bragging rights only. No points, no money.</p>
    </section>
  );
}
