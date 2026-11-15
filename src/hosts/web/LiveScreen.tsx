// WEB host: composition root for the live room: app bar, the broadcast (YouTube or scoreboard fallback) with the
// live scoreboard strip above it and volume below it, and the portable gang panel NEXT to it. Nothing is ever drawn
// over the match. "Behind the scenes" opens the engine log beside the panel.
import { useEffect } from 'react';
import { useRoom, patch } from '../../store/room';
import { audio } from '../../services/audio/engine';
import { useXray, xtoggle } from '../../services/xray';
import { Stage } from '../../stage/Stage';
import { LiveStrip } from '../../stage/LiveStrip';
import { Volume } from '../../stage/Volume';
import { Panel } from '../../panel/screens/Panel';
import { XrayLog } from '../../panel/components/XrayLog';
import { LangToggle } from '../../panel/components/LangToggle';
import { Attribution } from '../../panel/components/Attribution';
import { leaveBox } from '../../panel/commands';
import '../../stage/stage.css';

export function LiveScreen() {
  const status = useRoom((s) => s.status);
  const match = useRoom((s) => s.match)!;
  const xray = useXray((s) => s.on);
  useEffect(() => { const off = audio.onSpeaking((id) => patch({ speakingId: id })); return () => { off(); }; }, []);

  return (
    <div className={`room${xray ? ' with-xray' : ''}`}>
      <header className="appbar">
        <span className="appbar-mark" title="Apna Commentary Box">Apna Box</span>
        <span className="live-badge" aria-label="Live"><span aria-hidden="true">●</span> LIVE</span>
        <span className="appbar-title">{match.title.replace(' · ', ', ')}</span>
        <span className="appbar-gap" />
        <LangToggle />
        <button className={`btn btn-sm btn-ghost${xray ? ' on' : ''}`} aria-pressed={xray} onClick={() => xtoggle()}>Behind the scenes</button>
        {status === 'live' && <button className="btn btn-sm" onClick={leaveBox}>Leave the box</button>}
      </header>
      <section className="stage-col" aria-label="The match">
        <LiveStrip />
        <Stage />
        <Volume />
        <footer className="stage-foot">
          <Attribution />
          {/* new tab: the broadcast keeps running here, and you get a catch-up when you come back */}
          <a href="/how-it-works" target="_blank" rel="noopener">How it works</a>
        </footer>
      </section>
      <Panel />
      {xray && <XrayLog />}
    </div>
  );
}
