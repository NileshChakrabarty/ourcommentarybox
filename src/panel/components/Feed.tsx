// The ball rail: each ball that has banter gets a chip on the rail; voices hang off the ball they were said on.
// Wickets get the one bold element in the app: the red slab.
import { useEffect, useRef } from 'react';
import { useRoom } from '../../store/room';
import { engine } from '../../services/engine';
import type { FeedItem, Member } from '../../core/types';

function Voice({ it, m, playing }: { it: FeedItem; m: Member; playing: boolean }) {
  const name = m.isSelf ? 'You' : m.name;
  if (it.kind === 'reaction') return <li className={`v v-react${m.isSelf ? ' self' : ''}`} style={{ '--c': m.colour } as React.CSSProperties}><span className="v-who">{name}</span> <span className="v-emoji">{it.emoji}</span></li>;
  const hasAudio = it.kind === 'clip';
  return (
    <li className={`v${m.isSelf ? ' self' : ''}${playing ? ' playing' : ''}${it.unheard ? ' unheard' : ''}`} style={{ '--c': m.colour } as React.CSSProperties}>
      <span className="v-dot" aria-hidden="true" />
      <div className="v-body">
        <div className="v-head">
          <span className="v-who">{name}</span>
          {playing && <span className="v-eq" aria-hidden="true"><i /><i /><i /><i /></span>}
          {it.unheard && <span className="chip">Missed</span>}
          {it.source === 'live' && !m.isSelf && <span className="chip chip-live" title="Written just now by Gemini, voiced by Sarvam">live AI</span>}
        </div>
        {it.text ? <p className="v-text">{it.text}</p>
          : it.transcriptStatus === 'pending' ? <p className="v-text shimmer">Transcribing…</p>
          : it.transcriptStatus === 'failed' ? <p className="v-text muted">Voice note</p> : null}
      </div>
      {hasAudio && (
        <button className="v-play" onClick={() => engine?.playItem(it)} aria-label={`Play ${m.isSelf ? 'your' : `${m.name}'s`} voice: ${it.text ?? 'voice note'}`}>
          <span aria-hidden="true">▶</span>{it.durationMs ? <span className="num">{Math.round(it.durationMs / 1000)}s</span> : null}
        </button>
      )}
    </li>
  );
}

export function Feed() {
  const feed = useRoom((s) => s.feed);
  const members = useRoom((s) => s.members);
  const match = useRoom((s) => s.match)!;
  const plan = useRoom((s) => s.plan);
  const position = useRoom((s) => s.position);
  const speakingId = useRoom((s) => s.speakingId);
  const ref = useRef<HTMLDivElement>(null);
  const byId = new Map(members.map((m) => [m.id, m]));
  const P = new Map(match.players.map((p) => [p.id, p.short]));

  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [feed.length]);

  const groups: { seq: number; items: FeedItem[] }[] = [];
  for (const it of feed) {
    const g = groups.at(-1);
    if (g && g.seq === it.anchorSeq && it.kind !== 'skip') g.items.push(it); else groups.push({ seq: it.anchorSeq, items: [it] });
  }
  const playingId = speakingId ? [...feed].reverse().find((f) => f.memberId === speakingId && f.kind === 'clip')?.id : undefined;

  return (
    <div className="feed" ref={ref} aria-live="polite" aria-label="Gang commentary, newest at the bottom">
      {feed.length === 0 && <p className="feed-empty">{position < 0 ? 'The gang is settling in. First ball any second.' : 'Quiet so far. Hold Space and say something.'}</p>}
      <ol className="rail">
        {groups.map((g) => {
          const b = match.balls[g.seq];
          if (g.items[0].kind === 'skip') return <li key={g.items[0].id} className="skip-row"><span className="skip-line">{g.items[0].text}</span></li>;
          const out = b.wicket;
          const snap = plan?.snaps[g.seq];
          const line = out && snap ? snap.batters[out.playerOutId] : undefined;
          const tone = out ? 'w' : b.runsBat === 6 ? 'six' : b.runsBat === 4 ? 'four' : '';
          return (
            <li key={`${g.seq}-${g.items[0].id}`} className={`ball${tone ? ` ball-${tone}` : ''}`}>
              <span className="ball-chip num" aria-label={`Ball ${b.label}`}>{b.label}</span>
              <div className="ball-body">
                {out ? (
                  <div className="slab" role="note">
                    <span className="slab-big">Wicket</span>
                    <span className="slab-line">{P.get(out.playerOutId)} {line ? <span className="num">{line.runs} ({line.balls})</span> : null}. {b.text.replace(/^(RUN )?OUT! /, '')}</span>
                  </div>
                ) : <p className="ball-text">{b.text}</p>}
                <ol className="voices">{g.items.map((it) => <Voice key={it.id} it={it} m={byId.get(it.memberId)!} playing={it.id === playingId} />)}</ol>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
