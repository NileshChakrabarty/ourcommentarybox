// Composition root for the live room: app bar, the match (YouTube or scoreboard fallback) with chapters below it,
// and the portable gang panel NEXT to it. Nothing is ever drawn over the match.
import { useEffect } from 'react';
import { useRoom, patch } from './store/room';
import { engine } from './services/engine';
import { audio } from './services/audio/engine';
import { Stage } from './stage/Stage';
import { Chapters } from './stage/Chapters';
import { Panel } from './panel/screens/Panel';
import { Attribution } from './panel/components/Attribution';
import './stage/stage.css';

export function LiveScreen() {
  const mode = useRoom((s) => s.mode);
  const status = useRoom((s) => s.status);
  const match = useRoom((s) => s.match)!;
  useEffect(() => { const off = audio.onSpeaking((id) => patch({ speakingId: id })); return () => { off(); }; }, []);

  return (
    <div className="room">
      <header className="appbar">
        <span className="appbar-mark">Fun-Banter</span>
        <span className="appbar-title">{match.title.replace(' · ', ', ')}</span>
        <span className="chip" title="Dev, Ritu and Sunny are AI friends. Gemini writes their lines, Sarvam voices them.">AI friends</span>
        {mode === 'rewatch' && <span className="chip">Rewatch</span>}
        <span className="appbar-gap" />
        {mode === 'live' && status === 'live' && <button className="btn btn-sm" onClick={() => engine?.finish()}>Finish and see the wrap</button>}
        {mode === 'rewatch' && <button className="btn btn-sm" onClick={() => { engine?.stop(); patch({ screen: 'shelf', mode: 'live' }); }}>Back to memories</button>}
      </header>
      <section className="stage-col" aria-label="The match">
        <Stage />
        <Chapters />
        <Attribution className="stage-foot" />
      </section>
      <Panel />
    </div>
  );
}
