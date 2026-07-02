// Dependency-free PNG icon generator (no image libraries needed).
// Draws a pink gradient with a white heart + sparkles.
// Run:  npm run make-icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ---- tiny PNG encoder (RGBA, 8-bit) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // add filter byte (0) at start of each scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- art ----
function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
// Is point inside the classic heart curve? coords centered, y up.
function inHeart(x, y) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y < 0;
}

const TOP = [255, 227, 241];   // #FFE3F1 light pink
const BOTTOM = [255, 111, 181]; // #FF6FB5 hot pink
const HEART = [255, 255, 255];  // white
const OUTLINE = [255, 79, 163]; // #FF4FA3 deep pink outline

// deterministic sparkles
const SPARKLES = [
  [0.16, 0.18, 0.05], [0.82, 0.20, 0.045], [0.24, 0.78, 0.04],
  [0.78, 0.74, 0.05], [0.5, 0.09, 0.035], [0.9, 0.5, 0.03],
  [0.08, 0.5, 0.03], [0.66, 0.9, 0.035], [0.34, 0.9, 0.03],
];

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3; // supersample for smooth edges
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (px + (sx + 0.5) / SS) / size; // 0..1
          const fy = (py + (sy + 0.5) / SS) / size; // 0..1
          // gradient background
          let col = mix(TOP, BOTTOM, fy);
          // heart: map to centered coords, y up, scaled/positioned
          const hx = (fx - 0.5) / 0.25;
          const hy = (0.50 - fy) / 0.25;
          if (inHeart(hx / 1.09, hy / 1.09)) col = OUTLINE; // slightly larger heart = outline
          if (inHeart(hx, hy)) col = HEART;
          // sparkles (white dots)
          for (const [cx, cy, cr] of SPARKLES) {
            const dx = fx - cx, dy = fy - cy;
            if (dx * dx + dy * dy < cr * cr) col = [255, 255, 255];
          }
          r += col[0]; g += col[1]; b += col[2];
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = 255;
    }
  }
  return encodePNG(size, size, rgba);
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true });
for (const size of [192, 512]) {
  const png = render(size);
  const out = new URL(`../public/icons/icon-${size}.png`, import.meta.url);
  writeFileSync(out, png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
// a small badge (monochrome-ish) reuses the 192 heart
console.log('done');
