// Press-and-hold to talk (pointer, or hold Space anywhere). Max 5 s, auto-stop; < 300 ms discarded (F-VOICE).
// While recording, a live waveform shows the mic is actually hearing you.
import { useCallback, useEffect, useRef, useState } from 'react';
import { recorder, MAX_CLIP_MS } from '../../services/audio/recorder';
import { audio } from '../../services/audio/engine';
import { engine } from '../../services/engine';
import { useRoom, patch } from '../../store/room';

const BARS = 24;

export function TalkButton() {
  const mic = useRoom((s) => s.mic);
  const recording = useRoom((s) => s.recording);
  const away = useRoom((s) => !!s.away?.active);
  const [left, setLeft] = useState(MAX_CLIP_MS);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const holding = useRef(false);
  const raf = useRef(0);

  const stop = useCallback(async () => {
    if (!holding.current) return;
    holding.current = false;
    cancelAnimationFrame(raf.current);
    patch({ recording: false });
    const r = await recorder.stop();
    if (r) void engine?.sendClip(r.blob, r.durationMs);
  }, []);

  const start = useCallback(async () => {
    if (holding.current || away) return;
    holding.current = true;
    const st = await recorder.ensure(audio.ctx);
    patch({ mic: st });
    if (st !== 'granted' || !holding.current) { holding.current = false; return; }
    if (!recorder.start(() => void stop())) { holding.current = false; return; }
    patch({ recording: true });
    const t0 = Date.now();
    let frame = 0;
    const loop = () => {
      setLeft(Math.max(0, MAX_CLIP_MS - (Date.now() - t0)));
      if (frame++ % 3 === 0) setLevels((l) => [...l.slice(1), recorder.level()]);
      raf.current = requestAnimationFrame(loop);
    };
    loop();
  }, [away, stop]);

  useEffect(() => {
    const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement; return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable; };
    // Hold Space anywhere to talk. If a button has focus, a quick tap (< 250 ms) still presses that button.
    let downAt = 0; let downOn: HTMLElement | null = null;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing(e)) return;
      e.preventDefault();
      if (e.repeat) return;
      downAt = Date.now(); downOn = (e.target as HTMLElement).tagName === 'BUTTON' ? e.target as HTMLElement : null;
      void start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing(e)) return;
      e.preventDefault();
      if (holding.current) void stop();
      if (downOn && Date.now() - downAt < 250) downOn.click();
      downOn = null;
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [start, stop]);

  if (mic === 'denied' || mic === 'unsupported') {
    return (
      <div className="talk-off" role="status">
        <span>{mic === 'denied' ? 'Mic is off. React or send the gang’s lines instead.' : "This browser can't record. React or send the gang’s lines instead."}</span>
        {mic === 'denied' && <button className="btn btn-sm btn-ghost" onClick={() => void recorder.ensure(audio.ctx).then((s) => patch({ mic: s }))}>Try the mic again</button>}
      </div>
    );
  }
  return (
    <button
      className={`talk${recording ? ' rec' : ''}`}
      disabled={away}
      onPointerDown={(e) => { e.preventDefault(); try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ } void start(); }}
      onPointerUp={() => void stop()}
      onPointerCancel={() => void stop()}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Hold to talk to the gang. You can also hold the Space bar."
    >
      {recording ? (
        <>
          <span className="talk-wave" aria-hidden="true">{levels.map((v, i) => <i key={i} style={{ '--v': Math.min(1, v * 1.6) } as React.CSSProperties} />)}</span>
          <span className="talk-time num">{(left / 1000).toFixed(1)}s</span>
        </>
      ) : <span>Hold to talk <kbd>Space</kbd></span>}
    </button>
  );
}
