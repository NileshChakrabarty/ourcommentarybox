import { useRoom, patch } from '../../store/room';
import { FRIENDS } from '../../content/gang';
import { Avatar } from '../components/Avatar';
import { resumeRoom } from '../actions';
import './screens.css';

const SAMPLE: Record<string, string> = {
  dev: 'Bhuvi with the new ball under lights? Bhai, this is going to be beautiful.',
  ritu: "Noted, Dev. I'm keeping receipts on that prediction.",
  sunny: "Relax, India fans. Go grab a chai, I'll call you when it gets close.",
};

export function Landing() {
  const match = useRoom((s) => s.match)!;
  const memories = useRoom((s) => s.memories);
  const resumable = useRoom((s) => s.resumable);

  return (
    <main className="landing">
      <div className="landing-lights" aria-hidden="true" />
      <section className="landing-copy">
        <h1 className="wordmark">Fun-Banter</h1>
        <p className="lede">Your gang's voice commentary, synced to the ball, floating beside whatever you're streaming.</p>
        <ol className="how">
          <li><strong>Pick your side.</strong> Your team, your hero, the player you love to hate.</li>
          <li><strong>Watch with the gang.</strong> Hold to talk. When a friend's hero flops, AI hands you the line.</li>
          <li><strong>Step away if you like.</strong> The gang calls you back for the finish and fills you in.</li>
        </ol>
        <div className="landing-cta">
          <button className="btn btn-primary btn-lg" onClick={() => patch({ screen: 'setup' })}>Join the gang's room</button>
          {resumable && <button className="btn" onClick={() => void resumeRoom()}>Resume your match at {resumable.label}</button>}
          {memories.length > 0 && <button className="btn btn-ghost" onClick={() => patch({ screen: 'shelf' })}>Your memories ({memories.length})</button>}
        </div>
        <p className="disclosure">
          This is a demo. <strong>Dev, Ritu and Sunny are simulated friends</strong>: their words are written live by AI (Google Gemini)
          and voiced by AI (Sarvam). You'll replay {match.shortTitle.replace(' · ', ', ')} from {new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, compressed to about four minutes. Sound on.
        </p>
      </section>

      <section className="landing-gang" aria-label="Your gang tonight">
        {FRIENDS.map((f, i) => (
          <figure key={f.id} className="gang-quote" style={{ '--c': f.colour, '--i': i } as React.CSSProperties}>
            <Avatar m={f} size={44} />
            <figcaption>
              <span className="who">{f.name}</span>
              <blockquote>{SAMPLE[f.id]}</blockquote>
            </figcaption>
          </figure>
        ))}
      </section>

      <footer className="landing-foot">
        Ball-by-ball facts: <a href={match.source.url} target="_blank" rel="noreferrer">{match.source.name}</a> ({match.source.licence}). No broadcast footage; ball descriptions are original.
      </footer>
    </main>
  );
}
