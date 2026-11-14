// Hold-to-talk recorder (F-VOICE). Max 5 s, clips < 300 ms discarded.
export const MAX_CLIP_MS = 5_000;
export const MIN_CLIP_MS = 300;

export type MicState = 'unknown' | 'granted' | 'denied' | 'unsupported';
const MIME = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export class Recorder {
  private stream?: MediaStream;
  private rec?: MediaRecorder;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private stopTimer?: ReturnType<typeof setTimeout>;
  private analyser?: AnalyserNode;
  private resolveStop?: (r: { blob: Blob; durationMs: number } | null) => void;
  state: MicState = 'unknown';
  mime = '';

  static supported() {
    return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  }

  async ensure(ctx?: AudioContext): Promise<MicState> {
    if (!Recorder.supported()) return (this.state = 'unsupported');
    if (this.stream) return (this.state = 'granted');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      this.mime = MIME.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      if (ctx) {
        this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256;
        ctx.createMediaStreamSource(this.stream).connect(this.analyser);
      }
      return (this.state = 'granted');
    } catch { return (this.state = 'denied'); }
  }

  /** 0..1 input level for the live meter */
  level(): number {
    if (!this.analyser) return 0;
    const d = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(d);
    let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v - 128));
    return Math.min(1, peak / 64);
  }

  get recording() { return this.rec?.state === 'recording'; }

  start(onAutoStop?: () => void) {
    if (!this.stream || this.recording) return false;
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream, this.mime ? { mimeType: this.mime } : undefined);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => {
      const durationMs = Date.now() - this.startedAt;
      const blob = new Blob(this.chunks, { type: this.rec?.mimeType || this.mime || 'audio/webm' });
      this.resolveStop?.(durationMs < MIN_CLIP_MS || blob.size === 0 ? null : { blob, durationMs: Math.min(durationMs, MAX_CLIP_MS) });
      this.resolveStop = undefined;
    };
    this.startedAt = Date.now();
    this.rec.start(100);
    this.stopTimer = setTimeout(() => onAutoStop?.(), MAX_CLIP_MS);
    return true;
  }

  stop(): Promise<{ blob: Blob; durationMs: number } | null> {
    clearTimeout(this.stopTimer);
    if (!this.rec || this.rec.state !== 'recording') return Promise.resolve(null);
    return new Promise((res) => { this.resolveStop = res; this.rec!.stop(); });
  }
}

export const recorder = new Recorder();
