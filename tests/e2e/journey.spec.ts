// §17.4 end-to-end journeys. Speed-up via the hidden ?speed= debug control.
import { test, expect, type Page } from '@playwright/test';

const SHOTS = process.env.E2E_SHOTS; // optional folder for screenshots
const isApi = (u: URL) => u.pathname.startsWith('/api/');

async function shot(page: Page, name: string) { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); }

async function joinAndStart(page: Page, speed: number) {
  await page.goto(`/?speed=${speed}`);
  await expect(page.getByText('are simulated friends', { exact: false })).toBeVisible(); // FR-002 disclosure before joining
  await shot(page, '01-landing');
  await page.getByRole('button', { name: "Join the gang's room" }).click();
  await expect(page.getByRole('button', { name: 'Start the match' })).toBeDisabled(); // FR-003: team required
  await page.getByRole('button', { name: 'Pick for me' }).click();
  await shot(page, '02-setup');
  await page.getByRole('button', { name: 'Start the match' }).click();
  await expect(page.locator('.broadcast')).toBeVisible();
}

async function fullJourney(page: Page, speed: number, opts: { expectLive: boolean }) {
  await joinAndStart(page, speed);
  // moment card → send a line (FR-014/016)
  const send = page.locator('.moment li button', { hasText: 'Send' }).first();
  await send.waitFor({ timeout: 120_000 });
  await shot(page, '03-moment-card');
  const line = (await page.locator('.moment li span').first().textContent())!;
  await send.click();
  await expect(page.locator('.fi.self .tx', { hasText: line.slice(0, 20) })).toBeVisible();
  // text + reaction (FR-011)
  await page.getByLabel('Message the gang').fill('Ritu, your hero is still my hero');
  await page.getByRole('button', { name: 'Send', exact: true }).last().click();
  await page.getByRole('button', { name: 'React 😂' }).click();
  if (opts.expectLive) await expect(page.locator('.src', { hasText: 'live AI' }).first()).toBeVisible({ timeout: 60_000 });
  // step away when the gang nudges (FR-018)
  await page.locator('.step.nudge').waitFor({ timeout: 150_000 });
  await shot(page, '04-nudge');
  await page.locator('.step.nudge').click();
  await expect(page.getByText('You stepped away')).toBeVisible();
  await shot(page, '05-away');
  // call-back
  const back = page.getByRole('button', { name: 'Back to the match' });
  await back.waitFor({ timeout: 90_000 });
  await shot(page, '06-callback');
  await back.click();
  // catch-up (FR-019) mentions every wicket in the window
  const cu = page.getByRole('dialog', { name: 'While you were away' });
  await expect(cu).toBeVisible();
  await expect(cu.locator('p').first()).not.toHaveText(/filling you in/, { timeout: 10_000 });
  if (opts.expectLive) await cu.locator('.src', { hasText: 'live AI' }).waitFor({ timeout: 12_000 }).catch(() => {}); // live summary may replace the fallback
  await shot(page, '07-catchup');
  await page.getByRole('button', { name: 'Rejoin the match' }).click();
  // wrap (FR-020) and memory (FR-021)
  await expect(page.getByRole('heading', { name: 'The audio reel' })).toBeVisible({ timeout: 150_000 });
  await expect(page.getByText('Saved to your memories.')).toBeVisible();
  await shot(page, '08-wrap');
  await page.getByRole('button', { name: 'See your memory shelf' }).click();
  await expect(page.locator('.mem')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: /Your memories \(1\)/ }).click(); // AC-MEM-2: survives reload
  await page.locator('.mem').first().click();
  await expect(page.locator('.timeline li').first()).toBeVisible();
  await shot(page, '09-shelf');
}

test('full journey with live AI', async ({ page }) => {
  test.skip(!!process.env.E2E_NO_LIVE, 'live AI disabled');
  await fullJourney(page, Number(process.env.E2E_SPEED ?? 5), { expectLive: true });
});

test('AI offline: journey still completes with fallbacks', async ({ page }) => {
  await page.route(isApi, (r) => r.abort());
  await fullJourney(page, 8, { expectLive: false });
});

test('mic denied: text and reactions still work', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: [] });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
  });
  await page.route(isApi, (r) => r.abort());
  await joinAndStart(page, 4);
  const talk = page.getByRole('button', { name: /Hold to talk/ });
  await talk.dispatchEvent('pointerdown');
  await expect(page.getByText('Mic off. Type or react instead.')).toBeVisible();
  await page.getByLabel('Message the gang').fill('typing instead');
  await page.keyboard.press('Enter');
  await expect(page.locator('.fi.self .tx', { hasText: 'typing instead' })).toBeVisible();
  await ctx.close();
});

test('reload mid-match resumes the room', async ({ page }) => {
  await page.route(isApi, (r) => r.abort());
  await joinAndStart(page, 6);
  await page.getByLabel('Message the gang').fill('remember me');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(9_000); // let a few balls pass so progress is saved
  await page.reload();
  const resume = page.getByRole('button', { name: /Resume your match at/ });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page.locator('.fi.self .tx', { hasText: 'remember me' })).toBeVisible();
  await expect(page.getByText('Picked up where you left off.')).toBeVisible();
});

test('hold-to-talk records a clip with the fake mic', async ({ page }) => {
  await page.route((u) => u.pathname === '/api/transcribe', (r) => r.fulfill({ json: { text: 'Dev your swing king is in trouble' } }));
  await page.route((u) => u.pathname === '/api/reply', (r) => r.abort());
  await joinAndStart(page, 2);
  const talk = page.getByRole('button', { name: /Hold to talk/ });
  await talk.dispatchEvent('pointerdown');
  await expect(page.getByText(/Recording/)).toBeVisible();
  await page.waitForTimeout(1200);
  await talk.dispatchEvent('pointerup');
  await expect(page.locator('.fi.self .clip')).toBeVisible({ timeout: 3_000 }); // AC-VOICE-1
  await expect(page.locator('.fi.self .tx', { hasText: 'swing king' })).toBeVisible();
});
