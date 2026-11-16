// Manual verification (not CI): load the unpacked extension in Chromium, open the match on youtube.com, open the
// side panel page, and check the panel's ball follows the real <video> time. Needs network + the dev server (5173).
// Run: npm run build:extension && node tests/extension/verify.mjs [outDir]
import { chromium } from '@playwright/test';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const OUT = process.argv[2] ?? '.';
const EXT = resolve('extension/dist');
const tl = JSON.parse(readFileSync('public/data/timeline.json', 'utf8'));
const match = JSON.parse(readFileSync('public/data/match.json', 'utf8'));
const ballAt = (t) => { let a = -1; for (const e of tl) if (e.videoTime <= t) a = e.ballSeq; return a; };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'acb-ext-')), {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
let [sw] = ctx.serviceWorkers();
sw ??= await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
log('extension loaded, id', id);

const yt = await ctx.newPage();
await yt.goto('https://www.youtube.com/watch?v=UnRMj4ZC12o&t=13925s', { waitUntil: 'domcontentloaded' });
// consent wall (EU) — accept if shown
const consent = yt.getByRole('button', { name: /Accept all|Reject all/ });
if (await consent.first().isVisible({ timeout: 5000 }).catch(() => false)) { await consent.first().click(); log('consent dismissed'); }
await yt.waitForSelector('video', { timeout: 30_000 });
await yt.evaluate(() => { const v = document.querySelector('video'); v.muted = true; return v.play().catch(() => null); });
log('youtube video element found');

const panel = await ctx.newPage();
await panel.setViewportSize({ width: 420, height: 800 });
await panel.goto(`chrome-extension://${id}/sidepanel.html`);
const joinBtn = panel.getByRole('button', { name: 'Join the box' });
await joinBtn.waitFor({ timeout: 60_000 });
log('side panel connected to the YouTube tab: "Join the box" is offered');
await panel.screenshot({ path: join(OUT, 'ext-1-start.png') });
await joinBtn.click();

const samples = [];
for (let i = 0; i < 8; i++) {
  await panel.waitForTimeout(4000);
  const vt = await yt.evaluate(() => { const v = document.querySelector('video'); const p = document.getElementById('movie_player'); return { t: v.currentTime, paused: v.paused, ad: !!p?.classList.contains('ad-showing') }; });
  const label = (await panel.locator('.nb-label b').textContent().catch(() => null)) ?? '(none)';
  const expected = ballAt(vt.t) >= 0 ? match.balls[ballAt(vt.t)].label : '(none)';
  samples.push({ videoT: vt.t.toFixed(1), paused: vt.paused, ad: vt.ad, panel: label, expected });
  log(`video ${vt.t.toFixed(1)} s${vt.paused ? ' (paused)' : ''}${vt.ad ? ' (ad)' : ''} → panel shows ball ${label}, timeline says ${expected}`);
}
await panel.screenshot({ path: join(OUT, 'ext-2-live.png') });
await yt.screenshot({ path: join(OUT, 'ext-yt.png') });
// the viewer seeks with YouTube's own controls: forward past Rohit's wicket
await yt.evaluate(() => { document.querySelector('video').currentTime = 13945; });
await panel.waitForTimeout(12_000);
const slab = await panel.locator('.slab').first().textContent().catch(() => null);
const lines = await panel.locator('.v .v-text').allTextContents();
log('after the viewer seeks to 13945 s: slab =', slab, '| lines:', lines.length);
for (const l of lines.slice(-4)) log('  ', l);
await panel.screenshot({ path: join(OUT, 'ext-3-wicket.png') });
const ok = samples.filter((s) => !s.ad && s.panel === s.expected).length;
log(`sync: ${ok}/${samples.filter((s) => !s.ad).length} samples matched the timeline`);
await ctx.close();
