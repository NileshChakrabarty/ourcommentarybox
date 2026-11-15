// Start (v1.3): one line and one button. No sign-up, no forms, no settings (ADR-0015).
// The gang is created for you: you plus three AI friends, labelled as AI. If a live room from before a reload is
// still on air, the same button rejoins it at the live ball.
import { useRoom } from '../../store/room';
import { FRIENDS } from '../../content/gang';
import { Avatar } from '../../panel/components/Avatar';
import { joinBox, resumeBox } from './actions';
import { Attribution } from '../../panel/components/Attribution';
import { go } from '../../nav';
import '../../panel/screens/screens.css';

export function Start() {
  const resumable = useRoom((s) => s.resumable);
  const join = () => { if (resumable) void resumeBox().then((ok) => { if (!ok) joinBox(); }); else joinBox(); };

  return (
    <main className="start">
      <section className="start-copy">
        {/* The box with the gang already in it: their balls sit on the sill, your seat is the empty one. */}
        <div className="box">
          <h1 className="wordmark"><span>Apna</span> <span>Commentary</span> <span>Box</span></h1>
          <div className="box-sill" aria-hidden="true">
            {FRIENDS.map((f) => <Avatar key={f.id} m={f} size={36} />)}
            <span className="box-seat" />
          </div>
        </div>
        <p className="lede">Watch with your gang, even when you're apart.</p>
        <div className="start-cta">
          <button className="btn btn-primary btn-lg" onClick={join}>Join the box</button>
        </div>
        <p className="disclosure">
          Your gang tonight: you, plus Dev, Ritu and Sunny, who are <strong>AI friends</strong>. Gemini writes their lines and Sarvam voices them. Sound on.
        </p>
      </section>
      <footer className="start-foot">
        <a href="/how-it-works" onClick={(e) => { e.preventDefault(); go('/how-it-works'); }}>How it works</a>
        <Attribution />
      </footer>
    </main>
  );
}
