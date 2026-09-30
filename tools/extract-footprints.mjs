/**
 * extract-footprints.mjs — turn imagery into real building footprints.
 *
 * Given a georeferenced screenshot, this grows a region from one or more seed
 * points across pixels of similar colour (a roof), traces the resulting mask,
 * simplifies it (or snaps it to a minimum-area rectangle for plain rectangular
 * wings) and writes the polygon back in lat/lng. Output goes to
 * tools/georef-out/footprints.json plus a verification image per place.
 *
 * Usage:
 *   # one place, seed at its current coordinate
 *   node tools/extract-footprints.mjs --shot=1 --place=central-library-zbik
 *
 *   # several places / explicit seeds
 *   node tools/extract-footprints.mjs --shot=1 --place=a,b --tol=30
 *
 *   # automatic pass over every place (writes drafts, flags failures)
 *   node tools/extract-footprints.mjs --shot=1 --all --tol=32
 *
 *   # rectangle mode (min-area rotated rect) for plain blocks
 *   node tools/extract-footprints.mjs --shot=1 --place=x --rect
 *
 * Or via the batch driver:  node tools/trace-buildings.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(__dirname, 'imagery');
const OUT_DIR = path.join(__dirname, 'georef-out');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=') || true];
  }),
);

const transforms = JSON.parse(fs.readFileSync(path.join(IMG_DIR, 'transforms.json'), 'utf8'));
const shotKey = String(args.shot || '1');
const entry = transforms[shotKey];
if (!entry) throw new Error(`unknown shot ${shotKey}`);

const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/bbitPlaces.json'), 'utf8'));
const img = await loadImage(path.join(IMG_DIR, entry.file));

// --------------------------------------------------------------- transform
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
/** screenshot pixel → lat/lng (+0.5 to address pixel centres) */
const toLatLng = (x, y) => [
  cLat + ((refY - y) * s) / METERS_PER_DEG_LAT,
  cLng + ((x - refX) * s) / metersPerDegLng,
];

// ------------------------------------------------------------ image buffer
const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext('2d', { willReadFrequently: true });
ctx.drawImage(img, 0, 0);
const { data: px8, width: W, height: H } = ctx.getImageData(0, 0, img.width, img.height);

const at = (x, y) => {
  const i = (y * W + x) * 4;
  return [px8[i], px8[i + 1], px8[i + 2]];
};
const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/** Region-grow from seeds across pixels within `tol` of the seed colours. */
function grow(seeds, tol, maxPixels = 60000) {
  const mask = new Uint8Array(W * H);
  const stack = [];
  const seedColors = [];
  for (const [sx, sy] of seeds) {
    const x = Math.round(sx);
    const y = Math.round(sy);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    seedColors.push(at(x, y));
    stack.push(y * W + x);
  }
  if (!stack.length) return { mask, count: 0, mean: null };
  let sum = [0, 0, 0];
  let count = 0;
  let mean = seedColors[0].slice();

  while (stack.length) {
    const p = stack.pop();
    if (mask[p]) continue;
    const x = p % W;
    const y = (p - x) / W;
    const c = at(x, y);
    if (dist(c, mean) > tol) continue;
    mask[p] = 1;
    count += 1;
    sum[0] += c[0]; sum[1] += c[1]; sum[2] += c[2];
    mean = [sum[0] / count, sum[1] / count, sum[2] / count];
    if (count > maxPixels) break;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }
  return { mask, count, mean };
}

/** Keep only the largest 4-connected component of a mask. */
function largestComponent(mask) {
  const seen = new Uint8Array(W * H);
  let best = null;
  let bestSize = 0;
  const stack = [];
  for (let p = 0; p < mask.length; p += 1) {
    if (!mask[p] || seen[p]) continue;
    stack.length = 0;
    stack.push(p);
    seen[p] = 1;
    const comp = [];
    while (stack.length) {
      const q = stack.pop();
      comp.push(q);
      const x = q % W;
      const y = (q - x) / W;
      const push = (r) => { if (mask[r] && !seen[r]) { seen[r] = 1; stack.push(r); } };
      if (x > 0) push(q - 1);
      if (x < W - 1) push(q + 1);
      if (y > 0) push(q - W);
      if (y < H - 1) push(q + W);
    }
    if (comp.length > bestSize) { bestSize = comp.length; best = comp; }
  }
  const out = new Uint8Array(W * H);
  for (const p of best || []) out[p] = 1;
  return { mask: out, size: bestSize };
}

/**
 * Marching-squares contour extraction → ordered, closed polygon.
 * Every segment endpoint sits on the half-integer grid, so stitching loops is
 * an exact key match. Returns the largest loop (the building outline).
 */
