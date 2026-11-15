// /how-it-works (v1.3 amendment): one architecture diagram (inline SVG, real text) and four short sections, about a
// two-minute read. The banter-language toggle applies here too (Hinglish by default).
import { useRoom } from '../store/room';
import { LangToggle } from '../panel/components/LangToggle';
import { saveLang, type Lang } from '../services/lang';
import { patch } from '../store/room';
import { go } from '../nav';
import './how.css';

type Copy = {
  title: string; lede: string; back: string; diagramLabel: string;
  d: Record<'video' | 'data' | 'sync' | 'rules' | 'gemini' | 'sarvam' | 'you' | 'panel' | 'proxy' | 'aTime' | 'aBalls' | 'aReveal' | 'aMoment' | 'aLine' | 'aVoice' | 'aText' | 'aStt', string>;
  sections: { h: string; p: string[] }[];
};

const COPY: Record<Lang, Copy> = {
  en: {
    title: 'How Apna Commentary Box works', back: 'Back to the box',
    lede: 'Your gang talks over the match like your own commentary team. Every line is pinned to a ball, so nobody hears about a wicket before their own screen shows it.',
    diagramLabel: 'Architecture: the match video and ball-by-ball data meet in ball sync; moment rules pick what matters; Gemini writes the lines and Sarvam voices them; everything lands in the gang panel pinned to the ball.',
    d: { video: 'Match video', data: 'Ball-by-ball data', sync: 'Ball sync', rules: 'Moment rules', gemini: 'Gemini writes lines', sarvam: 'Sarvam voices them', you: 'You: hold to talk', panel: 'Gang panel: lines pinned to the ball, match audio ducked while friends talk', proxy: 'Our API: keys stay on the server',
      aTime: 'video time', aBalls: 'balls', aReveal: 'ball revealed', aMoment: 'moment + facts', aLine: 'line', aVoice: 'voice clip', aText: 'text, catch-up, wrap', aStt: 'Sarvam speech-to-text' },
    sections: [
      { h: 'How ball sync works', p: [
        'Every ball has a time in the video. Some were tagged by hand, some read off the on-screen scoreboard, the rest filled in between.',
        "Four times a second the panel reads the player's time. When it passes a ball, that ball is revealed, and only then do the lines pinned to it play. Paused, buffering or an ad? Nothing new is revealed.",
      ] },
      { h: 'On any streaming app, as an extension', p: [
        "The same panel runs in a Chrome side panel. A small script on the streaming page reads the <video> element's current time and sends it to the panel. That's the only thing it reads.",
        'For a real match, a live ball-by-ball feed replaces the fixed data, and each friend calibrates their stream delay once (tap when you see the ball bowled), so lines land on their screen even if everyone is on a different delay.',
      ] },
      { h: 'What the AI does', p: [
        'Rules decide when something matters to your gang: your hero is out, a big over, a milestone. Gemini then writes what each friend would say, in their own style, and hands you a comeback you can tap or say.',
        "Sarvam voices the friends in Hinglish or English and turns your voice notes into text. If you step away, Gemini writes your catch-up; at the end, it writes the wrap. Lines are checked: nothing about religion, region, caste or anyone's body.",
      ] },
      { h: "What's real and what's simulated here", p: [
        "Real: the England v India match video (the ECB's own upload, embedded from YouTube), the Cricsheet ball-by-ball data, live calls to Gemini and Sarvam, and your voice.",
        'Simulated: Dev, Ritu and Sunny are AI friends standing in for your gang. And the "live" broadcast is a recording on a live clock: you join India\'s chase in progress, with no pause or rewind, just like TV.',
      ] },
    ],
  },
  hi: {
    title: 'Apna Commentary Box kaise kaam karta hai', back: 'Box mein wapas',
    lede: 'Tera gang match ke upar apni commentary team ki tarah baat karta hai. Har line ek ball pe pinned hai, toh kisi ko wicket ka pata uski screen se pehle nahi chalta.',
    diagramLabel: 'Architecture: match video aur ball-by-ball data ball sync mein milte hain; moment rules decide karte hain kya important hai; Gemini lines likhta hai aur Sarvam unhe awaaz deta hai; sab gang panel mein ball pe pinned aata hai.',
    d: { video: 'Match video', data: 'Ball-by-ball data', sync: 'Ball sync', rules: 'Moment rules', gemini: 'Gemini lines likhta hai', sarvam: 'Sarvam awaaz deta hai', you: 'Tu: hold karke bol', panel: 'Gang panel: lines ball pe pinned, dost bolein toh match ki awaaz dheemi', proxy: 'Hamara API: keys server pe hi rehti hain',
      aTime: 'video time', aBalls: 'balls', aReveal: 'ball reveal', aMoment: 'moment + facts', aLine: 'line', aVoice: 'voice clip', aText: 'text, catch-up, wrap', aStt: 'Sarvam speech-to-text' },
    sections: [
      { h: 'Ball sync kaise hota hai', p: [
        'Har ball ka video mein ek time hai. Kuch haath se tag kiye, kuch screen ke scoreboard se padhe, baaki beech mein fill kiye.',
        'Panel second mein chaar baar player ka time padhta hai. Jab time kisi ball ko paar karta hai, woh ball reveal hoti hai, aur tabhi uspe pinned lines bajti hain. Pause, buffering ya ad? Kuch naya reveal nahi hota.',
      ] },
      { h: 'Kisi bhi streaming app pe, extension ki tarah', p: [
        'Yahi panel Chrome ke side panel mein chalta hai. Streaming page pe ek chhota script <video> element ka current time padhke panel ko bhejta hai. Bas itna hi padhta hai.',
        'Asli match ke liye fixed data ki jagah live ball-by-ball feed aata hai, aur har dost apna stream delay ek baar calibrate karta hai (ball dikhe toh tap karo), taaki sabke alag delay hone pe bhi lines sahi time pe aayein.',
      ] },
      { h: 'AI kya karta hai', p: [
        'Rules decide karte hain kab kuch tere gang ke liye matter karta hai: tera hero out, bada over, milestone. Phir Gemini likhta hai har dost apne style mein kya bolega, aur tujhe ek comeback deta hai jo tu tap kar ya bol sakta hai.',
        'Sarvam dosto ko Hinglish ya English mein awaaz deta hai aur tere voice notes ko text banata hai. Tu step away kare toh Gemini catch-up likhta hai; end mein wrap. Lines check hoti hain: religion, region, caste ya kisi ki body pe kuch nahi.',
      ] },
      { h: 'Yahan kya asli hai, kya simulated', p: [
        'Asli: England v India match video (ECB ka apna upload, YouTube se embedded), Cricsheet ka ball-by-ball data, Gemini aur Sarvam ki live calls, aur teri awaaz.',
        'Simulated: Dev, Ritu aur Sunny AI dost hain jo tere gang ki jagah baithe hain. Aur "live" broadcast ek recording hai jo live clock pe chalti hai: tu India ka chase beech mein join karta hai, bina pause ya rewind ke, bilkul TV jaisa.',
      ] },
    ],
  },
};

