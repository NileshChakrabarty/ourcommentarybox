// The viewer's only player controls in the live broadcast (v1.3): mute and volume. No seek, no pause.
// Beside the player, never on it. The gang's voices duck the match volume on top of this level.
import { useRef } from 'react';
import { useRoom } from '../store/room';
import { setVolume } from '../panel/commands';

export function Volume() {
  const volume = useRoom((s) => s.volume);
  const before = useRef(100);
  const muted = volume === 0;
  return (
    <div className="volume">
      <button className="btn btn-sm btn-ghost" aria-pressed={muted} onClick={() => { if (muted) setVolume(before.current || 100); else { before.current = volume; setVolume(0); } }}>
        {muted ? 'Unmute match' : 'Mute match'}
      </button>
      <label className="vol-label">
        <span className="sr-only">Match volume</span>
        <input type="range" min={0} max={100} step={5} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-valuetext={`${volume}%`} />
      </label>
      <span className="muted small">Live broadcast: no pause or rewind, just like TV.</span>
    </div>
  );
}
