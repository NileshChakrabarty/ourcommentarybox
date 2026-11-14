// §17.4 end-to-end journeys (v1.2) with a MOCKED YouTube IFrame API (no network video in CI).
// The fake player runs at E2E_RATE× real time on the real timeline, so chapters and ball sync are exercised for real.
import { test, expect, type Page } from '@playwright/test';

const RATE = Number(process.env.E2E_RATE ?? 6);
const isApi = (u: URL) => u.pathname.startsWith('/api/');

/** A tiny stand-in for the IFrame API: real-time clock × rate, seek, volume log, and a way to raise onError. */
const FAKE_YT = `
(() => {
  window.YT = { Player: function (el, o) {
    const rate = window.__ytRate || 1; let base = (o.playerVars && o.playerVars.start) || 0, t0 = performance.now(), state = -1, vol = 100;
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
    window.__ytFake = { error: (c) => o.events && o.events.onError && o.events.onError({ data: c }), seek: (t) => this.seekTo(t), now };
    setTimeout(() => o.events && o.events.onReady && o.events.onReady(), 30);
  } };
  setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(), 0);
})();`;

async function mockYouTube(page: Page, rate = RATE) {
  await page.addInitScript((r) => { (window as unknown as { __ytRate: number }).__ytRate = r; }, rate);
  await page.route('https://www.youtube.com/iframe_api', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_YT }));
}
async function start(page: Page, hero?: string) {
  await page.goto(`/?speed=${RATE}`); // ?speed only affects the scoreboard fallback's clock
  await expect(page.getByText('are AI friends', { exact: false })).toBeVisible(); // FR-002: disclosure before joining
  if (hero) await page.getByRole('radio', { name: hero }).click();
  await page.getByRole('button', { name: 'Watch with the gang' }).click();
  await expect(page.locator('.fake-yt')).toBeVisible();
}

async function journey(page: Page, opts: { live: boolean }) {
  await start(page);
  // Gang Call for Topley's over → call a wicket before the first ball (calls lock when the over starts)
  await page.getByRole('button', { name: 'Wicket this over' }).click({ timeout: 5_000 });
  // no dead air: a gang line arrives within seconds of the chapter opening
  await expect(page.locator('.v').first()).toBeVisible({ timeout: 15_000 });
  // 2.4 Rohit lbw b Topley: the wicket slab, then your comeback line card (Rohit is your hero)
  await expect(page.locator('.slab', { hasText: 'Rohit' })).toBeVisible({ timeout: 60_000 });
  const send = page.getByRole('button', { name: 'Send it' });
  await expect(send).toBeVisible({ timeout: 10_000 });
  const line = (await page.locator('.line-text').textContent())!.replace(/[“”]/g, '');
  await send.click();
  await expect(page.locator('.v.self .v-text', { hasText: line.slice(0, 20) })).toBeVisible();
  await page.getByRole('button', { name: 'React: Laughing' }).click();

  await expect(page.locator('.v-react.self .v-emoji', { hasText: '😂' })).toBeVisible();
  // the gang nudges you to step away → the panel goes away, the video time-skips (never covered)
  await expect(page.locator('.step.nudge')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Step away' }).click();
  await expect(page.getByText('You stepped away')).toBeVisible();
  await expect(page.locator('.fake-yt')).toBeVisible();
  // call-back from Dev at 11.1 (Kohli at the crease)
  const back = page.getByRole('button', { name: 'Back to the match' });
  await expect(back).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Dev is calling you back')).toBeVisible();
  await back.click();
  // catch-up names every wicket you missed (AC-CATCH-1): Dhawan and Pant
  const cu = page.locator('.catchup');
  await expect(cu.locator('.cu-text')).toBeVisible({ timeout: 10_000 });
  await expect(cu.locator('.cu-text')).toContainText('Dhawan');
  await expect(cu.locator('.cu-text')).toContainText('Pant');
  await page.getByRole('button', { name: 'Back to the banter' }).click();
  // 11.2 Kohli c Buttler b Willey, live on screen after the call-back
  await expect(page.locator('.slab', { hasText: 'Kohli' })).toBeVisible({ timeout: 30_000 });
  if (opts.live) await expect(page.locator('.chip-live').first()).toBeAttached({ timeout: 30_000 }); // lines written live by Gemini
  // jump to the final wicket chapter → skipped balls become a catch-up line, not a burst
  await page.getByRole('button', { name: /The final wicket/ }).click();
  await expect(page.locator('.skip-line').last()).toContainText('Wickets:', { timeout: 15_000 });
  // wrap + memory (FR-020/021)
  await expect(page.getByRole('heading', { name: 'The audio reel' })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('Saved to your memories.')).toBeVisible();
  // the last lines may still be playing on the wrap screen: once the gang is quiet, the volume must be back
  await expect.poll(() => page.evaluate(() => (window as unknown as { __vols?: number[] }).__vols?.at(-1)), { timeout: 20_000 }).not.toBe(20);
  const vols = await page.evaluate(() => (window as unknown as { __vols?: number[] }).__vols ?? []);
  await page.getByRole('button', { name: 'See your memory shelf' }).click();
  await expect(page.locator('.mem')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: /Your memories \(1\)/ }).click(); // AC-MEM-2: survives reload
  await page.locator('.mem').first().click();
  await expect(page.locator('.timeline li').first()).toBeVisible();
  return { vols };
}