function Diagram({ c }: { c: Copy }) {
  const box = (x: number, y: number, w: number, h: number, label: string, cls = '') => (
    <g className={`dg-box ${cls}`}><rect x={x} y={y} width={w} height={h} rx={10} /><text x={x + w / 2} y={y + h / 2} dominantBaseline="middle" textAnchor="middle">{label}</text></g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number, label: string, lx: number, ly: number, anchor: 'start' | 'middle' | 'end' = 'middle') => (
    <g className="dg-arrow"><line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#dg-head)" /><text x={lx} y={ly} textAnchor={anchor}>{label}</text></g>
  );
  return (
    <figure className="diagram">
      <svg viewBox="0 0 760 420" role="img" aria-label={c.diagramLabel}>
        <defs><marker id="dg-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" /></marker></defs>
        <rect className="dg-proxy" x={265} y={204} width={485} height={88} rx={14} />
        <text className="dg-proxy-label" x={740} y={222} textAnchor="end">{c.d.proxy}</text>
        {box(20, 20, 190, 56, c.d.video)}
        {box(285, 20, 190, 56, c.d.sync, 'key')}
        {box(550, 20, 190, 56, c.d.data)}
        {box(285, 120, 190, 56, c.d.rules)}
        {box(285, 226, 190, 56, c.d.gemini)}
        {box(550, 226, 190, 56, c.d.sarvam)}
        {box(20, 226, 190, 56, c.d.you)}
        {box(20, 336, 720, 64, c.d.panel, 'key')}
        {arrow(210, 48, 283, 48, c.d.aTime, 247, 40)}
        {arrow(550, 48, 477, 48, c.d.aBalls, 513, 40)}
        {arrow(380, 76, 380, 118, c.d.aReveal, 388, 101, 'start')}
        {arrow(380, 176, 380, 224, c.d.aMoment, 388, 197, 'start')}
        {arrow(475, 254, 548, 254, c.d.aLine, 512, 246)}
        {arrow(645, 282, 645, 334, c.d.aVoice, 653, 314, 'start')}
        {arrow(380, 282, 380, 334, c.d.aText, 388, 314, 'start')}
        {arrow(115, 282, 115, 334, c.d.aStt, 123, 314, 'start')}
      </svg>
    </figure>
  );
}

export default function HowItWorks() {
  const lang = useRoom((s) => s.lang);
  const c = COPY[lang];
  return (
    <main className="how" lang={lang === 'hi' ? 'hi-Latn' : 'en'}>
      <header className="how-head">
        <a className="how-mark" href="/" onClick={(e) => { e.preventDefault(); go('/'); }}>Apna Box</a>
        <LangToggle onChange={(l) => { saveLang(l); patch({ lang: l }); }} />
      </header>
      <h1>{c.title}</h1>
      <p className="how-lede">{c.lede}</p>
      <Diagram c={c} />
      {c.sections.map((s) => (
        <section key={s.h} className="how-sec">
          <h2>{s.h}</h2>
          {s.p.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
        </section>
      ))}
      <p><a className="btn btn-primary" href="/" onClick={(e) => { e.preventDefault(); go('/'); }}>{c.back}</a></p>
    </main>
  );
}
