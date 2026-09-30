/**
 * verify-traces.mjs — draw the surveyed campus data over the harvested satellite
 * mosaic so the geometry can be eyeballed against the imagery it was traced from.
 *
 * Usage:
 *   node tools/verify-traces.mjs                     # full mosaic overlay
 *   node tools/verify-traces.mjs --place=<place-id>  # 2× zoom on one place
 *   node tools/verify-traces.mjs --focus=lat,lng,span
 *   node tools/verify-traces.mjs --mosaic=<file.jpg>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HARVEST_DIR = path.join(__dirname, 'satellite-harvester');
const OUT_DIR = path.join(__dirname, 'verify');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=') || true];
  }),
);

const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/bbitPlaces.json'), 'utf8'));
const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/campusLayout.json'), 'utf8'));
const results = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, 'results.json'), 'utf8'));

if (!results.length) {
  console.error('No harvested mosaics found. Run the harvester page first.');
  process.exit(1);
}

const pick = args.mosaic
  ? results.find((r) => r.file === args.mosaic || r.name === args.mosaic)
  : results[results.length - 1];
const mosaic = pick || results[results.length - 1];
const mosaicPath = path.join(HARVEST_DIR, 'out', mosaic.file);
if (!fs.existsSync(mosaicPath)) {
  console.error(`Mosaic missing: ${mosaicPath}`);
  process.exit(1);
}

const { z, bbox } = mosaic.meta;
const [south, west, north, east] = bbox;

const lon2x = (lng, zoom) => ((lng + 180) / 360) * 2 ** zoom;
const lat2y = (lat, zoom) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** zoom;
};

const img = await loadImage(mosaicPath);
const x0 = lon2x(west, z);
const y0 = lat2y(north, z);
const fullW = img.width;
const fullH = img.height;
const toPx = (lat, lng) => [Math.round((lon2x(lng, z) - x0) * 256), Math.round((lat2y(lat, z) - y0) * 256)];

// window: full mosaic or a cropped focus area
let win = { x: 0, y: 0, w: fullW, h: fullH, scale: 1 };
if (args.place) {
  const place = places.find((p) => p.id === args.place || p.name.toLowerCase() === String(args.place).toLowerCase());
  if (!place) {
    console.error(`Unknown place: ${args.place}`);
    process.exit(1);
  }
  const [cx, cy] = toPx(place.lat, place.lng);
  const span = Number(args.span || 260);
  win = {
    x: Math.max(0, cx - span),
    y: Math.max(0, cy - span),
    w: Math.min(fullW - Math.max(0, cx - span), span * 2),
    h: Math.min(fullH - Math.max(0, cy - span), span * 2),
    scale: 2.2,
  };
} else if (args.focus) {
  const [lat, lng, spanM] = String(args.focus).split(',').map(Number);
  const [cx, cy] = toPx(lat, lng);
  const spanPx = spanM / (156543.03392 * Math.cos((lat * Math.PI) / 180) / 2 ** z);
  win = {
    x: Math.max(0, cx - spanPx),
    y: Math.max(0, cy - spanPx),
    w: Math.min(fullW - Math.max(0, cx - spanPx), spanPx * 2),
    h: Math.min(fullH - Math.max(0, cy - spanPx), spanPx * 2),
    scale: 2,
  };
}

const canvas = createCanvas(Math.round(win.w * win.scale), Math.round(win.h * win.scale));
const ctx = canvas.getContext('2d');
ctx.drawImage(img, win.x, win.y, win.w, win.h, 0, 0, canvas.width, canvas.height);

const px = (lat, lng) => {
  const [x, y] = toPx(lat, lng);
  return [(x - win.x) * win.scale, (y - win.y) * win.scale];
};

const drawRing = (ring, { stroke = '#fff', fill = null, width = 2, dash = null, close = true }) => {
  if (!ring?.length) return;
  ctx.save();
  ctx.beginPath();
  ring.forEach(([lat, lng], i) => {
    const [x, y] = px(lat, lng);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (close) ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.setLineDash(dash || []);
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  ctx.restore();
};

const label = (text, lat, lng, color = '#fff', size = 12, offsetY = 0) => {
  const [x, y] = px(lat, lng);
  ctx.save();
  ctx.font = `bold ${size}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(2,6,23,0.9)';
  ctx.strokeText(text, x, y + offsetY);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + offsetY);
  ctx.restore();
};

// ------------------------------------------------------------------ overlays
for (const green of layout.greens) drawRing(green.polygon, { stroke: '#4ade80', fill: 'rgba(34,197,94,0.20)', width: 1.5, dash: [6, 4] });
for (const water of layout.water) drawRing(water.polygon, { stroke: '#38bdf8', fill: 'rgba(56,189,248,0.28)', width: 1.5 });
for (const road of layout.roads) {
  drawRing(road.path, { stroke: 'rgba(253,224,71,0.95)', width: road.kind === 'arterial' ? 3 : 2, close: false, dash: road.kind === 'footpath' ? [6, 5] : null });
}
drawRing(layout.boundary, { stroke: '#f59e0b', width: 2.5, dash: [12, 8] });

for (const place of places) {
  const ring = place.polygon;
  if (!ring?.length) continue;
  drawRing(ring, { stroke: place.color || '#38bdf8', fill: `${(place.color || '#38bdf8')}55`, width: 1.6 });
  label(place.shortName || place.name, place.lat, place.lng, '#ffffff', win.scale > 1.5 ? 13 : 11, 3);
}
for (const gate of layout.gates || []) {
  const [x, y] = px(gate.lat, gate.lng);
  ctx.save();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 10);
  ctx.stroke();
  ctx.restore();
  label(gate.shortName || gate.name, gate.lat, gate.lng, '#fb923c', 12, -14);
}

// header strip
ctx.save();
ctx.fillStyle = 'rgba(2,6,23,0.78)';
ctx.fillRect(0, 0, canvas.width, 34);
ctx.fillStyle = '#f8fafc';
ctx.font = 'bold 15px ui-monospace, Menlo, monospace';
ctx.textAlign = 'left';
ctx.fillText(`overlay on ${mosaic.file} · z${z} · bbox ${bbox.map((n) => n.toFixed(4)).join(', ')}`, 10, 23);
ctx.restore();

fs.mkdirSync(OUT_DIR, { recursive: true });
const outName = `overlay-${args.place ? `place-${String(args.place).replace(/[^a-z0-9-]/gi, '')}` : args.focus ? 'focus' : mosaic.name}.jpg`;
const outPath = path.join(OUT_DIR, outName);
fs.writeFileSync(outPath, canvas.toBuffer('image/jpeg', 90));
console.log(`wrote ${path.relative(ROOT, outPath)} (${canvas.width}×${canvas.height})`);