test('reviewer journey on a mocked YouTube player, AI offline (fallback lines)', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  const { vols } = await journey(page, { live: false });
  // ducking went through player.setVolume: down to 20 while a clip played, then back to 100
  expect(vols.length).toBeGreaterThan(0);
  expect(Math.min(...vols)).toBe(20);
  expect(vols.at(-1)).toBe(100);
});

test('reviewer journey with live AI (mocked YouTube)', async ({ page }) => {
  test.skip(!!process.env.E2E_NO_LIVE, 'live AI disabled');
  await mockYouTube(page);
  await journey(page, { live: true });
});

test('embed error → automatic scoreboard fallback at the same ball, nothing re-delivered', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await start(page);
  await expect(page.locator('.v').first()).toBeVisible({ timeout: 15_000 });
  const before = await page.locator('.v').count();
  const ball = await page.locator('.nb-label b').textContent();
  await page.evaluate(() => (window as unknown as { __ytFake: { error: (c: number) => void } }).__ytFake.error(150));
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.getByText("couldn't play here")).toBeVisible();
  await expect(page.locator('.nb-label b')).toHaveText(ball!);
  expect(await page.locator('.v').count()).toBeGreaterThanOrEqual(before);
  // and the match carries on in the fallback: Rohit's wicket still lands
  await expect(page.locator('.slab', { hasText: 'Rohit' })).toBeVisible({ timeout: 60_000 });
});

test('seek backwards never re-delivers lines (spoiler rule)', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await start(page);
  await expect(page.locator('.slab', { hasText: 'Rohit' })).toBeVisible({ timeout: 60_000 });
  const n = await page.locator('.v').count();
  await page.evaluate(() => (window as unknown as { __ytFake: { seek: (t: number) => void } }).__ytFake.seek(13_840));
  await expect(page.locator('.nb-label b')).toHaveText('1.6', { timeout: 5_000 });
  await page.waitForTimeout(6_000); // replays balls 2.1–2.4 on screen
  expect(await page.locator('.v').count()).toBe(n);
  expect(await page.locator('.slab').count()).toBe(1);
});

test('mic denied: reactions and the gang’s lines still work (no typing during play)', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: [] });
  const page = await ctx.newPage();
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await start(page);
  await page.getByRole('button', { name: /Hold to talk/ }).dispatchEvent('pointerdown');
  await expect(page.getByText('Mic is off.', { exact: false })).toBeVisible();
  await expect(page.locator('input[type="text"], textarea')).toHaveCount(0);
  await page.getByRole('button', { name: 'React: Fire' }).click();
  await expect(page.locator('.v-react.self')).toBeVisible();
  await ctx.close();
});

test('reload mid-match resumes the room', async ({ page }) => {
  await mockYouTube(page);
  await page.route(isApi, (r) => r.abort());
  await start(page);
  await page.getByRole('button', { name: 'React: Crying' }).click();
  await page.waitForTimeout(9_500); // progress is saved every ~8 s
  await page.reload();
  const resume = page.getByRole('button', { name: /Resume at/ });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page.locator('.v-react.self .v-emoji', { hasText: '😭' })).toBeVisible();
  await expect(page.getByText('Picked up where you left off.')).toBeVisible();
});

test('hold-to-talk records a clip with the fake mic (live waveform while recording)', async ({ page }) => {
  await mockYouTube(page);
  await page.route((u) => u.pathname === '/api/transcribe', (r) => r.fulfill({ json: { text: 'Dev your king is in trouble' } }));
  await page.route((u) => u.pathname === '/api/reply' || u.pathname === '/api/react' || u.pathname === '/api/speak', (r) => r.abort());
  await start(page);
  const talk = page.getByRole('button', { name: /Hold to talk/ });
  await talk.dispatchEvent('pointerdown');
  await expect(page.locator('.talk.rec .talk-wave')).toBeVisible();
  await page.waitForTimeout(1200);
  await talk.dispatchEvent('pointerup');
  await expect(page.locator('.v.self .v-play')).toBeVisible({ timeout: 3_000 }); // AC-VOICE-1
  await expect(page.locator('.v.self .v-text', { hasText: 'king is in trouble' })).toBeVisible();
});
