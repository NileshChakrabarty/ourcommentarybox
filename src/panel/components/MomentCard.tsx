import { useRef } from 'react';
import { useRoom } from '../../store/room';
import { engine } from '../../services/engine';

const KIND_LABEL = { tease: 'Your line to tease', comeback: 'Fire back', brag: 'Your moment to gloat' } as const;

export function MomentCard() {
  const card = useRoom((s) => s.card);
  const members = useRoom((s) => s.members);
  const lastTap = useRef(0);
  if (!card) return null;
  const target = members.find((m) => m.id === card.targetId);
  const send = (i: number) => {
    if (Date.now() - lastTap.current < 500 || card.usedIdx !== undefined) return; // debounce double taps
    lastTap.current = Date.now();
    engine?.sendText(card.lines[i], { fromLine: i });
  };
  return (
    <section key={card.moment.id} className={`moment moment-${card.kind}`} aria-label="Moment card" style={{ '--c': target?.colour ?? 'var(--marigold)' } as React.CSSProperties}>
      <header>
        <h3>{card.moment.headline}</h3>
        <span className="src" title={card.source === 'live' ? 'Written just now by Gemini' : card.source === 'precomputed' ? 'Safety-net line prepared earlier by Gemini' : 'Fallback line'}>
          {card.source === 'live' ? 'live AI' : card.source === 'precomputed' ? 'AI, prepared' : 'fallback'}
        </span>
      </header>
      <p className="moment-kind">{KIND_LABEL[card.kind]}{target && !target.isSelf ? ` ${target.name}` : ''}. Say it out loud, or send it.</p>
      <ul>
        {card.lines.map((l, i) => (
          <li key={i} className={card.usedIdx === i ? 'used' : card.usedIdx !== undefined ? 'dim' : ''}>
            <span>{l}</span>
            <button className="btn btn-sm" onClick={() => send(i)} disabled={card.usedIdx !== undefined}>{card.usedIdx === i ? 'Sent' : 'Send'}</button>
          </li>
        ))}
      </ul>
      <p className="moment-foot muted">Gone when the next ball is bowled.</p>
    </section>
  );
}
