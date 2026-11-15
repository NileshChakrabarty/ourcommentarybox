// The PORTABLE gang panel (ADR-0017): host-agnostic. It reads the store and talks to the engine, and the engine only
// knows the MatchSource interface, so the same panel mounts in the web app (beside our YouTube embed) and in the
// Chrome extension's side panel (beside the viewer's own YouTube tab). No imports from src/stage.
// IA (REDESIGN §3): now bar → gang row → ball rail feed → dock (one prompt at a time, reactions, the mic).
import { useEffect, useState } from 'react';
import { useRoom } from '../../store/room';
import { engine, SELF } from '../../services/engine';
import { Avatar } from '../components/Avatar';
import { Feed } from '../components/Feed';
import { Dock } from '../components/Dock';
import { AwayView } from '../components/AwayView';
import '../components/panel.css';

function NowBar() {
  const match = useRoom((s) => s.match)!;
  const plan = useRoom((s) => s.plan);
  const position = useRoom((s) => s.position);
  const state = useRoom((s) => s.sourceState);
  const status = useRoom((s) => s.status);
  const kind = useRoom((s) => s.sourceKind);
  const stepSec = useRoom((s) => s.live?.stepAwaySec ?? 20);
  const nudge = useRoom((s) => s.nudge);
  const away = useRoom((s) => !!s.away?.active);
  const [stalled, setStalled] = useState(false);
  useEffect(() => { // the browser may block autoplay: tell them where to press play (never on top of the video)
    if (state === 'playing') { setStalled(false); return; }
    const t = setTimeout(() => setStalled(true), 3_500);
    return () => clearTimeout(t);
  }, [state]);
  const ball = position >= 0 ? match.balls[position] : undefined;
  const snap = ball && plan ? plan.snaps[position] : undefined;
  const team = snap ? match.teams.find((t) => t.id === (snap.innings === 1 ? match.battingFirst : match.chasing))!.short : '';
  const live = state === 'playing';
  return (
    <header className="nowbar">
      <div className="nb-ball" title="Every line is pinned to a ball. You only hear it when your video reaches that ball, so nobody gets spoiled.">
        <span className={`nb-dot${live ? ' live' : ''}`} aria-hidden="true" />
        <span className="nb-label">{ball ? <>Ball <b className="num">{ball.label}</b></> : 'Waiting for the first ball'}</span>
        {snap && <span className="nb-score num">{team} {snap.runs}/{snap.wickets}</span>}
      </div>
      {status === 'live' && (
        <button className={`btn btn-sm step${nudge ? ' nudge' : ''}`} onClick={() => engine?.stepAway()} disabled={away}>Step away</button>
      )}
      {stalled && status === 'live' && !away && (kind === 'video'
        ? <p className="nb-hint" role="status">{state === 'ad' ? 'An ad is playing on YouTube. The gang waits.' : 'Play the match in your YouTube tab; the gang follows your video.'}</p>
        : <p className="nb-hint" role="status">{state === 'buffering' ? 'The broadcast is buffering…' : <>The broadcast hasn't started. <button className="btn btn-sm btn-primary" onClick={() => engine?.source?.play()}>Start the broadcast</button></>}</p>)}
      {nudge && !away && <p className="nb-hint nb-nudge">Step away for {stepSec} s and come back. The gang will catch you up.</p>}
    </header>
  );
}

function GangRow() {
  const members = useRoom((s) => s.members);
  const speakingId = useRoom((s) => s.speakingId);
  const recording = useRoom((s) => s.recording);
  const calls = useRoom((s) => s.calls);
  const match = useRoom((s) => s.match)!;
  const P = new Map(match.players.map((p) => [p.id, p.short]));
  return (
    <ul className="gangrow" aria-label="Your gang">
      {members.map((m) => {
        const talking = speakingId === m.id || (m.id === SELF && recording);
        const won = calls.filter((c) => c.memberId === m.id && c.status === 'won').length;
        return (
          <li key={m.id} className={talking ? 'talking' : ''} style={{ '--c': m.colour } as React.CSSProperties}>
            <Avatar m={m} size={36} speaking={talking} />
            <span className="gr-name">{m.isSelf ? 'You' : m.name}{m.isSimulated && <span className="ai-tag" title={`${m.name} is an AI friend: Gemini writes the lines, Sarvam voices them`}>AI</span>}</span>
            <span className="gr-hero">{P.get(m.loyalty.heroId ?? '') ?? ''}{won ? <span className="gr-won" title={`${won} Gang Call${won > 1 ? 's' : ''} won`}> +{won}</span> : null}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Panel() {
  const away = useRoom((s) => s.away);
  const wicketAt = useRoom((s) => s.wicketAt);
  const [flash, setFlash] = useState(false);
  useEffect(() => { if (!wicketAt) return; setFlash(true); const t = setTimeout(() => setFlash(false), 900); return () => clearTimeout(t); }, [wicketAt]);
  return (
    <aside className={`panel${flash ? ' wicket-flash' : ''}`} aria-label="Apna Box: your gang">
      <NowBar />
      <GangRow />
      {away?.active ? <AwayView /> : <><Feed /><Dock /></>}
    </aside>
  );
}
