// WCAG 2.1 AA automated scan (axe-core) of the start screen, the live room and the wrap. The YouTube iframe is
// third-party and excluded; everything we render is scanned.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FAKE_YT = `window.YT={Player:function(el,o){const b=document.createElement('div');b.className='fake-yt';(typeof el==='string'?document.getElementById(el):el).replaceWith(b);let t=(o.playerVars&&o.playerVars.start)||0,s=-1,t0=0;const now=()=>s===1?t+(performance.now()-t0)/1000*6:t;this.playVideo=()=>{if(s!==1){t=now();t0=performance.now();s=1;o.events.onStateChange({data:1})}};this.pauseVideo=()=>{t=now();s=2;o.events.onStateChange({data:2})};this.seekTo=(x)=>{t=x;t0=performance.now()};this.getCurrentTime=now;this.getPlayerState=()=>s;this.setVolume=()=>{};this.getVolume=()=>100;this.unMute=()=>{};this.isMuted=()=>false;this.destroy=()=>{};setTimeout(()=>o.events.onReady(),30)}};setTimeout(()=>window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady(),0);`;
const scan = async (page: import('@playwright/test').Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.player-box').analyze()).violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);

test('no WCAG 2.1 AA violations on start, live room (with a line card) and wrap', async ({ page }) => {
  test.setTimeout(180_000);
  await page.route('https://www.youtube.com/iframe_api', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_YT }));
  await page.route((u) => u.pathname.startsWith('/api/'), (r) => r.abort());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Watch with the gang' })).toBeVisible();
  await page.waitForTimeout(800);
  expect(await scan(page)).toEqual([]);
  await page.getByRole('button', { name: 'Watch with the gang' }).click();
  await expect(page.locator('.line-card')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(600);
  expect(await scan(page)).toEqual([]);
  await page.getByRole('button', { name: 'Finish and see the wrap' }).click();
  await expect(page.getByRole('heading', { name: 'The audio reel' })).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(600);
  expect(await scan(page)).toEqual([]);
});
