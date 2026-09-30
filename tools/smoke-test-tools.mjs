/**
 * smoke-test-tools.mjs — round-trip self test for the imagery toolchain.
 *
 * Builds a synthetic georeferenced "screenshot" (uniform ground + two known
 * rectangles), runs the same region-grow/trace path used by
 * extract-footprints.mjs, and asserts the extracted footprints match the
 * rectangles that were drawn (position ±1 m, size ±1.5 m).
 *
 *   node tools/smoke-test-tools.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(__dirname, 'imagery');
const OUT_DIR = path.join(__dirname, 'georef-out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1568;
const H = 787;
const cLat = 22.4583332;
const cLng = 88.1694324;
const s = 0.5108; // metres per pixel
const METERS_PER_DEG_LAT = 111132.92;
const metersPerDegLng = 111412.84 * Math.cos((cLat * Math.PI) / 180);

const toPx = (lat, lng) => [
  W / 2 + ((lng - cLng) * metersPerDegLng) / s,
  H / 2 - ((lat - cLat) * METERS_PER_DEG_LAT) / s,
];

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#4b6b43';
ctx.fillRect(0, 0, W, H);

const TARGETS = [
  { id: 'smoke-a', lat: 22.45880, lng: 88.16980, w: 42, h: 26, color: '#c9c9c4' },
  { id: 'smoke-b', lat: 22.45820, lng: 88.16900, w: 24, h: 38, color: '#b9c2cc' },
];

for (const t of TARGETS) {
  const [x0, y0] = toPx(t.lat + t.h / 2 / METERS_PER_DEG_LAT, t.lng - t.w / 2 / metersPerDegLng);
  const [x1, y1] = toPx(t.lat - t.h / 2 / METERS_PER_DEG_LAT, t.lng + t.w / 2 / metersPerDegLng);
  ctx.fillStyle = t.color;
  ctx.fillRect(Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0));
}

fs.writeFileSync(path.join(IMG_DIR, 'smoke-test.jpg'), canvas.toBuffer('image/jpeg', 96));

const transforms = JSON.parse(fs.readFileSync(path.join(IMG_DIR, 'transforms.json'), 'utf8'));
transforms.synth = {
  file: 'smoke-test.jpg',
  center: { lat: cLat, lng: cLng },
  mPerPx: s,
  refPixel: [W / 2, H / 2],
  note: 'synthetic round-trip self test (tools/smoke-test-tools.mjs)',
};
fs.writeFileSync(path.join(IMG_DIR, 'transforms.json'), `${JSON.stringify(transforms, null, 2)}\n`);

// temporarily inject the synthetic places
const placesPath = path.join(ROOT, 'src/data/bbitPlaces.json');
const backup = fs.readFileSync(placesPath, 'utf8');
const places = JSON.parse(backup);
const synthetic = TARGETS.map((t) => ({
  id: t.id, name: t.id, category: 'academic', categoryLabel: 'academic', color: '#0071E3',
  lat: t.lat, lng: t.lng, details: 'synthetic', aliases: [],
}));

try {
  fs.writeFileSync(placesPath, JSON.stringify([...places, ...synthetic], null, 2));
  const ids = synthetic.map((t) => t.id).join(',');
  execFileSync('node', ['tools/extract-footprints.mjs', `--shot=synth`, `--place=${ids}`, '--tol=26'], { cwd: ROOT, stdio: 'inherit' });
} finally {
  fs.writeFileSync(placesPath, backup);
}

const out = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'footprints.json'), 'utf8'));
let failures = 0;
for (const t of TARGETS) {
  const got = out[t.id];
  if (!got) {
    console.log(`✘ ${t.id}: no footprint extracted`);
    failures += 1;
    continue;
  }
  const lats = got.polygon.map((p) => p[0]);
  const lngs = got.polygon.map((p) => p[1]);
  const h = (Math.max(...lats) - Math.min(...lats)) * METERS_PER_DEG_LAT;
  const w = (Math.max(...lngs) - Math.min(...lngs)) * metersPerDegLng;
  const dLat = Math.abs((Math.max(...lats) + Math.min(...lats)) / 2 - t.lat) * METERS_PER_DEG_LAT;
  const dLng = Math.abs((Math.max(...lngs) + Math.min(...lngs)) / 2 - t.lng) * metersPerDegLng;
  const ok = Math.abs(w - t.w) <= 2.5 && Math.abs(h - t.h) <= 2.5 && dLat <= 1.5 && dLng <= 1.5;
  if (!ok) failures += 1;
  console.log(`${ok ? '✔' : '✘'} ${t.id}: ${w.toFixed(1)}×${h.toFixed(1)} m (drawn ${t.w}×${t.h}) · centre off by ${dLat.toFixed(2)} m N-S, ${dLng.toFixed(2)} m E-W`);
}
console.log(failures ? `\n${failures} failure(s)` : '\nAll good — imagery toolchain round-trips accurately.');
process.exit(failures ? 1 : 0);
