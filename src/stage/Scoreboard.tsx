// Scoreboard fallback view (ScoreboardSource): the same balls on the same timeline, drawn from Cricsheet facts.
// Used only when the YouTube embed can't play. No footage, no logos.
import { useRoom } from '../store/room';
import { ballToken } from '../core/replay/scoreboard';
import './scoreboard.css';

function burstOf(b: { runsBat: number; wicket?: unknown; extraType?: string }): { big: string; tone: string } {
  if (b.wicket) return { big: 'OUT', tone: 'out' };
  if (b.runsBat === 6) return { big: 'SIX', tone: 'six' };
  if (b.runsBat === 4) return { big: 'FOUR', tone: 'four' };
  if (b.extraType === 'wd') return { big: 'Wide', tone: 'extra' };
  if (b.extraType === 'nb') return { big: 'No ball', tone: 'extra' };
  return { big: b.runsBat === 0 ? 'Dot' : String(b.runsBat), tone: 'quiet' };
}
const BURST_S = 6;

export function Scoreboard() {
  const match = useRoom((s) => s.match)!;
  const plan = useRoom((s) => s.plan);
  const tl = useRoom((s) => s.timeline)!;
  const position = useRoom((s) => s.position);
  const t = useRoom((s) => s.videoTime);
  if (!plan) return <div className="board" />;
  const P = new Map(match.players.map((p) => [p.id, p.short]));
  const snap = position >= 0 ? plan.snaps[position] : undefined;
  const ball = position >= 0 ? match.balls[position] : undefined;
  const next = match.balls[position + 1];
  const showBurst = !!ball && t - tl.timeOf(position) < BURST_S;
  const burst = ball ? burstOf(ball) : undefined;
  const bat = match.teams.find((x) => x.id === ((snap?.innings ?? 1) === 1 ? match.battingFirst : match.chasing))!;

  return (
    <div className="board" aria-label="Scoreboard replay">
      <div className="board-pitch" aria-hidden="true" />
      <header className="board-top">
        <span className="board-tag">Scoreboard replay</span>
        <span className="muted">{match.venue}</span>
      </header>
      <section className="board-stage" aria-live="polite">
        {showBurst && burst ? (
          <div key={ball!.seq} className={`burst burst-${burst.tone}`}>
            <span className="burst-big">{burst.big}</span>
            <span className="burst-line">{ball!.text}</span>
          </div>
        ) : next ? (
          <div key={`run-${next.seq}`} className="runup"><span className="runup-ball" /><span>{P.get(next.bowlerId)} to {P.get(next.batterId)}</span></div>
        ) : null}
      </section>
      <footer className="scorebar num">
        <span className="sb-score"><b>{bat.short}</b><span className="sb-runs">{snap ? `${snap.runs}/${snap.wickets}` : '0/0'}</span><span className="muted">{snap?.overs ?? '0.0'} ov</span></span>
        {snap?.innings === 2 && snap.need! > 0 && <span className="sb-equation">Need <b>{snap.need}</b> off <b>{snap.ballsLeft}</b></span>}
        <span className="sb-batters">{snap && [snap.striker, snap.nonStriker].filter((b) => b && !b.out).map((b, i) => <span key={b!.id}>{P.get(b!.id)}{i === 0 ? '*' : ''} {b!.runs} ({b!.balls})</span>)}</span>
        <span className="sb-over" aria-label="This over">
          {snap && ball && match.balls.filter((b) => b.innings === snap.innings && b.over === ball.over && b.seq <= position).map((b) => <i key={b.seq} className={`tok tok-${burstOf(b).tone}`}>{ballToken(b)}</i>)}
        </span>
      </footer>
    </div>
  );
}
