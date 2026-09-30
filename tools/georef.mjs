/**
 * georef.mjs — georeference a Google Maps screenshot and verify the fit.
 *
 * Google Maps is north-up, so a screenshot maps to the world with three
 * numbers: the lat/lng at a reference pixel and the metres-per-pixel scale.
 * This script draws a labelled lat/lng graticule plus reference vectors
 * (OpenStreetMap roads, campus layout, place centroids) onto the screenshot,
 * so the transform can be tuned by eye until the vectors sit exactly on the
 * roads they represent.
 *
 * Usage:
 *   node tools/georef.mjs --shot=1                 # render with transforms.json
 *   node tools/georef.mjs --shot=1 --set=22.45833,88.16943,0.5108
 *   node tools/georef.mjs --shot=1 --crop=lat,lng,spanM   # zoom into a spot
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(__dirname, 'imagery');
const OUT_DIR = path.join(__dirname, 'georef-out');
const TRANSFORMS = path.join(IMG_DIR, 'transforms.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=') || true];
  }),
);

const transforms = fs.existsSync(TRANSFORMS) ? JSON.parse(fs.readFileSync(TRANSFORMS, 'utf8')) : {};
const shotKey = String(args.shot || '1');
const entry = transforms[shotKey];
if (!entry) {
  console.error(`No transform for shot "${shotKey}" in ${path.relative(ROOT, TRANSFORMS)}. Known: ${Object.keys(transforms).join(', ')}`);
  process.exit(1);
}

if (args.set) {
  const [lat, lng, scale] = String(args.set).split(',').map(Number);
  entry.center = { lat, lng };
  entry.mPerPx = scale;
  transforms[shotKey] = entry;
  fs.writeFileSync(TRANSFORMS, `${JSON.stringify(transforms, null, 2)}\n`);
  console.log(`updated shot ${shotKey} → ${lat}, ${lng} @ ${scale} m/px`);
}

const imgPath = path.join(IMG_DIR, entry.file);
const img = await loadImage(imgPath);
const { lat: cLat, lng: cLng } = entry.center;
const s = entry.mPerPx;

const METERS_PER_DEG_LAT = 111132.92;
const metersPerDegLng = 111412.84 * Math.cos((cLat * Math.PI) / 180);
const refX = entry.refPixel ? entry.refPixel[0] : img.width / 2;
const refY = entry.refPixel ? entry.refPixel[1] : img.height / 2;

/** lat/lng → screenshot pixel */
const toPx = (lat, lng) => [
  refX + ((lng - cLng) * metersPerDegLng) / s,
  refY - ((lat - cLat) * METERS_PER_DEG_LAT) / s,
];

// viewport (whole shot, or a crop around a point)
let win = { x: 0, y: 0, w: img.width, h: img.height, scale: 1 };
if (args.crop) {
  const [lat, lng, spanM] = String(args.crop).split(',').map(Number);
  const [cx, cy] = toPx(lat, lng);
  const spanPx = spanM / s;
  win = {
    x: Math.max(0, cx - spanPx), y: Math.max(0, cy - spanPx),
    w: Math.min(img.width - Math.max(0, cx - spanPx), spanPx * 2),
    h: Math.min(img.height - Math.max(0, cy - spanPx), spanPx * 2),
    scale: Math.min(4, 1400 / Math.min(spanPx * 2, img.width)),
  };
}

const canvas = createCanvas(Math.round(win.w * win.scale), Math.round(win.h * win.scale));
const ctx = canvas.getContext('2d');
ctx.drawImage(img, win.x, win.y, win.w, win.h, 0, 0, canvas.width, canvas.height);

const px = (lat, lng) => {
  const [x, y] = toPx(lat, lng);
  return [(x - win.x) * win.scale, (y - win.y) * win.scale];
};

// -------------------------------------------------------------- graticule
const gridFine = 0.0002;   // ≈22 m N-S
const gridLabel = 0.001;   // ≈111 m N-S
const bounds = {
  south: cLat - (refY * s) / METERS_PER_DEG_LAT,
  north: cLat + ((img.height - refY) * s) / METERS_PER_DEG_LAT,
  west: cLng - (refX * s) / metersPerDegLng,
  east: cLng + ((img.width - refX) * s) / metersPerDegLng,
};

ctx.save();
ctx.strokeStyle = 'rgba(255,255,255,0.18)';
ctx.lineWidth = 1;
ctx.beginPath();
for (let lat = Math.ceil(bounds.south / gridFine) * gridFine; lat <= bounds.north; lat += gridFine) {
  const [, y] = px(lat, bounds.west);
  ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(canvas.width, Math.round(y) + 0.5);
}
for (let lng = Math.ceil(bounds.west / gridFine) * gridFine; lng <= bounds.east; lng += gridFine) {
  const [x] = px(bounds.north, lng);
  ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, canvas.height);
}
ctx.stroke();

