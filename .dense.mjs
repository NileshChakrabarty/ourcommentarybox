// Samples the embedded player's scorebug strip at given times (viewing only; crops stay in scratch).
import { chromium } from 'playwright';
const [out, ...ts] = process.argv.slice(2); const times = ts.map(Number);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:5173/dev-probe/yt.html');
await p.waitForFunction(() => window.state === 'ready', null, { timeout: 30000 });
await p.evaluate(() => window.player.playVideo()); await p.waitForTimeout(2000);
for (const t of times) {
  await p.evaluate((t) => window.player.seekTo(t, true), t);
  await p.waitForFunction((t) => Math.abs(window.player.getCurrentTime() - t) < 3 && window.ps === 1, t, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(600);
  const at = await p.evaluate(() => window.player.getCurrentTime());
  await p.screenshot({ path: `${out}/c_${String(t).padStart(5,'0')}.png`, clip: { x: 160, y: 660, width: 330, height: 42 } });
  process.stdout.write(`${t}:${at.toFixed(1)} `);
}
await b.close();
