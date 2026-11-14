import { useState } from 'react';
import { useRoom, patch } from '../../store/room';
import { FRIENDS, DEFAULT_SELF_LOYALTY } from '../../content/gang';
import { Avatar } from '../components/Avatar';
import { startRoom } from '../actions';
import { recorder } from '../../services/audio/recorder';
import type { Loyalty } from '../../core/types';
import './screens.css';

export function Setup() {
  const match = useRoom((s) => s.match)!;
  const [l, setL] = useState<Loyalty>({ teamId: '' });
  const [mic, setMic] = useState<'idle' | 'ok' | 'denied' | 'unsupported'>('idle');
  const P = new Map(match.players.map((p) => [p.id, p]));
  const byTeam = match.teams.map((t) => ({ t, players: match.players.filter((p) => p.teamId === t.id) }));
  const valid = !!l.teamId && (!l.heroId || l.heroId !== l.villainId);

  const select = (field: 'heroId' | 'villainId', label: string) => (
    <label className="pick">
      <span>{label}</span>
      <select value={l[field] ?? ''} onChange={(e) => setL({ ...l, [field]: e.target.value || undefined })}>
        <option value="">Nobody in particular</option>
        {byTeam.map(({ t, players }) => (
          <optgroup key={t.id} label={t.name}>
            {players.map((p) => <option key={p.id} value={p.id} disabled={field === 'villainId' ? p.id === l.heroId : p.id === l.villainId}>{p.name}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );

  const testMic = async () => {
    const s = await recorder.ensure();
    setMic(s === 'granted' ? 'ok' : s === 'unsupported' ? 'unsupported' : 'denied');
    patch({ mic: s });
  };

  return (
    <main className="setup">
      <header className="setup-head">
        <button className="btn btn-ghost btn-sm" onClick={() => patch({ screen: 'landing' })}>Back</button>
        <div>
          <h1>{match.title.replace(" · ", ", ")}</h1>
          <p className="muted">{match.venue}, {new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. India bat first.</p>
        </div>
      </header>

      <section className="setup-grid">
        <div className="setup-you">
          <h2>Who are you backing?</h2>
          <div className="team-pick" role="radiogroup" aria-label="Your team">
            {match.teams.map((t) => (
              <button key={t.id} role="radio" aria-checked={l.teamId === t.id} className={`team-btn team-${t.id.toLowerCase()}${l.teamId === t.id ? ' on' : ''}`} onClick={() => setL({ ...l, teamId: t.id })}>
                {t.name}
              </button>
            ))}
          </div>
          {select('heroId', 'Your hero')}
          {select('villainId', 'The player you love to hate')}
          {l.heroId && <p className="story muted">{P.get(l.heroId)!.short}: {P.get(l.heroId)!.story}</p>}
          <button className="btn btn-ghost btn-sm" onClick={() => setL(DEFAULT_SELF_LOYALTY)}>Pick for me</button>

          <div className="mic-row">
            <button className="btn btn-sm" onClick={() => void testMic()}>Test mic</button>
            <span className="muted">
              {mic === 'idle' && 'Optional. You can also type or tap reactions.'}
              {mic === 'ok' && 'Mic works. Hold Space or the talk button to speak.'}
              {mic === 'denied' && "Mic is blocked. You can still type and react; allow it in the address bar to talk."}
              {mic === 'unsupported' && "This browser can't record. Type and react instead."}
            </span>
          </div>
        </div>

        <div className="setup-gang">
          <h2>The gang tonight <span className="tag">Simulated</span></h2>
          <ul>
            {FRIENDS.map((f) => (
              <li key={f.id} style={{ '--c': f.colour } as React.CSSProperties}>
                <Avatar m={f} size={40} />
                <div>
                  <strong>{f.name}</strong> <span className="muted">backs {match.teams.find((t) => t.id === f.loyalty.teamId)!.name}</span>
                  <p className="persona">{f.persona}</p>
                  <p className="badges"><span>Hero: {P.get(f.loyalty.heroId!)?.name}</span><span>Can't stand: {P.get(f.loyalty.villainId!)?.name}</span></p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="setup-foot">
        <button className="btn btn-primary btn-lg" disabled={!valid} onClick={() => startRoom(l)}>Start the match</button>
        <span className="muted">{l.teamId ? 'Sound on: the gang talks out loud.' : 'Pick a team to start.'}</span>
      </footer>
    </main>
  );
}
