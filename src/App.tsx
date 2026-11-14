import { useEffect } from 'react';
import { useRoom, patch } from './store/room';
import { parseMatch } from './core/schema';
import { loadPrecomputed, refreshShelf } from './services/engine';
import { storage } from './services/storage/db';
import { Landing } from './panel/screens/Landing';
import { Setup } from './panel/screens/Setup';
import { LiveScreen } from './LiveScreen';
import { WrapScreen } from './panel/screens/Wrap';
import { Shelf } from './panel/screens/Shelf';
import { Toast } from './panel/components/Toast';

async function loadMatch() {
  patch({ loadError: undefined });
  try {
    const r = await fetch('/data/match.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    patch({ match: parseMatch(await r.json()) });
  } catch {
    patch({ loadError: "The match data didn't load. Check your connection and try again." });
  }
}

export function App() {
  const screen = useRoom((s) => s.screen);
  const match = useRoom((s) => s.match);
  const loadError = useRoom((s) => s.loadError);

  useEffect(() => {
    void loadMatch(); void loadPrecomputed(); void refreshShelf();
    void storage.available().then((ok) => patch({ storageOk: ok }));
    void storage.getLive<{ roomId: string; slot: number; label: string }>().then((l) => l && patch({ resumable: { roomId: l.roomId, slot: l.slot, label: l.label } }));
  }, []);

  if (loadError) return (
    <div className="fullscreen-msg" role="alert">
      <p>{loadError}</p>
      <button className="btn btn-primary" onClick={() => void loadMatch()}>Try again</button>
    </div>
  );
  if (!match) return <div className="fullscreen-msg" aria-busy="true"><p>Setting up the room…</p></div>;

  return (
    <>
      {screen === 'landing' && <Landing />}
      {screen === 'setup' && <Setup />}
      {screen === 'live' && <LiveScreen />}
      {screen === 'wrap' && <WrapScreen />}
      {screen === 'shelf' && <Shelf />}
      <Toast />
    </>
  );
}
