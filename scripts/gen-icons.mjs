// One-off generator for PWA icons: a white parcel with tape on brand-green,
// written as raw PNGs so no image library is needed.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BRAND = [11, 132, 87];
const BRAND_DARK = [8, 102, 68];
const WHITE = [255, 255, 255];
const TAPE = [245, 180, 24];

function crc32(buf) {
  let c,
    table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixelFn) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// rounded-rect membership test
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function makeIcon(size, { maskable = false } = {}) {
  const s = size;
  // maskable icons need the glyph inside the 80% safe zone
  const pad = maskable ? s * 0.24 : s * 0.18;
  const boxX0 = pad,
    boxX1 = s - pad,
    boxY0 = pad + s * 0.04,
    boxY1 = s - pad + s * 0.02;
  const tapeW = s * 0.09;
  const midX = s / 2;
  const lidY = boxY0 + (boxY1 - boxY0) * 0.3;
  return png(s, (x, y) => {
    // background: full-bleed for maskable, rounded square otherwise
    const bgIn = maskable || inRoundRect(x, y, 0, 0, s - 1, s - 1, s * 0.22);
    if (!bgIn) return [0, 0, 0, 0];
    // subtle vertical gradient on the green
    const t = y / s;
    const bg = [
      Math.round(BRAND[0] + (BRAND_DARK[0] - BRAND[0]) * t),
      Math.round(BRAND[1] + (BRAND_DARK[1] - BRAND[1]) * t),
      Math.round(BRAND[2] + (BRAND_DARK[2] - BRAND[2]) * t),
    ];
    // parcel body
    if (inRoundRect(x, y, boxX0, boxY0, boxX1, boxY1, s * 0.05)) {
      // lid seam: slightly darker band
      if (Math.abs(y - lidY) < s * 0.012) return [225, 232, 228, 255];
      // vertical tape stripe
      if (Math.abs(x - midX) < tapeW / 2) return [...TAPE, 255];
      return [...WHITE, 255];
    }
    return [...bg, 255];
  });
}

writeFileSync("public/icon-192.png", makeIcon(192));
writeFileSync("public/icon-512.png", makeIcon(512));
writeFileSync("public/icon-512-maskable.png", makeIcon(512, { maskable: true }));
console.log("icons written");
