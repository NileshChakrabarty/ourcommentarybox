// Extension icons (PNG, as Chrome requires) drawn from the favicon design: the marigold rounded "box" with two
// speech lines. No image libraries: a tiny supersampled rasteriser + PNG encoder. Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BOX = [0xff, 0x7a, 0x1a], INK = [0x14, 0x0c, 0x05];
const inRoundRect = (x, y) => { const r = 7, a = 2, b = 30; const cx = Math.max(a + r, Math.min(b - r, x)), cy = Math.max(a + r, Math.min(b - r, y)); return x >= a && x <= b && y >= a && y <= b && (x - cx) ** 2 + (y - cy) ** 2 <= r * r; };
const inCapsule = (x, y, x1, x2, yy, r = 1.5) => { const cx = Math.max(x1, Math.min(x2, x)); return (x - cx) ** 2 + (y - yy) ** 2 <= r * r; };
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

function png(size) {
  const S = 4, rows = [];
  for (let py = 0; py < size; py++) {
    const row = [0];
    for (let px = 0; px < size; px++) {
      let box = 0, ink = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const x = ((px + (sx + 0.5) / S) / size) * 32, y = ((py + (sy + 0.5) / S) / size) * 32;
        if (!inRoundRect(x, y)) continue;
        if (inCapsule(x, y, 10, 22, 13) || inCapsule(x, y, 10, 18, 19)) ink++; else box++;
      }
      const n = S * S, a = (box + ink) / n;
      const mix = (i) => Math.round(a ? (BOX[i] * box + INK[i] * ink) / (box + ink) : 0);
      row.push(mix(0), mix(1), mix(2), Math.round(a * 255));
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}
mkdirSync('extension/public/icons', { recursive: true });
for (const s of [16, 32, 48, 128]) writeFileSync(`extension/public/icons/icon-${s}.png`, png(s));
console.log('icons: extension/public/icons/icon-{16,32,48,128}.png');