ctx.strokeStyle = 'rgba(56,189,248,0.75)';
ctx.lineWidth = 1.6;
ctx.beginPath();
for (let lat = Math.ceil(bounds.south / gridLabel) * gridLabel; lat <= bounds.north; lat += gridLabel) {
  const [, y] = px(lat, bounds.west);
  ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(canvas.width, Math.round(y) + 0.5);
}
for (let lng = Math.ceil(bounds.west / gridLabel) * gridLabel; lng <= bounds.east; lng += gridLabel) {
  const [x] = px(bounds.north, lng);
  ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, canvas.height);
}
ctx.stroke();

ctx.font = 'bold 13px ui-monospace, Menlo, monospace';
ctx.textBaseline = 'top';
const text = (t, x, y, color = '#f8fafc', align = 'left') => {
  ctx.textAlign = align;
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(2,6,23,0.92)';
  ctx.strokeText(t, x, y);
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
};
for (let lat = Math.ceil(bounds.south / gridLabel) * gridLabel; lat <= bounds.north; lat += gridLabel) {
  const [, y] = px(lat, bounds.west);
  for (let x = 6; x < canvas.width - 60; x += 560) text(lat.toFixed(4), x, y + 3);
}
for (let lng = Math.ceil(bounds.west / gridLabel) * gridLabel; lng <= bounds.east; lng += gridLabel) {
  const [x] = px(bounds.north, lng);
  for (let y = 6; y < canvas.height - 30; y += 520) text(lng.toFixed(4), x + 4, y);
}
ctx.restore();

// ------------------------------------------------------- reference vectors
const drawPath = (pts, { color = '#f43f5e', width = 2, dash = null, dot = 3 }) => {
  if (!pts?.length) return;
  ctx.save();
  ctx.setLineDash(dash || []);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach(([lat, lng], i) => {
    const [x, y] = px(lat, lng);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  if (dot) {
    ctx.fillStyle = color;
    for (const [lat, lng] of pts) {
      const [x, y] = px(lat, lng);
      ctx.beginPath(); ctx.arc(x, y, dot, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
};

const osmFile = path.join(IMG_DIR, 'osm-roads.json');
if (fs.existsSync(osmFile)) {
  const osm = JSON.parse(fs.readFileSync(osmFile, 'utf8'));
  for (const way of osm.roads || []) drawPath(way.geometry, { color: 'rgba(244,63,94,0.95)', width: 2, dot: 2.4 });
  for (const node of osm.pois || []) {
    const [x, y] = px(node.lat, node.lng);
    ctx.save();
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y);
    ctx.moveTo(x, y - 13); ctx.lineTo(x, y + 13);
    ctx.stroke();
    ctx.restore();
    text(node.name, x + 14, y - 6, '#22d3ee');
  }
}

const layoutFile = path.join(ROOT, 'src/data/campusLayout.json');
if (fs.existsSync(layoutFile)) {
  const layout = JSON.parse(fs.readFileSync(layoutFile, 'utf8'));
  drawPath(layout.boundary, { color: '#fb923c', width: 2, dash: [10, 6], dot: 4 });
}

const placesFile = path.join(ROOT, 'src/data/bbitPlaces.json');
if (fs.existsSync(placesFile)) {
  const places = JSON.parse(fs.readFileSync(placesFile, 'utf8'));
  const only = args.only ? String(args.only).split(',') : null;
  for (const place of places) {
    if (only && !only.includes(place.id)) continue;
    const [x, y] = px(place.lat, place.lng);
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (win.scale > 1.4 || !only) text(place.shortName || place.name, x + 6, y + 4, '#facc15');
  }
}

// header
ctx.save();
ctx.fillStyle = 'rgba(2,6,23,0.82)';
ctx.fillRect(0, 0, canvas.width, 30);
text(`${entry.file} · center ${entry.center.lat.toFixed(6)}, ${entry.center.lng.toFixed(6)} · ${entry.mPerPx} m/px · ref (${refX}, ${refY})`, 10, 7, '#e2e8f0');
ctx.restore();

const outName = `georef-${shotKey}${args.crop ? '-crop' : ''}.jpg`;
fs.writeFileSync(path.join(OUT_DIR, outName), canvas.toBuffer('image/jpeg', 92));
console.log(`wrote tools/georef-out/${outName} (${canvas.width}×${canvas.height})`);
