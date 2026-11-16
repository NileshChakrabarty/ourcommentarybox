// "Behind the scenes" (ADR-0016): the live engine log, beside the panel. Read-only, off by default, newest at the
// bottom, stamped with the ball on screen. Shows what the system did, never keys, prompts or the viewer's words.
import { useEffect, useRef } from 'react';
import { useXray, xtoggle, type XKind } from '../../services/xray';

const KIND: Record<XKind, string> = {
  ball: 'Ball sync', moment: 'Moment rule', line: 'AI line', voice: 'Voice', duck: 'Ducking', prefetch: 'Prefetch',
  away: 'Away', live: 'Broadcast', you: 'You', wrap: 'Wrap',
};

export function XrayLog() {
  const entries = useXray((s) => s.entries);
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [entries.length]);
  return (
    <aside className="xray" aria-label="Behind the scenes">
      <header className="xray-head">
        <h2>Behind the scenes</h2>
        <button className="btn btn-sm btn-ghost" onClick={() => xtoggle(false)}>Close</button>
      </header>
      <p className="muted small xray-note">What the engine is doing, ball by ball. Read-only.</p>
      <ol className="xray-list" ref={ref} aria-live="off" tabIndex={0} aria-label="Engine log">
        {entries.length === 0 && <li className="muted small">Waiting for the first ball…</li>}
        {entries.map((e) => (
          <li key={e.id} className={`x x-${e.kind}`}>
            <span className="x-ball num">{e.ball}</span>
            <span className="x-kind">{KIND[e.kind]}</span>
            <span className="x-text">{e.text}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
