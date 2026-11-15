// Live scoreboard strip above the player (v1.3): the score at the ball on screen, from Cricsheet data.
// It only ever shows the current ball, so it can't spoil anything the broadcast hasn't shown yet.
import { useRoom } from '../store/room';

export function LiveStrip() {
  const match = useRoom((s) => s.match)!;
  const plan = useRoom((s) => s.plan);
  const position = useRoom((s) => s.position);
  const snap = plan && position >= 0 ? plan.snaps[position] : undefined;
  if (!snap) return <div className="live-strip" aria-hidden="true" />;
  const P = new Map(match.players.map((p) => [p.id, p.short]));
  const bat = match.teams.find((t) => t.id === (snap.innings === 1 ? match.battingFirst : match.chasing))!;
  const bowl = match.teams.find((t) => t.id !== bat.id)!;
  const bl = snap.bowler;
  return (
    <div className="live-strip num" role="status" aria-label="Live score">
      <span className="ls-team" style={{ '--t': bat.colour } as React.CSSProperties}>{bat.short} <b>{snap.runs}/{snap.wickets}</b></span>
      <span className="ls-overs">{snap.overs} ov</span>
      {snap.need !== undefined && snap.ballsLeft !== undefined && <span className="ls-need">need {snap.need} off {snap.ballsLeft}</span>}
      {snap.striker && <span className="ls-bat">{P.get(snap.striker.id)} {snap.striker.runs}* ({snap.striker.balls})</span>}
      {snap.nonStriker && <span className="ls-bat muted">{P.get(snap.nonStriker.id)} {snap.nonStriker.runs} ({snap.nonStriker.balls})</span>}
      {bl && <span className="ls-bowl" style={{ '--t': bowl.colour } as React.CSSProperties}>{P.get(bl.id)} {Math.floor(bl.legal / 6)}.{bl.legal % 6}-{bl.runs}-{bl.wickets}</span>}
      <span className="ls-over" aria-label="This over">{snap.thisOver.map((x, i) => <i key={i} className={x === 'W' ? 'w' : x === '4' || x === '6' ? 'b' : ''}>{x}</i>)}</span>
    </div>
  );
}
