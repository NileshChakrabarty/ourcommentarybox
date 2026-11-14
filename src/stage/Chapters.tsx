// "Jump to a moment": the demo chapters. Jumping forward puts what you skipped into a catch-up line, never a burst.
import { useRoom } from '../store/room';
import { engine } from '../services/engine';

export function Chapters() {
  const chapters = useRoom((s) => s.chapters);
  const current = useRoom((s) => s.chapterId);
  const playhead = useRoom((s) => s.playhead);
  const away = useRoom((s) => !!s.away?.active);
  const mode = useRoom((s) => s.mode);
  return (
    <nav className="chapters" aria-label="Jump to a moment">
      <h2 className="chapters-h">Jump to a moment</h2>
      <ol>
        {chapters.map((c, i) => {
          const done = playhead >= c.endBallSeq;
          const on = current === c.id;
          return (
            <li key={c.id}>
              <button className={`chapter${on ? ' on' : ''}${done ? ' done' : ''}`} aria-current={on ? 'step' : undefined} disabled={away || mode === 'rewatch'} onClick={() => engine?.jumpTo(c.id)}>
                <span className="ch-n num">{i + 1}</span>
                <span className="ch-t">{c.title}</span>
                <span className="ch-b">{on ? 'Playing now' : done ? 'Watched' : c.blurb}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
