// Audio: the gang clip queue (F-QUEUE, clips never overlap) and ducking (F-DUCK). Ducking goes through the match
// source (YouTube player.setVolume, or the scoreboard's crowd volume) via an injected Ducker. The synthesized crowd
// is only used by the scoreboard fallback (there is no real broadcast audio there).
export const QUEUE_GAP_MS = 150;
export const QUEUE_CAP = 5;

export interface QueuedClip {
  id: string; src: Blob | string;
  onStart?: () => void; onEnd?: (played: boolean) => void;
}

class AudioEngine {
  ctx?: AudioContext;
  private match?: GainNode;     // everything "broadcast" goes through here → ducked
  private crowd?: GainNode;
  private crowdSrc?: AudioBufferSourceNode;
  private crowdBase = 0.05;
  private muted = false;
  private queue: QueuedClip[] = [];
  private playing?: { clip: QueuedClip; el: HTMLAudioElement; url?: string };
  private listeners = new Set<(speakingId?: string) => void>();
  ducked = false;

  private ducker?: { duck(): void; restore(): void };
  /** The match source's ducker (player.setVolume ramp). */
  setDucker(d?: { duck(): void; restore(): void }) { this.ducker = d; }

  /** Must be called from a user gesture (Start button) to satisfy autoplay policies. */
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    try { this.ctx = new AudioContext(); } catch { /* no Web Audio: clips still play via <audio> */ }
  }

  /** Scoreboard fallback only: synthesized crowd ambience, volume follows the source's setVolume (0–100). */
  startCrowd() {
    const ctx = this.ctx;
    if (!ctx || this.crowd) return;
    try {
      this.match = ctx.createGain(); this.match.gain.value = 1; this.match.connect(ctx.destination);
      // Crowd: looping pink-ish noise through band-pass filters.
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527;
          d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
        }
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      this.crowd = ctx.createGain(); this.crowd.gain.value = this.crowdBase;
      src.connect(bp).connect(lp).connect(this.crowd).connect(this.match);
      src.start();
      this.crowdSrc = src;
    } catch { /* no Web Audio: run silent */ }
  }
  setCrowdVolume(v: number) {
    const ctx = this.ctx, g = this.match?.gain;
    if (!ctx || !g) return;
    g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(Math.max(0, Math.min(1, v / 100)), ctx.currentTime);
  }
  stopCrowd() {
    try { this.crowdSrc?.stop(); } catch { /* already stopped */ }
    this.crowdSrc?.disconnect(); this.crowdSrc = undefined;
    if (this.match) { this.match.disconnect(); this.match = undefined; this.crowd = undefined; }
  }

  /** Crowd reaction for a ball result: 0 = calm, 1 = boundary, 2 = six / wicket. */
  swell(level: 0 | 1 | 2) {
    const ctx = this.ctx, g = this.crowd?.gain;
    if (!ctx || !g || this.muted) return;
    const now = ctx.currentTime;
    const peak = [this.crowdBase, 0.16, 0.3][level];
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(peak, now + 0.25);
    g.exponentialRampToValueAtTime(Math.max(this.crowdBase, 0.001), now + (level ? 3.2 : 0.6));
    if (level) this.crack();
  }
  private crack() {
    const ctx = this.ctx; if (!ctx || !this.match) return;
    const n = Math.floor(ctx.sampleRate * 0.05);
    const b = ctx.createBuffer(1, n, ctx.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    const s = ctx.createBufferSource(); s.buffer = b;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const g = ctx.createGain(); g.gain.value = 0.5;
    s.connect(hp).connect(g).connect(this.match); s.start();
  }
  setMuted(m: boolean) {
    this.muted = m;
    const ctx = this.ctx, g = this.crowd?.gain;
    if (ctx && g) { g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(m ? 0 : this.crowdBase, ctx.currentTime); }
  }
  get isMuted() { return this.muted; }

  private duck(on: boolean) {
    if (on === this.ducked) return;
    this.ducked = on;
    if (on) this.ducker?.duck(); else this.ducker?.restore();
  }

  onSpeaking(fn: (id?: string) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(id?: string) { this.listeners.forEach((f) => f(id)); }

  /** Enqueue a clip. Returns false if dropped because the queue is full (shown as transcript only). */
  enqueue(clip: QueuedClip): boolean {
    if (this.queue.length >= QUEUE_CAP) { clip.onEnd?.(false); return false; }
    this.queue.push(clip);
    if (!this.playing) this.next();
    return true;
  }
  get busy() { return !!this.playing || this.queue.length > 0; }
  clear() {
    this.queue.forEach((c) => c.onEnd?.(false)); this.queue = [];
    if (this.playing) { this.playing.el.pause(); this.finish(false); }
  }

  private next() {
    const clip = this.queue.shift();
    if (!clip) { this.duck(false); this.emit(undefined); return; }
    this.duck(true);
    const url = typeof clip.src === 'string' ? clip.src : URL.createObjectURL(clip.src);
    const el = new Audio(url);
    this.playing = { clip, el, url: typeof clip.src === 'string' ? undefined : url };
    el.onended = () => this.finish(true);
    el.onerror = () => this.finish(false);
    clip.onStart?.(); this.emit(clip.id);
    el.play().catch(() => this.finish(false));
  }
  private finish(played: boolean) {
    const p = this.playing; if (!p) return;
    this.playing = undefined;
    if (p.url) URL.revokeObjectURL(p.url);
    p.clip.onEnd?.(played);
    if (this.queue.length) setTimeout(() => this.next(), QUEUE_GAP_MS);
    else { this.duck(false); this.emit(undefined); }
  }
}

export const audio = new AudioEngine();
