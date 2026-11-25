// Regenerates every icon asset from app/icon.svg: `node scripts/gen-icons.mjs`.
// Renders the YonelMa brand mark into every icon asset the app needs.
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const app = process.cwd();

const rounded = readFileSync(join(app, "app", "icon.svg"));
const square = Buffer.from(rounded.toString().replace(/rx="d+"/, 'rx="0"'));

const png = (svg, size) =>
  sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/** Minimal ICO container holding PNG images (supported since Vista). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = header.length + dir.length;
  images.forEach(({ size, data }, i) => {
    const b = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, b);
    dir.writeUInt8(size >= 256 ? 0 : size, b + 1);
    dir.writeUInt8(0, b + 2);
    dir.writeUInt8(0, b + 3);
    dir.writeUInt16LE(1, b + 4);
    dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(data.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}

const out = [
  ["public/icon-192.png", rounded, 192],
  ["public/icon-512.png", rounded, 512],
  ["public/icon-512-maskable.png", square, 512],
  ["app/apple-icon.png", square, 180],
];

for (const [path, svg, size] of out) {
  writeFileSync(join(app, path), await png(svg, size));
  console.log("wrote", path, size);
}

const sizes = [16, 32, 48, 64];
const images = [];
for (const size of sizes) images.push({ size, data: await png(rounded, size) });
writeFileSync(join(app, "app", "favicon.ico"), ico(images));
console.log("wrote app/favicon.ico", sizes.join("/"));
