import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useRoom, patch } from './store/room';
import { parseMatch, LiveConfigSchema, TimelineSchema } from './core/schema';
import { Timeline } from './core/timeline';
import { engine, loadPrecomputed, refreshShelf, type LiveSnapshot } from './services/engine';
import { storage } from './services/storage/db';
import { Start } from './hosts/web/Start';
import { LiveScreen } from './hosts/web/LiveScreen';
import { WrapScreen } from './panel/screens/Wrap';
import { Shelf } from './panel/screens/Shelf';
import { Toast } from './panel/components/Toast';
import { isHow } from './nav';

const HowItWorks = lazy(() => import('./how/HowItWorks'));

async function getJSON(url: string) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); }

async function loadMatch() {
  patch({ loadError: undefined });
  try {
    const [m, t, l] = await Promise.all([getJSON('/data/match.json'), getJSON('/data/timeline.json'), getJSON('/data/live.json')]);
    patch({ match: parseMatch(m), timeline: new Timeline(TimelineSchema.parse(t)), live: LiveConfigSchema.parse(l) });
  } catch {
    patch({ loadError: "The match data didn't load. Check your connection, then try again." });
  }
}

/** Last line of defence: a render error shows a way back instead of a blank page. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fullscreen-msg" role="alert">
        <p>Something broke on this screen. Your memories are safe.</p>
        <button className="btn btn-primary" onClick={() => { this.setState({ failed: false }); patch({ screen: 'start' }); }}>Back to the start</button>
      </div>
    );
  }
}

export function App() {
  const screen = useRoom((s) => s.screen);
  const match = useRoom((s) => s.match);
  const loadError = useRoom((s) => s.loadError);

  useEffect(() => {
    if (isHow()) patch({ screen: 'how' });
    void loadMatch(); void loadPrecomputed(); void refreshShelf();
    void storage.available().then((ok) => patch({ storageOk: ok }));
    void storage.getLive<LiveSnapshot>().then((l) => l?.joinedAt && patch({ resumable: { roomId: l.roomId } }));
    // a hidden tab counts as stepping away: the broadcast keeps going, the catch-up plays when you're back
    const vis = () => { if (useRoom.getState().screen === 'live') engine?.setHidden(document.hidden); };
    const pop = () => patch({ screen: isHow() ? 'how' : 'start' });
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('popstate', pop);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('popstate', pop); };
  }, []);

  if (screen === 'how') return <Suspense fallback={<div className="fullscreen-msg"><p className="shimmer">Loading…</p></div>}><HowItWorks /></Suspense>;
  if (loadError) return (
    <div className="fullscreen-msg" role="alert">
      <p>{loadError}</p>
      <button className="btn btn-primary" onClick={() => void loadMatch()}>Try again</button>
    </div>
  );
  if (!match) return <div className="fullscreen-msg" aria-busy="true"><p className="shimmer">Setting up the box…</p></div>;

  return (
    <ErrorBoundary>
      {screen === 'start' && <Start />}
      {screen === 'live' && <LiveScreen />}
      {screen === 'wrap' && <WrapScreen />}
      {screen === 'shelf' && <Shelf />}
      <Toast />
    </ErrorBoundary>
  );
}

