// Apna Box content script (ADR-0017). Runs on youtube.com/watch pages and does ONE thing: when the page is the demo
// match (v=UnRMj4ZC12o), it reads the <video> element's time, play state, ad state and volume four times a second and
// sends them to the Apna Box side panel. It never reads anything else on the page and never sends anything off the
// machine. The side panel may ask it to set the video's volume (to duck the match while a friend talks).
(() => {
  const MATCH = 'UnRMj4ZC12o';
  const NAME = 'acb-video';
  let port = null;
  let lastTry = 0;
  const videoId = () => new URLSearchParams(location.search).get('v');
  const video = () => document.querySelector('#movie_player video') || document.querySelector('video.html5-main-video') || document.querySelector('video');

  function connect() {
    if (port || Date.now() - lastTry < 2000) return; // the side panel may be closed: retry every 2 s, quietly
    lastTry = Date.now();
    try {
      const p = chrome.runtime.connect({ name: NAME });
      p.onDisconnect.addListener(() => { void chrome.runtime.lastError; if (port === p) port = null; });
      p.onMessage.addListener((m) => {
        if (!m || m.type !== 'volume') return;
        const v = video(); const n = Number(m.v);
        if (v && Number.isFinite(n)) v.volume = Math.max(0, Math.min(100, n)) / 100;
      });
      port = p;
    } catch { port = null; } // extension reloaded: this page's script is orphaned until the tab reloads
  }

  setInterval(() => {
    if (videoId() !== MATCH) { if (port) { try { port.disconnect(); } catch { /* gone */ } port = null; } return; }
    const v = video();
    if (!v) return;
    connect();
    if (!port) return;
    const player = document.getElementById('movie_player');
    try {
      port.postMessage({ type: 'time', videoId: MATCH, t: v.currentTime, paused: v.paused || v.ended, rate: v.playbackRate,
        ad: !!player && player.classList.contains('ad-showing'), volume: v.volume, muted: v.muted });
    } catch { port = null; }
  }, 250);
})();
