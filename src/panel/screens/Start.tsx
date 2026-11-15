// Start (S-1+S-2 merged, v1.2): one tap to watch. Hero is optional and defaults to Rohit; the whole gang backs India.
import { useState } from 'react';
import { useRoom, patch } from '../../store/room';
import { FRIENDS, DEFAULT_SELF_LOYALTY, HERO_CHOICES } from '../../content/gang';
import { Avatar } from '../components/Avatar';
import { startRoom, resumeRoom } from '../actions';
import { Attribution } from '../components/Attribution';
import './screens.css';

const TAG: Record<string, string> = { dev: "Kohli's biggest fan", ritu: 'Pant superfan, keeps receipts', sunny: 'Always expects a collapse' };
// The gang's pre-match chatter, in the order it's said: Sunny welcomes you, Dev boasts, Ritu files it away.
const SAMPLE: { id: string; line: string }[] = [
  { id: 'sunny', line: "Welcome to the box. 247 at Lord's with the ball swinging? I'm nervous already." },
  { id: 'dev', line: "Relax, Sunny. Kohli at Lord's chasing 247, bhai. This is done." },
  { id: 'ritu', line: 'Saving that one, Dev. Receipts are forever.' },
];

export function Start() {
  const match = useRoom((s) => s.match)!;
  const memories = useRoom((s) => s.memories);
  const resumable = useRoom((s) => s.resumable);
  const [hero, setHero] = useState(DEFAULT_SELF_LOYALTY.heroId);
  const P = new Map(match.players.map((p) => [p.id, p]));
  const team = (id: string) => match.teams.find((t) => t.id === id)!;
  const first = team(match.battingFirst), chasing = team(match.chasing);
  const seats = SAMPLE.map(({ id }) => FRIENDS.find((f) => f.id === id)!);
  const date = new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="start">
      <section className="start-copy">
        {/* The box with the gang already in it: their balls sit on the sill, your seat is the empty one. */}
        <div className="box">
          <h1 className="wordmark"><span>Our</span> <span>Commentary</span> <span>Box</span></h1>
          <div className="box-sill" aria-hidden="true">
            {seats.map((f) => <Avatar key={f.id} m={f} size={36} />)}
            <span className="box-seat" />
          </div>
        </div>
        <p className="lede">The best commentary is your friends.</p>
        <p className="sublede">Your gang's voice notes, pinned to the ball, right beside the match.</p>

        <div className="fixture">
          <p className="fx-score">
            <span className="fx-team" style={{ '--t': first.colour } as React.CSSProperties}>{first.name} {match.target - 1}</span>
            <span className="fx-need" style={{ '--t': chasing.colour } as React.CSSProperties}>{chasing.name} need {match.target} off {match.overs} overs</span>
          </p>
          <p className="fx-meta">{match.title.split(' · ')[1] ?? match.title} at {match.venue.replace(/, London$/, '')}, {date}. The whole gang is backing {chasing.name}.</p>
        </div>

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
      </section>

      <section className="start-gang" aria-label="Your gang tonight">
        <ol className="box-talk">
          {SAMPLE.map(({ id, line }, i) => {
            const f = FRIENDS.find((x) => x.id === id)!;
            return (
              <li key={id} className="bt-row" style={{ '--c': f.colour, '--i': i } as React.CSSProperties}>
                <Avatar m={f} size={40} />
                <p className="bt-who"><span className="bt-name">{f.name}</span> <span className="bt-tag">{TAG[id]}</span></p>
                <blockquote className="bt-line">{line}</blockquote>
              </li>
            );
          })}
          <li className="bt-row bt-you" style={{ '--i': SAMPLE.length } as React.CSSProperties}>
            <span className="bt-seat" aria-hidden="true" />
            <p className="bt-who"><span className="bt-name">You</span></p>
            <p className="bt-line">Your seat. Hold to talk once the match starts.</p>
          </li>
        </ol>
        <p className="disclosure">
          Dev, Ritu and Sunny are <strong>AI friends</strong>: Google Gemini writes their lines and Sarvam AI voices them. Turn your sound on.
        </p>
      </section>

      <Attribution className="start-foot" />
    </main>
  );
}
