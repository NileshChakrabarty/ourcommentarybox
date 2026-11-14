import { test, expect, type Page } from '@playwright/test';
const OUT = process.env.OUT!;
const isApi = (u: URL) => u.pathname.startsWith('/api/');
const shot = (p: Page, n: string) => p.screenshot({ path: `${OUT}/${n}.png` });

test('audit all states (AI offline, 1440x900)', async ({ page }) => {
  test.setTimeout(300_000);
  await page.route(isApi, (r) => r.abort());
  const t0 = Date.now(); const log: string[] = []; const mark = (s: string) => log.push(`${((Date.now()-t0)/1000).toFixed(1)}s ${s}`);
  await page.goto('/?speed=3'); await expect(page.getByText('are simulated friends', { exact: false })).toBeVisible(); mark('landing'); await shot(page, '01-landing');
  await page.getByRole('button', { name: "Join the gang's room" }).click(); await shot(page, '02-setup-empty'); mark('setup');
  await page.getByRole('button', { name: 'Pick for me' }).click(); await shot(page, '03-setup-filled');
  await page.getByRole('button', { name: 'Start the match' }).click(); mark('start');
  await page.waitForTimeout(800); await shot(page, '04-live-empty');
  await page.locator('.fi').first().waitFor({ timeout: 60_000 }); mark('first feed item'); await shot(page, '05-first-banter');
  const talk = page.getByRole('button', { name: /Hold to talk/ }); await talk.dispatchEvent('pointerdown');
  await page.getByText(/Recording/).waitFor(); await shot(page, '06-recording'); await page.waitForTimeout(900); await talk.dispatchEvent('pointerup');
  await page.locator('.calls').waitFor({ timeout: 90_000 }); mark('call offer'); await shot(page, '07-call-offer');
  await page.locator('.moment').first().waitFor({ timeout: 90_000 }); mark('moment card'); await shot(page, '08-moment-card');
  await page.locator('.step.nudge').waitFor({ timeout: 200_000 }); mark('nudge'); await shot(page, '09-nudge');
  await page.locator('.step.nudge').click(); await shot(page, '10-away');
  await page.getByRole('button', { name: 'Back to the match' }).waitFor({ timeout: 90_000 }); mark('callback'); await shot(page, '11-callback');
  await page.getByRole('button', { name: 'Back to the match' }).click();
  await page.getByRole('button', { name: 'Rejoin the match' }).waitFor(); await page.waitForTimeout(3500); mark('catchup'); await shot(page, '12-catchup');
  await page.getByRole('button', { name: 'Rejoin the match' }).click(); await page.waitForTimeout(1500); await shot(page, '13-active-banter');
  await page.getByRole('heading', { name: 'The audio reel' }).waitFor({ timeout: 200_000 }); mark('wrap'); await shot(page, '14-wrap');
  await page.getByRole('button', { name: 'See your memory shelf' }).click(); await page.locator('.mem').first().click(); await shot(page, '15-shelf');
  console.log(log.join('\n'));
});

test('error + small viewport states', async ({ page }) => {
  const bad = (u: URL) => u.pathname === '/data/match.json'; await page.route(bad, (r) => r.fulfill({ status: 500 }));
  await page.goto('/'); await page.getByText("didn't load").waitFor(); await shot(page, '16-load-error');
  await page.unroute(bad);
  await page.setViewportSize({ width: 1280, height: 720 }); await page.reload();
  await page.getByRole('button', { name: "Join the gang's room" }).click(); await page.getByRole('button', { name: 'Pick for me' }).click();
  await page.route(isApi, (r) => r.abort());
  await page.getByRole('button', { name: 'Start the match' }).click(); await page.waitForTimeout(6000); await shot(page, '17-live-1280x720');
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500); await shot(page, '18-live-mobile');
});
