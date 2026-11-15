// EXTENSION host (ADR-0017): the same gang panel, in Chrome's side panel, beside the viewer's own YouTube tab.
// The source is the viewer's <video> (VideoElementSource); YouTube's normal controls apply, because we don't control
// the viewer's player. API calls go to our deployed endpoints (API_BASE); the extension holds no keys.
import { useEffect, useState } from 'react';
import { useRoom, patch, room } from '../../store/room';
import { parseMatch, LiveConfigSchema, TimelineSchema } from '../../core/schema';
import { Timeline } from '../../core/timeline';
import { RoomEngine, setEngine, loadPrecomputed, refreshShelf, engine } from '../../services/engine';
import { VideoElementSource } from '../../services/source/video';
import { FRIENDS, DEFAULT_SELF_LOYALTY } from '../../content/gang';
import { audio } from '../../services/audio/engine';
import { useXray, xclear, xlog, xtoggle } from '../../services/xray';
import { selfMember, resetRoom, leaveBox } from '../../panel/commands';
import { Panel } from '../../panel/screens/Panel';
import { WrapScreen } from '../../panel/screens/Wrap';
import { Shelf } from '../../panel/screens/Shelf';
import { Toast } from '../../panel/components/Toast';
import { XrayLog } from '../../panel/components/XrayLog';
import { LangToggle } from '../../panel/components/LangToggle';
import { API_BASE } from '../../services/api/client';
import { chromeTransport } from './transport';
import './ext.css';

const transport = chromeTransport();
const getJSON = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); };

function useVideoConnected(videoId?: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!videoId) return;
    const probe = new VideoElementSource(transport, videoId);
    const iv = setInterval(() => setOk(probe.connected), 500);
    return () => { clearInterval(iv); probe.destroy(); };
  }, [videoId]);
  return ok;
}

function join() {
  const st = room();
  resetRoom(); xclear();
  audio.unlock();
  const members = [selfMember(DEFAULT_SELF_LOYALTY), ...FRIENDS];
  const e = new RoomEngine(st.match!, members, st.timeline!, st.live!, { lang: st.lang, gangCalls: st.gangCalls });
  setEngine(e);
  const src = new VideoElementSource(transport, st.match!.video!.id);
  patch({ members, screen: 'live', coach: true });
  e.attach(src, 'synced to your YouTube tab');
  const t = src.getCurrentTime();
  xlog('live', st.match!.balls[Math.max(0, st.timeline!.ballAt(t))]?.label ?? '–', `Joined at your video's ${t.toFixed(0)} s; the panel follows your player (YouTube's own controls apply)`);
  e.start(t);
}

function Header() {
  const status = useRoom((s) => s.status);
  const screen = useRoom((s) => s.screen);
  const xray = useXray((s) => s.on);
  return (
    <header className="ext-bar">
      <span className="appbar-mark">Apna Box</span>
      <span className="appbar-gap" />
      <LangToggle />
      {screen === 'live' && <button className={`btn btn-sm btn-ghost${xray ? ' on' : ''}`} aria-pressed={xray} onClick={() => xtoggle()}>Behind the scenes</button>}
      {screen === 'live' && status === 'live' && <button className="btn btn-sm" onClick={leaveBox}>Leave the box</button>}
    </header>
  );
}

function Start() {
  const match = useRoom((s) => s.match)!;
  const connected = useVideoConnected(match.video?.id);
  return (
    <main className="ext-start">
      <p className="lede">Watch with your gang, even when you're apart.</p>
      {connected ? (
        <>
          <button className="btn btn-primary btn-lg" onClick={join}>Join the box</button>
          <p className="muted small">Synced to the match in your YouTube tab. Use YouTube's controls as usual; the gang follows your video.</p>
        </>
      ) : (
        <>
          <p>Open the match on YouTube and this panel syncs to it.</p>
          <a className="btn btn-primary" href={match.video?.url} target="_blank" rel="noopener">Open {match.shortTitle} on YouTube</a>
          <p className="muted small" role="status">Waiting for the video…</p>
        </>
      )}
      <p className="disclosure">Your gang: you, plus Dev, Ritu and Sunny, who are <strong>AI friends</strong>. Gemini writes their lines and Sarvam voices them.</p>
    </main>
  );
}

export function ExtensionApp() {
  const screen = useRoom((s) => s.screen);
  const match = useRoom((s) => s.match);
  const xray = useXray((s) => s.on);
  const [err, setErr] = useState<string>();
  useEffect(() => {
    void Promise.all([getJSON('data/match.json'), getJSON('data/timeline.json'), getJSON('data/live.json')])
      .then(([m, t, l]) => patch({ match: parseMatch(m), timeline: new Timeline(TimelineSchema.parse(t)), live: LiveConfigSchema.parse(l) }))
      .catch(() => setErr("The match data didn't load. Reload the side panel."));
    void loadPrecomputed('');
    void refreshShelf();
    const off = audio.onSpeaking((id) => patch({ speakingId: id }));
    return () => { off(); engine?.stop(); };
  }, []);
  if (err) return <p className="fullscreen-msg" role="alert">{err}</p>;
  if (!match) return <p className="fullscreen-msg shimmer">Setting up the box…</p>;
  return (
    <div className="ext">
      <Header />
      {screen === 'live' ? (xray ? <XrayLog /> : <Panel />) : screen === 'wrap' ? <WrapScreen /> : screen === 'shelf' ? <Shelf /> : <Start />}
      {!API_BASE && <p className="ext-note muted small">Dev build: AI calls go to this page's origin.</p>}
      <Toast />
    </div>
  );
}
