// §17.4 end-to-end journeys (v1.3) with a MOCKED YouTube IFrame API (no network video in CI).
// The fake player and the live clock both run at E2E_RATE× real time (?speed=), so ball sync is exercised for real.
import { test, expect, type Page } from '@playwright/test';

const RATE = Number(process.env.E2E_RATE ?? 6);
const isApi = (u: URL) => u.pathname.startsWith('/api/');

/** A tiny stand-in for the IFrame API: real-time clock × rate, seek/pause hooks, volume log, playerVars, onError. */
const FAKE_YT = `
(() => {
  window.YT = { Player: function (el, o) {
    const rate = window.__ytRate || 1; let base = (o.playerVars && o.playerVars.start) || 0, t0 = performance.now(), state = -1, vol = 100;
    window.__ytVars = o.playerVars;
    const now = () => state === 1 ? base + (performance.now() - t0) / 1000 * rate : base;
    const box = document.createElement('div'); box.className = 'fake-yt'; box.textContent = 'Fake YouTube player';
    (typeof el === 'string' ? document.getElementById(el) : el).replaceWith(box);
    const set = (s) => { state = s; o.events && o.events.onStateChange && o.events.onStateChange({ data: s }); };
    this.playVideo = () => { if (state !== 1) { base = now(); t0 = performance.now(); set(1); } };
    this.pauseVideo = () => { base = now(); set(2); };
    this.seekTo = (t) => { base = t; t0 = performance.now(); (window.__seeks = window.__seeks || []).push(t); };
    this.getCurrentTime = () => now(); this.getPlayerState = () => state;
    this.setVolume = (v) => { vol = v; (window.__vols = window.__vols || []).push(v); }; this.getVolume = () => vol;
    this.unMute = () => {}; this.isMuted = () => false; this.destroy = () => {};
    window.__ytFake = { error: (c) => o.events && o.events.onError && o.events.onError({ data: c }), seek: (t) => { base = t; t0 = performance.now(); }, pause: () => this.pauseVideo(), now, state: () => state };
    setTimeout(() => o.events && o.events.onReady && o.events.onReady(), 30);
  } };
  setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(), 0);
})();`;
type Fake = { __ytFake: { error: (c: number) => void; seek: (t: number) => void; pause: () => void; now: () => number; state: () => number }; __ytVars: Record<string, number>; __vols?: number[] };
const ytNow = (page: Page) => page.evaluate(() => (window as unknown as Fake).__ytFake.now());

