/**
 * render-plan.mjs — draw the built campus data back into the pixel space of a
 * screenshot, so it can be compared with the imagery it was read from.
 *
 *   node tools/render-plan.mjs --shot=1
 *   node tools/render-plan.mjs --shot=1 --truth      # include OSM anchors
 *   node tools/render-plan.mjs --shot=1 --bg=tools/imagery/shot1.jpg
 *
 * Output: tools/georef-out/plan-<shot>.jpg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'georef-out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=') || true];
  }),
);

const transforms = JSON.parse(fs.readFileSync(path.join(__dirname, 'imagery/transforms.json'), 'utf8'));
const shotKey = String(args.shot || '1');
const tf = transforms[shotKey];
if (!tf) throw new Error(`unknown shot ${shotKey}`);

const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/campusLayout.json'), 'utf8'));
const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/bbitPlaces.json'), 'utf8'));

const W = 1568;
const H = 787;
const { lat: cLat, lng: cLng } = tf.center;
const s = tf.mPerPx;
const METERS_PER_DEG_LAT = 111132.92;
const metersPerDegLng = 111412.84 * Math.cos((cLat * Math.PI) / 180);
const refX = tf.refPixel ? tf.refPixel[0] : W / 2;
const refY = tf.refPixel ? tf.refPixel[1] : H / 2;

const toPx = (lat, lng) => [
  refX + ((lng - cLng) * metersPerDegLng) / s,
  refY - ((lat - cLat) * METERS_PER_DEG_LAT) / s,
];

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------- background
let drewImage = false;
if (args.bg) {
  const bgPath = path.isAbsolute(String(args.bg)) ? String(args.bg) : path.join(ROOT, String(args.bg));
  if (fs.existsSync(bgPath)) {
    const bg = await loadImage(bgPath);
    ctx.drawImage(bg, 0, 0, W, H);
    drewImage = true;
  }
}
if (!drewImage) {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, W, H);
}

const ring = (pts, { stroke, fill, width = 2, dash = null, alpha = 1 }) => {
  if (!pts?.length) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [x, y] = toPx(p[0], p[1]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.setLineDash(dash || []);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ctx.restore();
};

const path2 = (pts, { stroke, width = 2, dash = null, alpha = 1 }) => {
  if (!pts?.length) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash(dash || []);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [x, y] = toPx(p[0], p[1]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
};

const label = (text, lat, lng, color = '#fff', size = 11, dy = 0, align = 'center') => {
  const [x, y] = toPx(lat, lng);
  ctx.save();
  ctx.font = `bold ${size}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(2,6,23,0.92)';
  ctx.strokeText(text, x, y + dy);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + dy);
  ctx.restore();
};

// ------------------------------------------------------------------- layers
for (const g of layout.greens) ring(g.polygon, { stroke: '#4ade80', fill: 'rgba(34,197,94,0.20)', width: 1.4 });
for (const w of layout.water) ring(w.polygon, { stroke: '#38bdf8', fill: 'rgba(56,189,248,0.35)', width: 1.4 });

const roadColor = { arterial: '#fcd34d', internal: '#f8fafc', service: '#e2e8f0', footpath: '#fde68a' };
for (const r of layout.roads) {
  path2(r.path, { stroke: roadColor[r.kind] || '#fff', width: r.kind === 'arterial' ? 5 : r.kind === 'internal' ? 3.4 : 2, dash: r.kind === 'footpath' ? [6, 5] : null, alpha: 0.95 });
}

ring(layout.boundary, { stroke: 'rgba(226,232,240,0.35)', width: 6 });
ring(layout.boundary, { stroke: '#fb923c', width: 2.4, dash: [11, 7] });

// ancillary structures first (they sit behind the curated places)
for (const st of layout.structures || []) {
  ring(st.polygon, { stroke: 'rgba(148,163,184,0.9)', fill: 'rgba(148,163,184,0.35)', width: 1.2 });
}
for (const pk of layout.parking || []) {
  ring(pk.polygon, { stroke: 'rgba(226,232,240,0.9)', fill: 'rgba(226,232,240,0.18)', width: 1.2, dash: [4, 3] });
  label('P', pk.polygon[0][0], pk.polygon[0][1], '#e2e8f0', 11, 12);
}
for (const t of layout.trees || []) {
  const [x, y] = toPx(t.lat, t.lng);
  const r = (t.radiusM / 2) / s;
  ctx.save();
  ctx.fillStyle = 'rgba(22,101,52,0.55)';
  ctx.strokeStyle = 'rgba(74,222,128,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
for (const p of places) {
  ring(p.polygon, { stroke: p.color, fill: `${p.color}44`, width: 1.6 });
  label(p.shortName || p.name, p.lat, p.lng, '#ffffff', p.major ? 12 : 10.5, 4);
}

for (const g of layout.gates || []) {
  const [x, y] = toPx(g.lat, g.lng);
  ctx.save();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y);
  ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------- truth / references
if (args.truth !== false) {
  const osmFile = path.join(__dirname, 'imagery/osm-roads.json');
  if (fs.existsSync(osmFile)) {
    const osm = JSON.parse(fs.readFileSync(osmFile, 'utf8'));
    for (const way of osm.roads || []) path2(way.geometry, { stroke: 'rgba(244,63,94,0.95)', width: 2, dash: [7, 5] });
    for (const poi of osm.pois || []) {
      const [x, y] = toPx(poi.lat, poi.lng);
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y);
      ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
      ctx.stroke();
      ctx.restore();
      label(poi.name, poi.lat, poi.lng, '#22d3ee', 12, -14);
    }
  }
}

// ---------------------------------------------------------------- graticule
ctx.save();
ctx.strokeStyle = 'rgba(148,163,184,0.25)';
ctx.lineWidth = 1;
const step = 0.0005;
const latTop = cLat + (refY * s) / METERS_PER_DEG_LAT;
const latBottom = cLat - ((H - refY) * s) / METERS_PER_DEG_LAT;
const lngLeft = cLng - (refX * s) / metersPerDegLng;
const lngRight = cLng + ((W - refX) * s) / metersPerDegLng;
ctx.beginPath();
for (let lat = Math.ceil(latBottom / step) * step; lat <= latTop; lat += step) {
  const [, y] = toPx(lat, cLng);
  ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5);
}
for (let lng = Math.ceil(lngLeft / step) * step; lng <= lngRight; lng += step) {
  const [x] = toPx(cLat, lng);
  ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H);
}
ctx.stroke();
for (let lat = Math.ceil(latBottom / step) * step; lat <= latTop; lat += step) {
  label(lat.toFixed(4), lat, lngLeft, '#94a3b8', 11, 4, 'left');
}
for (let lng = Math.ceil(lngLeft / step) * step; lng <= lngRight; lng += step) {
  label(lng.toFixed(4), latTop, lng, '#94a3b8', 11, 16, 'left');
}
ctx.restore();

ctx.save();
ctx.fillStyle = 'rgba(2,6,23,0.8)';
ctx.fillRect(0, 0, W, 26);
label(`${drewImage ? `overlay on ${path.basename(String(args.bg))}` : 'campus plan (no imagery)'} · shot ${shotKey} · ${places.length} places · ${layout.roads.length} roads`, cLat, lngLeft, '#e2e8f0', 13, 18, 'left');
ctx.restore();

if (args.style === 'poster') {
  const poster = createCanvas(W, H);
  const pctx = poster.getContext('2d');
  pctx.fillStyle = '#F6F7F4';
  pctx.fillRect(0, 0, W, H);

  const fill = (pts, colour, alpha = 1, stroke = null, width = 1.2, dash = null) => {
    pctx.save();
    pctx.globalAlpha = alpha;
    pctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = toPx(p[0], p[1]);
      if (i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
    });
    pctx.closePath();
    pctx.fillStyle = colour;
    pctx.fill();
    if (stroke) {
      pctx.setLineDash(dash || []);
      pctx.strokeStyle = stroke;
      pctx.lineWidth = width;
      pctx.stroke();
    }
    pctx.restore();
  };
  const line = (pts, colour, width, dash = null) => {
    pctx.save();
    pctx.setLineDash(dash || []);
    pctx.strokeStyle = colour;
    pctx.lineWidth = width;
    pctx.lineJoin = 'round';
    pctx.lineCap = 'round';
    pctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = toPx(p[0], p[1]);
      if (i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
    });
    pctx.stroke();
    pctx.restore();
  };
  const text = (t, lat, lng, colour, size, dy = 0, align = 'center', weight = '700') => {
    const [x, y] = toPx(lat, lng);
    pctx.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
    pctx.textAlign = align;
    pctx.fillStyle = colour;
    pctx.fillText(t, x, y + dy);
  };

  fill(layout.boundary, '#EDEFE7', 1, '#3F4A3C', 3);
  for (const g of layout.greens) fill(g.polygon, '#9CC79A', 0.85, '#5E8C5C', 1);
  for (const w of layout.water) fill(w.polygon, '#9CC6DE', 0.95, '#4A87AC', 1.2);
  for (const pk of layout.parking || []) fill(pk.polygon, 'rgba(180,186,196,0.55)', 1, '#8C93A0', 1, [5, 4]);
  for (const st of layout.structures || []) fill(st.polygon, '#D8D3C8', 1, '#9C958A', 1);

  const roadWidth = { arterial: 7, internal: 4.5, service: 2.6, footpath: 1.8 };
  const roadColour = { arterial: '#F3E3B3', internal: '#FFFFFF', service: '#EFEFEF', footpath: '#D9D3C4' };
  for (const r of layout.roads) line(r.path, '#C9C4B8', (roadWidth[r.kind] || 3) + 2.4);
  for (const r of layout.roads) line(r.path, roadColour[r.kind] || '#fff', roadWidth[r.kind] || 3, r.kind === 'footpath' ? [4, 4] : null);

  // ring road stays legible on top of the blocks
  const ring = layout.roads.find((r) => r.id === 'road-ring');
  if (ring) {
    line(ring.path, '#C2BCAE', 9);
    line(ring.path, '#EFEDE6', 6.5);
  }

  // ring road kept legible over the blocks
  const posterRing = layout.roads.find((r) => r.id === 'road-ring');
  if (posterRing) {
    line(posterRing.path, '#C2BCAE', 9);
    line(posterRing.path, '#EFEDE6', 6.5);
  }

  for (const t of layout.trees || []) {
    const [x, y] = toPx(t.lat, t.lng);
    pctx.save();
    pctx.fillStyle = 'rgba(58,110,58,0.8)';
    pctx.beginPath();
    pctx.arc(x, y, Math.max(2.4, (t.radiusM / 2) / s), 0, Math.PI * 2);
    pctx.fill();
    pctx.restore();
  }

  const CAT = {
    landmark: '#C1462F', admin: '#7A4BA8', library: '#4B4BA8', academic: '#1F6FB2', building: '#C77F2A',
    hostel: '#2F8F4E', mess: '#C77F2A', canteen: '#C77F2A', food: '#C77F2A', tea: '#C79A2A',
    sports: '#2A8C9C', gym: '#2A8C9C', green: '#3E8B4F', health: '#B03252', atm: '#6B7280',
  };
  for (const p of places) {
    fill(p.polygon, CAT[p.category] || '#1F6FB2', 0.45, CAT[p.category] || '#1F6FB2', 1.3);
  }
  // greedy de-clutter so labels never collide
  const kept = [];
  const placeLabels = places
    .slice()
    .sort((a, b) => (b.major ? 1 : 0) - (a.major ? 1 : 0))
    .filter((p) => p.major || places.length < 20);
  for (const p of placeLabels) {
    const label = p.shortName || p.name;
    const [x, y] = toPx(p.lat, p.lng);
    const w = label.length * 5.6 + 8;
    const h = 13;
    const clash = kept.some((k) => Math.abs(k.x - x) < (k.w + w) / 2 && Math.abs(k.y - y) < 11);
    if (clash) continue;
    kept.push({ x, y, w, h });
    text(label, p.lat, p.lng, '#1B2A24', 11, 4);
  }

  // title block + legend
  pctx.save();
  pctx.fillStyle = 'rgba(255,255,255,0.92)';
  pctx.fillRect(24, 20, 470, 96);
  pctx.strokeStyle = '#D5D2C8';
  pctx.strokeRect(24.5, 20.5, 469, 95);
  pctx.fillStyle = '#1B2A24';
  pctx.font = '800 22px ui-sans-serif, system-ui, sans-serif';
  pctx.textAlign = 'left';
  pctx.fillText('BBIT Campus Map', 42, 52);
  pctx.font = '500 12.5px ui-sans-serif, system-ui, sans-serif';
  pctx.fillStyle = '#5C6B62';
  pctx.fillText('Budge Budge Institute of Technology · 50 surveyed places', 42, 72);
  pctx.fillText('Footprints read from satellite imagery · OpenStreetMap road anchors', 42, 90);
  pctx.fillText(`Centre ${cLat.toFixed(5)}, ${cLng.toFixed(5)} · ${s} m/px reference`, 42, 106);
  pctx.restore();

  const legend = Object.entries({
    Academic: '#1F6FB2', Administration: '#7A4BA8', Hostels: '#2F8F4E',
    'Sports & grounds': '#2A8C9C', 'Food & mess': '#C77F2A', Library: '#4B4BA8',
    Landmarks: '#C1462F', Greens: '#3E8B4F', Water: '#9CC6DE',
  });
  const lx = W - 232;
  const ly = 20;
  pctx.save();
  pctx.fillStyle = 'rgba(255,255,255,0.92)';
  pctx.fillRect(lx, ly, 208, 22 * legend.length + 22);
  pctx.strokeStyle = '#D5D2C8';
  pctx.strokeRect(lx + 0.5, ly + 0.5, 207, 22 * legend.length + 21);
  pctx.font = '700 12px ui-sans-serif, system-ui, sans-serif';
  pctx.fillStyle = '#1B2A24';
  pctx.textAlign = 'left';
  pctx.fillText('Legend', lx + 14, ly + 18);
  legend.forEach(([label, colour], i) => {
    const y = ly + 38 + i * 22;
    pctx.fillStyle = colour;
    pctx.globalAlpha = 0.55;
    pctx.fillRect(lx + 14, y - 9, 18, 12);
    pctx.globalAlpha = 1;
    pctx.strokeStyle = colour;
    pctx.strokeRect(lx + 14.5, y - 8.5, 17, 11);
    pctx.fillStyle = '#3D4A43';
    pctx.font = '500 12px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(label, lx + 40, y + 1);
  });
  pctx.restore();

  // north arrow + scale bar
  pctx.save();
  const nx = W - 64;
  const ny = H - 84;
  pctx.fillStyle = '#1B2A24';
  pctx.beginPath();
  pctx.moveTo(nx, ny - 26);
  pctx.lineTo(nx - 9, ny + 6);
  pctx.lineTo(nx, ny - 1);
  pctx.lineTo(nx + 9, ny + 6);
  pctx.closePath();
  pctx.fill();
  pctx.font = '800 12px ui-sans-serif, system-ui, sans-serif';
  pctx.textAlign = 'center';
  pctx.fillText('N', nx, ny + 22);
  pctx.restore();

  pctx.save();
  const barM = 100;
  const barPx = barM / s;
  const bx = 44;
  const by = H - 44;
  pctx.fillStyle = 'rgba(255,255,255,0.9)';
  pctx.fillRect(bx - 8, by - 26, barPx + 16, 44);
  pctx.strokeStyle = '#1B2A24';
  pctx.lineWidth = 1.5;
  pctx.beginPath();
  pctx.moveTo(bx, by - 8);
  pctx.lineTo(bx + barPx / 2, by - 8);
  pctx.moveTo(bx, by + 2);
  pctx.lineTo(bx + barPx, by + 2);
  pctx.stroke();
  pctx.beginPath();
  pctx.moveTo(bx, by - 14); pctx.lineTo(bx, by + 6);
  pctx.moveTo(bx + barPx / 2, by - 14); pctx.lineTo(bx + barPx / 2, by + 4);
  pctx.moveTo(bx + barPx, by - 14); pctx.lineTo(bx + barPx, by + 6);
  pctx.stroke();
  pctx.fillStyle = '#1B2A24';
  pctx.font = '700 11px ui-sans-serif, system-ui, sans-serif';
  pctx.textAlign = 'center';
  pctx.fillText('0', bx, by - 16);
  pctx.fillText('50 m', bx + barPx / 2, by - 16);
  pctx.fillText('100 m', bx + barPx, by - 16);
  pctx.restore();

  const posterOut = path.join(OUT_DIR, `bbit-campus-map-${shotKey}.jpg`);
  fs.writeFileSync(posterOut, poster.toBuffer('image/jpeg', 93));
  console.log(`wrote ${path.relative(ROOT, posterOut)}`);
}

const out = path.join(OUT_DIR, `plan-${shotKey}${args.truth === false ? '-lean' : ''}.jpg`);
fs.writeFileSync(out, canvas.toBuffer('image/jpeg', 92));
console.log(`wrote ${path.relative(ROOT, out)}`);
