import { Component, useEffect, type ReactNode } from 'react';
import { useRoom, patch } from './store/room';
import { parseMatch, ChapterFileSchema, TimelineSchema } from './core/schema';
import { Timeline } from './core/timeline';
import type { ChapterFile } from './core/types';
import { loadPrecomputed, refreshShelf, type LiveSnapshot } from './services/engine';
import { storage } from './services/storage/db';
import { Start } from './panel/screens/Start';
import { LiveScreen } from './LiveScreen';
import { WrapScreen } from './panel/screens/Wrap';
import { Shelf } from './panel/screens/Shelf';
import { Toast } from './panel/components/Toast';

async function getJSON(url: string) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); }

async function loadMatch() {
  patch({ loadError: undefined });
  try {
    const [m, t, c] = await Promise.all([getJSON('/data/match.json'), getJSON('/data/timeline.json'), getJSON('/data/chapters.json')]);
    const chapters = ChapterFileSchema.parse(c) as ChapterFile;
    patch({ match: parseMatch(m), timeline: new Timeline(TimelineSchema.parse(t)), chapters: chapters.chapters, journeyStart: chapters.journeyStart });
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
    void loadMatch(); void loadPrecomputed(); void refreshShelf();
    void storage.available().then((ok) => patch({ storageOk: ok }));
    void storage.getLive<LiveSnapshot>().then((l) => l?.videoTime !== undefined && patch({ resumable: { roomId: l.roomId, videoTime: l.videoTime, label: l.label } }));
  }, []);

  if (loadError) return (
    <div className="fullscreen-msg" role="alert">
      <p>{loadError}</p>
      <button className="btn btn-primary" onClick={() => void loadMatch()}>Try again</button>
    </div>
  );
  if (!match) return <div className="fullscreen-msg" aria-busy="true"><p className="shimmer">Setting up the room…</p></div>;

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
