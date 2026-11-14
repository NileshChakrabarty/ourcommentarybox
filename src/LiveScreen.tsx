// Composition root for the live screen: demo shell (left) + portable panel (right).
import { useEffect } from 'react';
import { BrowserChrome } from './shell/BrowserChrome';
import { BroadcastView } from './shell/BroadcastView';
import { Panel } from './panel/screens/Panel';
import { AwayLayer } from './panel/components/AwayLayer';
import { audio } from './services/audio/engine';
import { patch } from './store/room';

export function LiveScreen() {
  useEffect(() => { const off = audio.onSpeaking((id) => patch({ speakingId: id })); return () => { off(); }; }, []);
  return (
    <BrowserChrome>
      <div className="stream-area">
        <BroadcastView />
        <AwayLayer />
      </div>
      <Panel />
    </BrowserChrome>
  );
}
