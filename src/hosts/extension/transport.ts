// Side-panel end of the content-script link (ADR-0017). The content script on the YouTube tab connects a port named
// "acb-video" and posts time reports; we validate each one before the VideoElementSource sees it, and send volume back.
import type { VideoReport, VideoTransport } from '../../services/source/video';

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
export function parseReport(m: unknown): VideoReport | undefined {
  if (!m || typeof m !== 'object' || (m as { type?: unknown }).type !== 'time') return undefined;
  const r = m as Record<string, unknown>;
  const t = num(r.t), rate = num(r.rate), volume = num(r.volume);
  if (t === undefined || t < 0 || rate === undefined || volume === undefined) return undefined;
  return { videoId: typeof r.videoId === 'string' ? r.videoId.slice(0, 20) : null, t, rate, volume: Math.max(0, Math.min(1, volume)),
    paused: r.paused === true, ad: r.ad === true, muted: r.muted === true };
}

export function chromeTransport(): VideoTransport {
  const subs = new Set<(r: VideoReport) => void>();
  let port: chrome.runtime.Port | undefined;
  chrome.runtime.onConnect.addListener((p) => {
    if (p.name !== 'acb-video') return;
    port = p; // the most recent YouTube tab wins
    p.onMessage.addListener((m) => { const r = parseReport(m); if (r) subs.forEach((f) => f(r)); });
    p.onDisconnect.addListener(() => { if (port === p) port = undefined; });
  });
  return {
    onReport: (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    setVolume: (v) => { try { port?.postMessage({ type: 'volume', v }); } catch { port = undefined; } },
  };
}
