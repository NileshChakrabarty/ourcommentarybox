// Press-and-hold to talk (pointer or Space). Max 5 s, auto-stop; < 300 ms discarded (F-VOICE).
import { useCallback, useEffect, useRef, useState } from 'react';
import { recorder, MAX_CLIP_MS } from '../../services/audio/recorder';
import { audio } from '../../services/audio/engine';
import { engine } from '../../services/engine';
import { useRoom, patch } from '../../store/room';

export function TalkButton() {
  const mic = useRoom((s) => s.mic);
  const recording = useRoom((s) => s.recording);
  const away = useRoom((s) => !!s.away?.active);
  const [left, setLeft] = useState(MAX_CLIP_MS);
  const [level, setLevel] = useState(0);
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
    const loop = () => { setLeft(Math.max(0, MAX_CLIP_MS - (Date.now() - t0))); setLevel(recorder.level()); raf.current = requestAnimationFrame(loop); };
    loop();
  }, [away, stop]);

  useEffect(() => {
    const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement; return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable; };
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat && !typing(e)) { e.preventDefault(); void start(); } };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space' && !typing(e)) { e.preventDefault(); void stop(); } };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [start, stop]);

  if (mic === 'denied' || mic === 'unsupported') {
    return (
      <div className="talk-off" role="status">
        <span>{mic === 'denied' ? 'Mic off. Type or react instead.' : "This browser can't record. Type or react instead."}</span>
        {mic === 'denied' && <button className="btn btn-sm btn-ghost" onClick={() => void recorder.ensure(audio.ctx).then((s) => patch({ mic: s }))}>Try mic again</button>}
      </div>
    );
  }
  return (
    <button
      className={`talk${recording ? ' rec' : ''}`}
      style={{ '--lvl': level } as React.CSSProperties}
      disabled={away}
      onPointerDown={(e) => { e.preventDefault(); try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ } void start(); }}
      onPointerUp={() => void stop()}
      onPointerCancel={() => void stop()}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Hold to talk. You can also hold the Space bar."
    >
      <span className="talk-ring" aria-hidden="true" />
      {recording ? <span className="num">Recording… {(left / 1000).toFixed(1)}s</span> : <span>Hold to talk <kbd>Space</kbd></span>}
    </button>
  );
}
