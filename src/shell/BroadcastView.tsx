// Demo-only "streaming site": stylised floodlit broadcast built from ball-by-ball data. No footage, no brands.
import { useEffect, useState } from 'react';
import { useRoom } from '../store/room';
import { ballToken } from '../core/replay/scoreboard';
import { engine } from '../services/engine';
import { audio } from '../services/audio/engine';
import './shell.css';

function burstOf(b: { runsBat: number; wicket?: unknown; extraType?: string }): { big: string; tone: string } {
  if (b.wicket) return { big: 'OUT', tone: 'out' };
  if (b.runsBat === 6) return { big: 'SIX', tone: 'six' };
  if (b.runsBat === 4) return { big: 'FOUR', tone: 'four' };
  if (b.extraType === 'wd') return { big: 'WIDE', tone: 'extra' };
  if (b.extraType === 'nb') return { big: 'NO BALL', tone: 'extra' };
  return { big: b.runsBat === 0 ? '•' : String(b.runsBat), tone: 'quiet' };
}

export function BroadcastView() {
  const match = useRoom((s) => s.match)!;
  const plan = useRoom((s) => s.plan);
  const slot = useRoom((s) => s.slot);
  const playhead = useRoom((s) => s.playhead);
  const paused = useRoom((s) => s.paused);
  const mode = useRoom((s) => s.mode);
  const awayActive = useRoom((s) => !!s.away?.active);
  const [muted, setMuted] = useState(audio.isMuted);
  useEffect(() => audio.setMuted(muted), [muted]);

  if (!plan) return <div className="broadcast" />;
  const P = new Map(match.players.map((p) => [p.id, p]));
  const snap = playhead >= 0 ? plan.snaps[playhead] : undefined;
  const ball = playhead >= 0 ? match.balls[playhead] : undefined;
  const current = match.balls[slot];
  const revealed = playhead === slot;
  const inningsBreak = !!ball && ball.innings === 1 && match.balls[playhead + 1]?.innings === 2;
  const batTeam = match.teams.find((t) => t.id === ((snap?.innings ?? 1) === 1 ? match.battingFirst : match.chasing))!;
  const fast = (plan.durations[slot] ?? 9999) < 700 || awayActive;
  const burst = ball ? burstOf(ball) : undefined;
  const nm = (id?: string) => (id ? P.get(id)?.short ?? '' : '');

  return (
    <div className="broadcast" data-tone={revealed && burst ? burst.tone : 'wait'}>
      <div className="floodlights" aria-hidden="true"><i /><i /></div>
      <div className="outfield" aria-hidden="true"><div className="pitch" /></div>

      <header className="bc-top">
        <span className={`live-badge${mode === 'rewatch' ? ' rewatch' : ''}`}>{mode === 'rewatch' ? 'Rewatch' : 'Live'}</span>
        <span className="bc-title">{match.title.replace(' · ', ', ')}</span>
        <span className="bc-venue muted">{match.venue}</span>
        {fast && !paused && <span className="ff">Fast-forwarding quiet balls</span>}
      </header>

      <section className="stage" aria-live="polite">
        {inningsBreak && revealed ? (
          <div className="innings-break">
            <p className="ib-small">Innings break</p>
            <p className="ib-big">{match.teams.find((t) => t.id === match.chasing)!.name} need {match.target}</p>
          </div>
        ) : revealed && burst && ball ? (
          <div key={ball.seq} className={`burst burst-${burst.tone}`}>
            <span className="burst-big">{burst.big}</span>
            <span className="burst-line">{ball.text}</span>
          </div>
        ) : current ? (
          <div key={`run-${current.seq}`} className="runup">
            <span className="runup-ball" />
            <span className="runup-text">{nm(current.bowlerId)} to {nm(current.batterId)}</span>
          </div>
        ) : null}
      </section>

      <footer className="scorebar">
        <div className="sb-score">
          <span className="sb-team" style={{ '--tc': `var(--${batTeam.id.toLowerCase()})` } as React.CSSProperties}>{batTeam.short}</span>
          <span className="sb-runs num">{snap ? `${snap.runs}/${snap.wickets}` : '0/0'}</span>
          <span className="sb-overs num">{snap ? snap.overs : '0.0'} ov</span>
        </div>
        <div className="sb-equation num">
          {snap?.innings === 2 ? (snap.need! > 0 ? <>Need <b>{snap.need}</b> off <b>{snap.ballsLeft}</b></> : <b>{match.result}</b>) : <>Run rate <b>{snap ? snap.crr.toFixed(2) : '0.00'}</b></>}
        </div>
        <div className="sb-batters num">
          {snap && [snap.striker, snap.nonStriker].filter((b) => b && !b.out).map((b, i) => (
            <span key={b!.id}>{nm(b!.id)}{i === 0 ? '*' : ''} {b!.runs} <small>({b!.balls})</small></span>
          ))}
        </div>
        <div className="sb-bowler num">
          {snap?.bowler && <span>{nm(snap.bowler.id)} {Math.floor(snap.bowler.legal / 6)}.{snap.bowler.legal % 6}-{snap.bowler.runs}-{snap.bowler.wickets}</span>}
        </div>
        <div className="sb-over" aria-label="This over">
          {snap && match.balls.filter((b) => b.innings === snap.innings && b.over === match.balls[playhead].over && b.seq <= playhead).map((b) => (
            <i key={b.seq} className={`tok tok-${burstOf(b).tone}`}>{ballToken(b)}</i>
          ))}
        </div>
      </footer>

      <div className="bc-controls">
        <button className="btn btn-sm btn-ghost" onClick={() => setMuted(!muted)} aria-pressed={muted}>{muted ? 'Crowd off' : 'Crowd on'}</button>
        {mode === 'live' || mode === 'rewatch' ? (
          <button className="btn btn-sm btn-ghost" onClick={() => engine?.togglePause()} aria-pressed={paused}>{paused ? 'Play' : 'Pause'}</button>
        ) : null}
      </div>
    </div>
  );
}