async function mockYouTube(page: Page, rate = RATE) {
  await page.addInitScript((r) => { (window as unknown as { __ytRate: number }).__ytRate = r; }, rate);
  await page.route('https://www.youtube.com/iframe_api', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_YT }));
}
async function join(page: Page) {
  await page.goto(`/?speed=${RATE}`);
  await expect(page.getByText("Watch with your gang, even when you're apart.")).toBeVisible();
  await expect(page.getByText('AI friends', { exact: false })).toBeVisible(); // FR-002: disclosure before joining
  await page.getByRole('button', { name: 'Join the box' }).click();
  await expect(page.locator('.fake-yt')).toBeVisible();
}
/** Pretend the tab is hidden (or visible again) — what the browser reports when you switch tabs. */
const setHidden = (page: Page, hidden: boolean) => page.evaluate((h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

async function journey(page: Page, opts: { live: boolean }) {
  await join(page);
  // a live broadcast: LIVE badge, no seek/skip/chapters, YouTube controls and keyboard off, mute/volume only
  await expect(page.locator('.live-badge')).toHaveText(/LIVE/);
  await expect(page.getByText(/Jump to/)).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Match volume' })).toBeVisible();
  const vars = (await page.evaluate(() => (window as unknown as Fake).__ytVars));
  expect(vars).toMatchObject({ controls: 0, disablekb: 1, rel: 0 });
  // the one coach hint, then a scene-setting line within seconds of joining
  await expect(page.locator('.coach')).toContainText('to talk');
  await expect(page.locator('.v').first()).toBeVisible({ timeout: 10_000 });
  // ~38 s in (live time): Rohit lbw b Topley, with the gang teasing you on that ball
  await expect(page.locator('.slab', { hasText: 'Rohit' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.ball-w .v')).toHaveCount(2, { timeout: 10_000 });
  // ~1 min: your comeback card (tap or say it)
  const send = page.getByRole('button', { name: 'Send it' });
  await expect(send).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.coach')).toHaveCount(0);
  const line = (await page.locator('.line-text').textContent())!.replace(/[“”]/g, '');
  await send.click();
  await expect(page.locator('.v.self .v-text', { hasText: line.slice(0, 20) })).toBeVisible();
  await page.getByRole('button', { name: 'React: Laughing' }).click();
  await expect(page.locator('.v-react.self .v-emoji', { hasText: '😂' })).toBeVisible();
  // ~2 min: the nudge → step away; the broadcast keeps going (no time-skip), then the catch-up
  await expect(page.locator('.nb-nudge')).toContainText('Step away for 20 s', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Step away' }).click();
  await expect(page.getByText('You stepped away')).toBeVisible();
  await expect(page.locator('.fake-yt')).toBeVisible();
  const t1 = await ytNow(page);
  await page.waitForTimeout(4_000); // 4 s × RATE ≈ 24 live seconds
  expect(await ytNow(page)).toBeGreaterThan(t1 + 3 * RATE);
  await page.getByRole('button', { name: "I'm back" }).click();
  const cu = page.locator('.catchup');
  await expect(cu.locator('.cu-text')).toBeVisible({ timeout: 10_000 });
  if (opts.live) await expect(page.locator('.chip-live').first()).toBeAttached({ timeout: 30_000 }); // lines written live by Gemini
  await page.getByRole('button', { name: 'Back to the banter' }).click();
  // leave whenever you like: the wrap of what YOU watched
  await page.getByRole('button', { name: 'Leave the box' }).click();
  await expect(page.getByRole('heading', { name: 'Top moments' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.top li', { hasText: 'Rohit' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The audio reel' })).toBeVisible();
  await expect(page.getByText('Saved to your memories.')).toBeVisible();
  // extras live behind "More"
  await expect(page.getByRole('button', { name: /Your memories/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Your memories \(1\)/ }).click();
  await expect(page.locator('.mem')).toHaveCount(1);
  return { vols: await page.evaluate(() => (window as unknown as Fake).__vols ?? []) };
}

test('evaluator journey on a mocked YouTube player, AI offline (prepared lines and voices)', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  const { vols } = await journey(page, { live: false });
  // the gang's prepared voices duck the match through player.setVolume: down to 20 while a clip played, then back
  expect(vols.length).toBeGreaterThan(0);
  expect(Math.min(...vols)).toBe(20);
});

test('evaluator journey with live AI (mocked YouTube)', async ({ page }) => {
  test.skip(!!process.env.E2E_NO_LIVE, 'live AI disabled');
  await mockYouTube(page);
  await journey(page, { live: true });
});

test('no seek or pause is possible: a paused or seeked player snaps back to live, nothing is re-delivered', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await join(page);
  await expect(page.locator('.slab', { hasText: 'Rohit' })).toBeVisible({ timeout: 30_000 });
  const n = await page.locator('.v').count();
  const live = await ytNow(page);
  await page.evaluate(() => (window as unknown as Fake).__ytFake.seek(13_840)); // as if someone dragged it back
  await page.waitForTimeout(3_000);
  expect(await ytNow(page)).toBeGreaterThan(live);
  await page.evaluate(() => (window as unknown as Fake).__ytFake.pause()); // as if someone clicked the video
  await page.waitForTimeout(3_000);
  expect(await page.evaluate(() => (window as unknown as Fake).__ytFake.state())).toBe(1);
  expect(await page.locator('.v').count()).toBe(n);
  expect(await page.locator('.slab').count()).toBe(1);
});

test('the live clock keeps running while the tab is hidden; coming back plays the catch-up', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await join(page);
  await expect(page.locator('.v').first()).toBeVisible({ timeout: 10_000 });
  await setHidden(page, true);
  await page.waitForTimeout(8_000); // ≈ 48 live seconds: Rohit's wicket happens while you're gone
  await setHidden(page, false);
  const cu = page.locator('.catchup');
  await expect(cu).toBeVisible({ timeout: 5_000 });
  await expect(cu.locator('.cu-text')).toContainText('Rohit', { timeout: 5_000 });
  await expect(cu.locator('.missed li').first()).toBeVisible();
});

test('embed error → automatic scoreboard fallback at the same ball, still live', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await join(page);
  await expect(page.locator('.v').first()).toBeVisible({ timeout: 15_000 });
  const before = await page.locator('.v').count();
  await page.evaluate(() => (window as unknown as Fake).__ytFake.error(150));
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.getByText("won't play here")).toBeVisible();
  expect(await page.locator('.v').count()).toBeGreaterThanOrEqual(before);
  await expect(page.locator('.slab', { hasText: 'Rohit' })).toBeVisible({ timeout: 40_000 });
});

test('English toggle: new lines are asked for in English, and the choice is remembered', async ({ page }) => {
  await mockYouTube(page);
  const langs: string[] = [];
  await page.route(isApi, (r) => { const b = r.request().postData(); if (b?.startsWith('{')) langs.push(JSON.parse(b).language); return r.abort(); });
  await join(page);
  await expect(page.getByRole('button', { name: 'Hinglish' })).toHaveAttribute('aria-pressed', 'true');
  expect(langs.length).toBeGreaterThan(0);
  expect(langs.every((l) => l === 'hi')).toBe(true);
  langs.length = 0;
  await page.getByRole('button', { name: 'English' }).click();
  await expect.poll(() => langs.length, { timeout: 10_000 }).toBeGreaterThan(0);
  expect(langs.every((l) => l === 'en')).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Join the box' }).click();
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
});

test('mic denied: reactions and the gang’s lines still work (no typing during play)', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: [] });
  const page = await ctx.newPage();
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await join(page);
  await page.getByRole('button', { name: /Hold to talk/ }).dispatchEvent('pointerdown');
  await expect(page.getByText('Mic is off.', { exact: false })).toBeVisible();
  await expect(page.locator('input[type="text"], textarea')).toHaveCount(0);
  await page.getByRole('button', { name: 'React: Fire' }).click();
  await expect(page.locator('.v-react.self')).toBeVisible();
  await ctx.close();
});

