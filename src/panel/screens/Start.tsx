// Start (S-1+S-2 merged, v1.2): one tap to watch. Hero is optional and defaults to Rohit; the whole gang backs India.
import { useState } from 'react';
import { useRoom, patch } from '../../store/room';
import { FRIENDS, DEFAULT_SELF_LOYALTY, HERO_CHOICES } from '../../content/gang';
import { Avatar } from '../components/Avatar';
import { startRoom, resumeRoom } from '../actions';
import { Attribution } from '../components/Attribution';
import './screens.css';

const TAG: Record<string, string> = { dev: "Kohli's biggest fan", ritu: 'Pant superfan, keeps receipts', sunny: 'Always expects a collapse' };
const SAMPLE: Record<string, string> = {
  dev: 'Kohli at Lord\'s chasing 247, bhai. Relax, this is done.',
  ritu: "Saving that one, Dev. Receipts are forever.",
  sunny: '247 at Lord\'s with the ball swinging? I\'m nervous already.',
};

export function Start() {
  const match = useRoom((s) => s.match)!;
  const memories = useRoom((s) => s.memories);
  const resumable = useRoom((s) => s.resumable);
  const [hero, setHero] = useState(DEFAULT_SELF_LOYALTY.heroId);
  const P = new Map(match.players.map((p) => [p.id, p]));
  const date = new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="start">
      <section className="start-copy">
        <p className="kicker">Welcome to the box</p>
        <h1 className="wordmark">Our Commentary Box</h1>
        <p className="lede">The best commentary is your friends.</p>
        <p className="sublede">Your gang's voice commentary, pinned to the ball, right beside the match.</p>

        <p className="tonight">
          <strong>{match.title.replace(' · ', ', ')}</strong> at {match.venue.replace(/, London$/, '')}, {date}.
          You and the gang are all backing India in the chase of {match.target}.
        </p>

        <fieldset className="hero-pick">
          <legend>Your hero tonight</legend>
          <div className="hero-chips" role="radiogroup" aria-label="Your hero tonight">
            {HERO_CHOICES.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={hero === id} className={`hero-chip${hero === id ? ' on' : ''}`} onClick={() => setHero(id)}>
                {P.get(id)?.short}
              </button>
            ))}
          </div>
          <p className="hero-story muted">{P.get(hero)?.story}</p>
        </fieldset>

        <div className="start-cta">
          <button className="btn btn-primary btn-lg" onClick={() => startRoom({ ...DEFAULT_SELF_LOYALTY, heroId: hero })}>Watch with the gang</button>
          {resumable && <span className="resume"><span className="resume-q">Back in the box?</span> <button className="btn" onClick={() => void resumeRoom()}>Resume at {resumable.label}</button></span>}
          {memories.length > 0 && <button className="btn btn-ghost" onClick={() => patch({ screen: 'shelf' })}>Your memories ({memories.length})</button>}
        </div>
        <p className="disclosure">
          Dev, Ritu and Sunny are <strong>AI friends</strong>: Google Gemini writes their lines and Sarvam AI voices them. Turn your sound on.
        </p>
      </section>

      <section className="start-gang" aria-label="Your gang tonight">
        {FRIENDS.map((f, i) => (
          <figure key={f.id} className="gang-card" style={{ '--c': f.colour, '--i': i } as React.CSSProperties}>
            <Avatar m={f} size={48} />
            <figcaption>
              <span className="gc-name">{f.name}</span> <span className="gc-tag">{TAG[f.id]}</span>
              <blockquote>{SAMPLE[f.id]}</blockquote>
            </figcaption>
          </figure>
        ))}
      </section>

      <Attribution className="start-foot" />
    </main>
  );
}
