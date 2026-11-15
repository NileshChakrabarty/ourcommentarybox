// The match: the official YouTube embed (primary) or the scoreboard replay (automatic fallback).
// Our UI never covers it: notes and hints sit above or beside the player, never on top.
import { useEffect, useRef } from 'react';
import { useRoom } from '../store/room';
import { bootSource } from '../hosts/web/actions';
import { Scoreboard } from './Scoreboard';

export function Stage() {
  const kind = useRoom((s) => s.sourceKind);
  const note = useRoom((s) => s.sourceNote);
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => { void bootSource(mount.current); }, []);
  return (
    <div className="stage">
      {note && <p className="stage-note" role="status">{note}</p>}
      <div className="player-box">
        <div ref={mount} className="yt-mount" hidden={kind === 'scoreboard'} />
        {kind === 'scoreboard' && <Scoreboard />}
        {!kind && <p className="player-loading shimmer">Loading the match…</p>}
      </div>
    </div>
  );
}