function traceBoundary(mask) {
  const key = (x, y) => `${x},${y}`;
  const segments = [];
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];

  for (let y = 0; y < H - 1; y += 1) {
    for (let x = 0; x < W - 1; x += 1) {
      const a = inside(x, y);
      const b = inside(x + 1, y);
      const c = inside(x + 1, y + 1);
      const d = inside(x, y + 1);
      const edges = [];
      if (a !== b) edges.push([x + 0.5, y]);        // top
      if (b !== c) edges.push([x + 1, y + 0.5]);    // right
      if (c !== d) edges.push([x + 0.5, y + 1]);    // bottom
      if (d !== a) edges.push([x, y + 0.5]);        // left
      if (edges.length === 2) segments.push([edges[0], edges[1]]);
      else if (edges.length === 4) {
        const [top, right, bottom, left] = edges;
        segments.push([top, right], [bottom, left]);
      }
    }
  }

  const index = new Map();
  segments.forEach((seg, i) => {
    for (const [sx, sy] of seg) {
      const k = key(sx, sy);
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(i);
    }
  });

  const used = new Uint8Array(segments.length);
  let best = [];
  let bestArea = 0;

  for (let i = 0; i < segments.length; i += 1) {
    if (used[i]) continue;
    used[i] = 1;
    const loop = [segments[i][0], segments[i][1]];
    let guard = 0;
    while (guard += 1 < 500000) {
      const tail = loop[loop.length - 1];
      const candidates = index.get(key(tail[0], tail[1])) || [];
      let next = -1;
      for (const c of candidates) if (!used[c]) { next = c; break; }
      if (next < 0) break;
      used[next] = 1;
      const [p1, p2] = segments[next];
      const isP1 = p1[0] === tail[0] && p1[1] === tail[1];
      loop.push(isP1 ? p2 : p1);
      if (loop.length > 3 && loop[0][0] === loop[loop.length - 1][0] && loop[0][1] === loop[loop.length - 1][1]) break;
    }
    if (loop.length < 5) continue;
    let area = 0;
    for (let k = 0; k < loop.length - 1; k += 1) {
      area += loop[k][0] * loop[k + 1][1] - loop[k + 1][0] * loop[k][1];
    }
    area = Math.abs(area / 2);
    if (area > bestArea) { bestArea = area; best = loop; }
  }
  return best;
}

/**
 * Greedy closed-ring simplification (Douglas–Peucker generalised to loops).
 * DP cannot be used directly on a closed ring because its two endpoints
 * coincide; here the ring is unrolled twice and walked once, which keeps the
 * loop's shape while dropping redundant vertices.
 */
function simplify(ring, epsilon) {
  const n = ring.length;
  if (n < 5) return ring;
  const pts = ring.concat(ring);
  const kept = [0];
  let anchor = 0;
  for (let i = 2; i <= n; i += 1) {
    const [ax, ay] = pts[anchor];
    const [bx, by] = pts[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-9;
    let ok = true;
    for (let k = anchor + 1; k < i; k += 1) {
      const d = Math.abs(dy * pts[k][0] - dx * pts[k][1] + bx * ay - by * ax) / len;
      if (d > epsilon) { ok = false; break; }
    }
    if (!ok) {
      kept.push(i - 1);
      anchor = i - 1;
      i = anchor + 1;
    }
  }
  if (kept[kept.length - 1] !== n) kept.push(n);
  return kept.map((idx) => pts[idx]);
}

function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

/** Minimum-area rotated rectangle around a point set (rotating calipers). */
function minAreaRect(points) {
  const hull = convexHull(points);
  let best = null;
  for (let i = 0; i < hull.length; i += 1) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
    for (const [x, y] of hull) {
      const a = x * ux + y * uy;
      const b = -x * uy + y * ux;
      minA = Math.min(minA, a); maxA = Math.max(maxA, a);
      minB = Math.min(minB, b); maxB = Math.max(maxB, b);
    }
    const area = (maxA - minA) * (maxB - minB);
    if (!best || area < best.area) {
      const corner = (a, b) => [a * ux - b * uy, a * uy + b * ux];
      best = {
        area,
        rect: [corner(minA, minB), corner(maxA, minB), corner(maxA, maxB), corner(minA, maxB)],
      };
    }
  }
  return best;
}

/** Snap a seed onto the nearest "roof-like" pixel within a search radius. */
function snapSeed(lat, lng, radiusPx = 26) {
  const [x0, y0] = toPx(lat, lng);
  const cx = Math.round(x0);
  const cy = Math.round(y0);
  let best = null;
  let bestScore = -Infinity;
  for (let dy = -radiusPx; dy <= radiusPx; dy += 1) {
    for (let dx = -radiusPx; dx <= radiusPx; dx += 1) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
      const r = Math.hypot(dx, dy);
      if (r > radiusPx) continue;
      const [R, G, B] = at(x, y);
      const max = Math.max(R, G, B);
      const min = Math.min(R, G, B);
      const sat = max === 0 ? 0 : (max - min) / max;      // roofs are desaturated
      const brightness = (R + G + B) / 3;                  // and not pitch black
      const greenish = G > R + 14 && G > B + 14;           // avoid vegetation
      const score = (1 - sat) * 60 + Math.min(brightness, 170) * 0.35 - r * 1.1 - (greenish ? 90 : 0);
      if (score > bestScore) { bestScore = score; best = [x, y]; }
    }
  }
  return best || [cx, cy];
}

