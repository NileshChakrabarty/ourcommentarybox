// The PORTABLE product panel (no imports from src/shell) — the same panel would mount inside a Chrome extension.
import { useState } from 'react';
import { useRoom } from '../../store/room';
import { engine, SELF } from '../../services/engine';
import { Avatar } from '../components/Avatar';
import { Feed } from '../components/Feed';
import { MomentCard } from '../components/MomentCard';
import { CallOffer } from '../components/CallOffer';
import { TalkButton } from '../components/TalkButton';
import '../components/panel.css';

const REACTIONS = ['😂', '🔥', '😭', '🤡'];

function GangHeader() {
  const members = useRoom((s) => s.members);
  const match = useRoom((s) => s.match)!;
  const speakingId = useRoom((s) => s.speakingId);
  const recording = useRoom((s) => s.recording);
  const calls = useRoom((s) => s.calls);
  const P = new Map(match.players.map((p) => [p.id, p.short]));
  return (
    <ul className="gang" aria-label="Your gang">
      {members.map((m) => {
        const won = calls.filter((c) => c.memberId === m.id && c.status === 'won').length;
        return (
          <li key={m.id} style={{ '--c': m.colour } as React.CSSProperties} className={speakingId === m.id || (m.isSelf && recording) ? 'talking' : ''}>
            <Avatar m={m} size={36} speaking={speakingId === m.id || (m.isSelf && recording)} />
            <span className="g-name">{m.isSelf ? 'You' : m.name}</span>
            <span className="g-badge">{m.loyalty.teamId}{m.loyalty.heroId ? `, ${P.get(m.loyalty.heroId)}` : ''}</span>
            {won > 0 && <span className="g-calls" title="Gang Calls won">{won} call{won > 1 ? 's' : ''} won</span>}
          </li>
        );
      })}
    </ul>
  );
}

function Composer() {
  const [text, setText] = useState('');
  const away = useRoom((s) => !!s.away?.active);
  const send = () => { if (text.trim()) { engine?.sendText(text); setText(''); } };
  return (
    <div className="composer">
      <div className="reacts" role="group" aria-label="Reactions">
        {REACTIONS.map((e) => <button key={e} className="react-btn" disabled={away} onClick={() => engine?.react(e)} aria-label={`React ${e}`}>{e}</button>)}
      </div>
      <form className="text-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} maxLength={140} disabled={away} onChange={(e) => setText(e.target.value)} placeholder="Can't talk? Type to the gang" aria-label="Message the gang" />
        <button className="btn btn-sm" type="submit" disabled={!text.trim() || away}>Send</button>
      </form>
      <TalkButton />
    </div>
  );
}

export function Panel() {
  const mode = useRoom((s) => s.mode);
  const nudge = useRoom((s) => s.nudge);
  const away = useRoom((s) => !!s.away?.active);
  const status = useRoom((s) => s.status);
  return (
    <aside className="panel" aria-label="Fun-Banter gang panel">
      <header className="panel-head">
        <div className="ph-row">
          <h2>Gang commentary</h2>
          <span className="sync" title="Every clip is pinned to a ball and plays when YOUR stream reaches it, so nobody gets spoiled.">In sync with your stream</span>
        </div>
        <div className="ph-row">
          <span className="tag">Simulated gang</span>
          {mode === 'live' && status === 'live' && (
            <button className={`btn btn-sm step${nudge ? ' nudge' : ''}`} onClick={() => engine?.stepAway()} disabled={away}>
              {away ? 'Away' : 'Step away'}
            </button>
          )}
        </div>
        {nudge && !away && <p className="nudge-tip">Try it: step away. The gang will call you back when it gets close.</p>}
      </header>
      <GangHeader />
      <Feed />
      {mode === 'live' && (
        <div className="panel-bottom">
          <CallOffer />
          <MomentCard />
          <Composer />
        </div>
      )}
      {mode === 'rewatch' && <p className="rewatch-note">Rewatching with the gang: their clips play at the balls they were said on.</p>}
    </aside>
  );
}
export { SELF };
