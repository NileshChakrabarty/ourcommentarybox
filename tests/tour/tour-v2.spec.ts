// v1.2 screenshot tour: the real reviewer journey with the REAL YouTube embed and live AI (Chrome channel).
// Screenshots mask the video player so no broadcast frame is ever stored. Run:
//   OUT=docs/review/screenshots/after npx playwright test --config tests/tour/pw.config.ts tour-v2
import { test, expect, type Page } from '@playwright/test';
test.use({ channel: 'chrome' });
const OUT = process.env.OUT!;
const shot = (p: Page, n: string) => p.screenshot({ path: `${OUT}/${n}.png`, mask: [p.locator('.player-box iframe')], maskColor: '#1a3050' });

test('reviewer journey (real embed, live AI)', async ({ page }) => {
  test.setTimeout(600_000);
  const t0 = Date.now(); const log: string[] = [];
  const mark = async (s: string) => { const st = await page.evaluate(() => { const r = (window as any).__room?.(); return r ? `${r.sourceKind}/${r.sourceState} t=${Math.round(r.videoTime)} ball=${r.position}` : ''; }); log.push(`${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s  ${s}  [${st}]`); };
  await page.goto('/');
  await expect(page.getByText('AI friends', { exact: false }).first()).toBeVisible();
  await page.waitForTimeout(800); await shot(page, '01-start'); await mark('start screen');
  await page.getByRole('button', { name: 'Watch with the gang' }).click();
  await page.locator('.v').first().waitFor({ timeout: 60_000 }); await mark('first gang line'); await shot(page, '02-first-line');
  await page.locator('.call-row').waitFor({ timeout: 60_000 }).catch(() => {}); 
  const callBtn = page.getByRole('button', { name: 'Wicket this over' });
  if (await callBtn.isVisible()) { await callBtn.click(); await mark('placed Gang Call: wicket'); }
  await page.locator('.slab').first().waitFor({ timeout: 200_000 }); await mark('WICKET slab (Rohit)'); await page.waitForTimeout(1500); await shot(page, '03-wicket');
  await page.locator('.line-card').waitFor({ timeout: 30_000 }).catch(() => {}); await mark('line card'); await shot(page, '04-line-card');
  if (await page.locator('.line-card').isVisible()) { await page.getByRole('button', { name: 'Send it' }).click(); await mark('sent line'); }
  await page.locator('.step.nudge').waitFor({ timeout: 60_000 }); await mark('nudge'); await shot(page, '05-nudge');
  await page.getByRole('button', { name: 'Step away' }).click(); await page.waitForTimeout(600); await shot(page, '06-away'); await mark('stepped away');
  await page.getByRole('button', { name: 'Back to the match' }).waitFor({ timeout: 60_000 }); await mark('call-back'); await shot(page, '07-callback');
  await page.getByRole('button', { name: 'Back to the match' }).click();
  await page.locator('.catchup .cu-text').waitFor({ timeout: 10_000 }); await mark('catch-up shown'); await page.waitForTimeout(2500); await shot(page, '08-catchup');
  await page.getByRole('button', { name: 'Back to the banter' }).click();
  await page.locator('.slab', { hasText: 'Kohli' }).waitFor({ timeout: 90_000 }); await mark('WICKET slab (Kohli)'); await page.waitForTimeout(4000); await shot(page, '09-kohli');
  await page.locator('.up-next').waitFor({ timeout: 90_000 }); await mark('up next'); await shot(page, '10-up-next');
  await page.getByRole('button', { name: 'Jump there now' }).click(); await mark('jumped to final chapter');
  await page.waitForTimeout(3000); await shot(page, '11-final-chapter');
  await page.getByRole('heading', { name: 'The audio reel' }).waitFor({ timeout: 200_000 }); await mark('wrap'); await page.waitForTimeout(1500); await shot(page, '12-wrap');
  await page.getByRole('button', { name: 'See your memory shelf' }).click(); await page.locator('.mem').first().click(); await shot(page, '13-shelf'); await mark('shelf');
  console.log(log.join('\n'));
  const fs = await import('node:fs'); fs.writeFileSync(`${OUT}/journey-log.txt`, log.join('\n') + '\n');
});
