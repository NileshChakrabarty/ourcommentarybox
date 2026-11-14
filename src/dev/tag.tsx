// DEV-ONLY ball tagging tool (/dev/tag). Never part of the production build (not a Vite build input).
// Plays the embedded match video next to the Cricsheet ball list.
//   Space      stamp the current video time on the selected ball, then select the next ball
//   Backspace  undo the last stamp
//   ← / →      nudge the selected ball by ∓0.5 s        ↑ / ↓  select previous / next ball
//   Enter      seek the video to 3 s before the selected ball
//   Export     download timeline.json (untagged balls re-interpolated, tagged:false)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { parseMatch, TimelineSchema, ChapterFileSchema } from '../core/schema';
import { interpolate, type TimelineEntry } from '../core/timeline';
import type { Match, ChapterFile } from '../core/types';
import { YouTubeSource } from '../services/source/youtube';
import '../styles/global.css';
import './tag.css';

const LS = 'fun-banter-tag-v1';
type Stamp = { seq: number; prev: TimelineEntry };

function TagTool() {
  const [match, setMatch] = useState<Match>();
  const [tl, setTl] = useState<TimelineEntry[]>([]);
  const [chapters, setChapters] = useState<ChapterFile['chapters']>([]);
  const [sel, setSel] = useState(0);
  const [inn, setInn] = useState<1 | 2>(2);
  const [onlyChapters, setOnlyChapters] = useState(true);
  const [now, setNow] = useState(0);
  const undo = useRef<Stamp[]>([]);
  const yt = useRef<YouTubeSource>();
  const mount = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    void (async () => {
      const [m, t, c] = await Promise.all(['/data/match.json', '/data/timeline.json', '/data/chapters.json'].map((u) => fetch(u).then((r) => r.json())));
      const saved = (() => { try { return JSON.parse(localStorage.getItem(LS) ?? 'null'); } catch { return null; } })();
      const match = parseMatch(m);
      setMatch(match); setChapters(ChapterFileSchema.parse(c).chapters);
      setTl(TimelineSchema.parse(saved ?? t) as TimelineEntry[]);
      setSel(ChapterFileSchema.parse(c).chapters[0]?.startBallSeq ?? 0);
      if (mount.current && match.video) yt.current = await YouTubeSource.create({ mount: mount.current, videoId: match.video.id, onError: (w) => alert(`Player error: ${w}`) });
    })();
    const iv = setInterval(() => setNow(yt.current?.getCurrentTime() ?? 0), 100);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { if (tl.length) try { localStorage.setItem(LS, JSON.stringify(tl)); } catch { /* private mode */ } }, [tl]);

  const visible = useMemo(() => {
    if (!match) return [];
    return match.balls.filter((b) => b.innings === inn && (!onlyChapters || chapters.some((c) => b.seq >= c.startBallSeq - 2 && b.seq <= c.endBallSeq + 2)));
  }, [match, inn, onlyChapters, chapters]);

  const setTime = (seq: number, t: number) => setTl((cur) => {
    const raw = cur.map((e) => (e.ballSeq === seq ? { ...e, videoTime: Math.round(t * 10) / 10, tagged: true, src: 'tag' as const } : e));
    return interpolate(raw.map((e) => (e.tagged ? e : { ...e, videoTime: undefined })));
  });
  const step = (d: number) => { const i = visible.findIndex((b) => b.seq === sel); const nb = visible[Math.max(0, Math.min(visible.length - 1, i + d))]; if (nb) setSel(nb.seq); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const cur = tl[sel]; if (!cur) return;
      if (e.code === 'Space') { e.preventDefault(); undo.current.push({ seq: sel, prev: cur }); setTime(sel, yt.current?.getCurrentTime() ?? 0); step(1); }
      else if (e.code === 'Backspace') { e.preventDefault(); const u = undo.current.pop(); if (u) { setTl((c) => interpolate(c.map((x) => (x.ballSeq === u.seq ? u.prev : x)).map((x) => (x.tagged ? x : { ...x, videoTime: undefined })))); setSel(u.seq); } }
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); undo.current.push({ seq: sel, prev: cur }); setTime(sel, cur.videoTime + (e.code === 'ArrowLeft' ? -0.5 : 0.5)); }
      else if (e.code === 'ArrowUp') { e.preventDefault(); step(-1); }
      else if (e.code === 'ArrowDown') { e.preventDefault(); step(1); }
      else if (e.code === 'Enter') { e.preventDefault(); yt.current?.seekTo(cur.videoTime - 3); yt.current?.play(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => { list.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(tl, null, 0).replace(/\},\{/g, '},\n{')], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'timeline.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1_000);
  };
  const fmt = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const counts = { tag: tl.filter((e) => e.src === 'tag').length, scorebug: tl.filter((e) => e.src === 'scorebug').length };

  return (
    <div className="tag">
      <header className="tag-head">
        <h1>Ball tagging <span className="chip">dev only</span></h1>
        <p className="muted small">Space stamp · Backspace undo · ← → nudge 0.5 s · ↑ ↓ select · Enter seek. {counts.tag} manual tags, {counts.scorebug} scorebug anchors. Work is kept in this browser.</p>
        <div className="tag-actions">
          <label><input type="radio" checked={inn === 1} onChange={() => setInn(1)} /> England innings</label>
          <label><input type="radio" checked={inn === 2} onChange={() => setInn(2)} /> India innings</label>
          <label><input type="checkbox" checked={onlyChapters} onChange={(e) => setOnlyChapters(e.target.checked)} /> Chapter balls only</label>
          <button className="btn btn-primary btn-sm" onClick={exportJson}>Export timeline.json</button>
          <button className="btn btn-sm" onClick={() => { if (confirm('Discard local tags and reload the shipped timeline?')) { localStorage.removeItem(LS); location.reload(); } }}>Reset</button>
        </div>
      </header>
      <section className="tag-video"><div className="tag-player" ref={mount} /><p className="num">Video time {fmt(now)}</p></section>
      <ol className="tag-list" ref={list}>
        {visible.map((b) => {
          const e = tl[b.seq];
          return (
            <li key={b.seq} className={`${b.seq === sel ? 'on' : ''} src-${e?.src ?? 'interp'}`} onClick={() => setSel(b.seq)}>
              <span className="num">{b.label}</span><span>{b.text}</span>
              <span className="num">{e ? fmt(e.videoTime) : ''}</span><span className="chip">{e?.src ?? '—'}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><TagTool /></React.StrictMode>);