// ------------------------------------------------------------------- driver
const outFile = path.join(OUT_DIR, 'footprints.json');
const results = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

const targets = args.all
  ? places
  : String(args.place || '').split(',').filter(Boolean).map((key) => places.find((p) => p.id === key || p.name.toLowerCase() === key.toLowerCase())).filter(Boolean);

if (!targets.length) {
  console.error('Nothing to do. Pass --place=<id|name> (comma separated) or --all.');
  process.exit(1);
}

const tol = Number(args.tol || 30);
const epsilon = Number(args.eps || 1.6);
const report = [];

for (const place of targets) {
  const seeds = (place.seeds || [[place.lat, place.lng]]).map(([lat, lng]) => snapSeed(lat, lng, Number(args.snap || 26)));
  const { mask, count } = grow(seeds, tol, Number(args.max || 120000));
  const { mask: main, size } = largestComponent(mask);
  if (size < 40) {
    report.push({ id: place.id, name: place.name, ok: false, reason: `tiny region (${size}px)` });
    continue;
  }
  const contour = traceBoundary(main);
  const closed = contour.length > 4 && (contour[0][0] !== contour[contour.length - 1][0] || contour[0][1] !== contour[contour.length - 1][1])
    ? [...contour, contour[0]]
    : contour;
  const simplified = simplify(closed, epsilon);
  const ringPx = args.rect
    ? (minAreaRect(simplified.length > 3 ? simplified : contour)?.rect || simplified)
    : simplified;
  const ring = ringPx.map(([x, y]) => {
    const [lat, lng] = toLatLng(x + 0.5, y + 0.5);
    return [Number(lat.toFixed(7)), Number(lng.toFixed(7))];
  });

  // area check (m²)
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [y1, x1] = ring[i];
    const [y2, x2] = ring[i + 1];
    area += x1 * metersPerDegLng * y2 * METERS_PER_DEG_LAT - x2 * metersPerDegLng * y1 * METERS_PER_DEG_LAT;
  }
  area = Math.abs(area / 2);

  results[place.id] = {
    id: place.id,
    name: place.name,
    category: place.category,
    shot: shotKey,
    pixels: size,
    areaM2: Math.round(area),
    mPerPx: s,
    polygon: ring,
    centroid: [
      Number((ring.reduce((t, p) => t + p[0], 0) / ring.length).toFixed(7)),
      Number((ring.reduce((t, p) => t + p[1], 0) / ring.length).toFixed(7)),
    ],
  };
  report.push({ id: place.id, name: place.name, ok: true, pixels: size, areaM2: Math.round(area) });

  if (args.view) {
    const pad = 70;
    const xs = ringPx.map((p) => p[0]);
    const ys = ringPx.map((p) => p[1]);
    const x0 = Math.max(0, Math.min(...xs) - pad);
    const y0 = Math.max(0, Math.min(...ys) - pad);
    const x1 = Math.min(W, Math.max(...xs) + pad);
    const y1 = Math.min(H, Math.max(...ys) + pad);
    const zoom = Math.min(4, 900 / Math.max(1, x1 - x0));
    const c = createCanvas(Math.round((x1 - x0) * zoom), Math.round((y1 - y0) * zoom));
    const cx2 = c.getContext('2d');
    cx2.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
    cx2.strokeStyle = '#22d3ee';
    cx2.lineWidth = 2.5;
    cx2.beginPath();
    contour.forEach(([x, y], i) => {
      const px = (x - x0) * zoom;
      const py = (y - y0) * zoom;
      if (i === 0) cx2.moveTo(px, py); else cx2.lineTo(px, py);
    });
    cx2.closePath();
    cx2.stroke();
    cx2.strokeStyle = '#f43f5e';
    cx2.lineWidth = 2;
    cx2.beginPath();
    ringPx.forEach(([x, y], i) => {
      const px = (x - x0) * zoom;
      const py = (y - y0) * zoom;
      if (i === 0) cx2.moveTo(px, py); else cx2.lineTo(px, py);
    });
    cx2.closePath();
    cx2.stroke();
    cx2.font = 'bold 15px ui-sans-serif, system-ui, sans-serif';
    cx2.fillStyle = '#fff';
    cx2.strokeStyle = 'rgba(2,6,23,0.9)';
    cx2.lineWidth = 4;
    const title = `${place.name} · ${Math.round(area)} m²`;
    cx2.strokeText(title, 8, 22);
    cx2.fillText(title, 8, 22);
    fs.writeFileSync(path.join(OUT_DIR, `footprint-${place.id}.jpg`), c.toBuffer('image/jpeg', 92));
  }
}

fs.writeFileSync(outFile, `${JSON.stringify(results, null, 2)}\n`);
for (const r of report) {
  console.log(`${r.ok ? '✔' : '✘'} ${r.name.padEnd(34)} ${r.ok ? `${r.areaM2} m² (${r.pixels}px)` : r.reason}`);
}
console.log(`\n→ ${path.relative(ROOT, outFile)} (${Object.keys(results).length} footprints)`);
if (args.view) console.log(`→ verification crops in tools/georef-out/footprint-*.jpg`);