test('reload mid-match rejoins the same live room at the live ball', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await join(page);
  await page.getByRole('button', { name: 'React: Crying' }).click();
  await page.waitForTimeout(9_500); // progress is saved every ~8 s
  await page.reload();
  await page.getByRole('button', { name: 'Join the box' }).click();
  await expect(page.locator('.v-react.self .v-emoji', { hasText: '😭' })).toBeVisible();
  await expect(page.getByText('The match kept going live.')).toBeVisible();
});

test('hold-to-talk records a clip; the transcript comes back in Roman Hinglish', async ({ page }) => {
  await mockYouTube(page);
  let lang: string | null = null;
  await page.route((u) => u.pathname === '/api/transcribe', async (r) => {
    const body = r.request().postDataBuffer()?.toString('latin1') ?? '';
    lang = /name="language"\r\n\r\n(\w+)/.exec(body)?.[1] ?? null;
    return r.fulfill({ json: { text: 'Arre Dev, tera Kohli bhi jayega' } });
  });
  await page.route((u) => u.pathname === '/api/reply' || u.pathname === '/api/react' || u.pathname === '/api/speak', (r) => r.abort());
  await join(page);
  const talk = page.getByRole('button', { name: /Hold to talk/ });
  await talk.dispatchEvent('pointerdown');
  await expect(page.locator('.talk.rec .talk-wave')).toBeVisible();
  await page.waitForTimeout(1200);
  await talk.dispatchEvent('pointerup');
  await expect(page.locator('.v.self .v-play')).toBeVisible({ timeout: 3_000 }); // AC-VOICE-1
  await expect(page.locator('.v.self .v-text', { hasText: 'tera Kohli bhi jayega' })).toBeVisible();
  expect(lang).toBe('hi');
  await expect(page.locator('.coach')).toHaveCount(0); // the coach hint goes once you've talked
});

test('/how-it-works: one SVG diagram, four sections, and the language toggle', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'How it works' }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(page.getByRole('img', { name: /Architecture/ })).toBeVisible();
  await expect(page.locator('.diagram svg text', { hasText: 'Ball sync' })).toBeVisible(); // real text, not an image of text
  await expect(page.locator('.how-sec')).toHaveCount(4);
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How Apna Commentary Box works');
  await page.getByRole('button', { name: 'Hinglish' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Apna Commentary Box kaise kaam karta hai');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Apna Commentary Box kaise kaam karta hai');
});
