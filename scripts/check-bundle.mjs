// FR-025: fail the build if any secret (or its prefix) appears in the client bundle.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const files = []; const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk('dist');
const secrets = [process.env.GEMINI_API_KEY, process.env.SARVAM_API_KEY].map((s) => s?.trim()).filter(Boolean);
const needles = [...secrets, ...secrets.map((s) => s.slice(0, 12)), 'GEMINI_API_KEY', 'SARVAM_API_KEY', 'api-subscription-key', 'x-goog-api-key'];
let bad = 0;
for (const f of files) {
  const txt = readFileSync(f, 'latin1');
  needles.forEach((n, i) => { if (txt.includes(n)) { bad++; console.error(`LEAK: ${f} contains ${i < secrets.length * 2 ? '[secret value]' : n}`); } });
}
// v1.2: dev-only tools must never ship
const devOnly = ['Ball tagging', 'fun-banter-tag-v1', 'dev-probe', '__room'];
for (const f of files) {
  if (/dev[\\/](tag|probe)/.test(f)) { bad++; console.error(`DEV TOOL SHIPPED: ${f}`); }
  const txt = readFileSync(f, 'latin1');
  for (const n of devOnly) if (txt.includes(n)) { bad++; console.error(`DEV TOOL SHIPPED: ${f} contains "${n}"`); }
}
if (bad) process.exit(1);
console.log(`bundle check: ${files.length} files clean (no keys, no key names, no auth headers, no dev-only tools)`);
