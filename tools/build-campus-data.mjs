/**
 * build-campus-data.mjs — spec (screenshot pixel space) → app data (lat/lng)
 *
 * Reads tools/imagery/campus-spec.json, converts every feature from the pixel
 * space of a georeferenced screenshot into WGS84, and writes:
 *   src/data/campusLayout.json   boundary, gates, roads, greens, water
 *   src/data/bbitPlaces.json     50 campus places with real footprints
 *
 * Existing place ids/names drive category, colour and label metadata, so the
 * rest of the app keeps working; geometry is fully replaced.
 *
 *   node tools/build-campus-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(__dirname, 'imagery');

const spec = JSON.parse(fs.readFileSync(path.join(IMG_DIR, 'campus-spec.json'), 'utf8'));
const transforms = JSON.parse(fs.readFileSync(path.join(IMG_DIR, 'transforms.json'), 'utf8'));
const tf = transforms[spec.shot];
if (!tf) throw new Error(`transforms.json has no entry for shot ${spec.shot}`);

const { lat: cLat, lng: cLng } = tf.center;
const s = tf.mPerPx;
const METERS_PER_DEG_LAT = 111132.92;
const metersPerDegLng = 111412.84 * Math.cos((cLat * Math.PI) / 180);
const refX = tf.refPixel ? tf.refPixel[0] : 784;
const refY = tf.refPixel ? tf.refPixel[1] : 393.5;

const r7 = (n) => Number(n.toFixed(7));

/** screenshot pixel → [lat, lng] */
const toLatLng = (x, y) => [
  r7(cLat + ((refY - y) * s) / METERS_PER_DEG_LAT),
  r7(cLng + ((x - refX) * s) / metersPerDegLng),
];

const rectRing = ([x0, y0, x1, y1]) => [
  toLatLng(x0, y0),
  toLatLng(x1, y0),
  toLatLng(x1, y1),
  toLatLng(x0, y1),
];

/** Rotated rectangle: [cx, cy, width, height, degrees] (degrees clockwise on screen). */
const rectRotRing = ([cx, cy, w, h, deg = 0]) => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ];
  return corners.map(([dx, dy]) => toLatLng(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos));
};

/** Any spec shape → lat/lng ring (spec shapes are already in pixel space). */
const shapeRing = (shape) => {
  if (shape.poly) return shape.poly.map(([x, y]) => toLatLng(x, y));
  if (shape.rectRot) return rectRotRing(shape.rectRot);
  if (shape.rect) return rectRing(shape.rect);
  throw new Error(`unsupported shape: ${JSON.stringify(shape).slice(0, 80)}`);
};

/** Pixel-space bbox of a pixel-space ring (from the spec, before conversion). */
const bboxOf = (ring) => {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};
const overlapArea = (a, b) => {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
};

const centroidOf = (ring) => {
  // Planar centroid, computed relative to the first vertex: using absolute
  // coordinates here loses precision (the cross products are ~1e10).
  const kx = metersPerDegLng;
  const ky = METERS_PER_DEG_LAT;
  const y0 = ring[0][0];
  const x0 = ring[0][1];
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [y1, x1] = ring[i];
    const [y2, x2] = ring[(i + 1) % ring.length];
    const px1 = (x1 - x0) * kx;
    const py1 = (y1 - y0) * ky;
    const px2 = (x2 - x0) * kx;
    const py2 = (y2 - y0) * ky;
    const f = px1 * py2 - px2 * py1;
    a += f;
    cx += (px1 + px2) * f;
    cy += (py1 + py2) * f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) {
    return [
      r7(ring.reduce((t, p) => t + p[0], 0) / ring.length),
      r7(ring.reduce((t, p) => t + p[1], 0) / ring.length),
    ];
  }
  return [r7(y0 + cy / (6 * a) / ky), r7(x0 + cx / (6 * a) / kx)];
};

/* ------------------------------------------------------------------ layout */

const poly = (ring) => ring.map(([x, y]) => toLatLng(x, y));

/**
 * Miter-offset a closed ring inwards (used to generate the campus ring road,
 * which runs just inside the boundary wall).
 */
function insetRing(ring, distance) {
  const pts = ring.slice(0, -1); // drop the repeated closing vertex
  const n = pts.length;
  const centroidX = pts.reduce((t, p) => t + p[0], 0) / n;
  const centroidY = pts.reduce((t, p) => t + p[1], 0) / n;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const inwards = (a, b) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      // interior is to the right for a clockwise ring, left for anticlockwise
      return [dy / len, -dx / len];
    };
    const [n1x, n1y] = inwards(prev, cur);
    const [n2x, n2y] = inwards(cur, next);
    let bx = n1x + n2x;
    let by = n1y + n2y;
    const blen = Math.hypot(bx, by) || 1;
    bx /= blen;
    by /= blen;
    // make sure the offset really moves inside: compare with the centroid
    const toCentroidX = centroidX - cur[0];
    const toCentroidY = centroidY - cur[1];
    if (bx * toCentroidX + by * toCentroidY < 0) { bx = -bx; by = -by; }
    const cosHalf = Math.max(0.35, (n1x * bx + n1y * by));
    out.push([cur[0] + bx * (distance / cosHalf), cur[1] + by * (distance / cosHalf)]);
  }
  return out;
}

const layout = {
  meta: {
    source: 'Satellite imagery (Google Maps / Esri World Imagery) read against OpenStreetMap road and place anchors',
    georeference: {
      shot: tf.file,
      centre: tf.center,
      mPerPx: tf.mPerPx,
      reference: tf.note || null,
    },
    derivedFrom: 'tools/imagery/campus-spec.json',
    builtBy: 'tools/build-campus-data.mjs',
    accuracy: 'Block-level reconstruction: positions and sizes follow the imagery; individual wall lines are indicative.',
  },
  // closed ring: the boundary is drawn as a polyline (not a Leaflet polygon),
  // so the last vertex must repeat the first one
  boundary: (() => {
    const ring = poly(spec.boundary);
    const [fLat, fLng] = ring[0];
    const [lLat, lLng] = ring[ring.length - 1];
    if (fLat !== lLat || fLng !== lLng) ring.push(ring[0]);
    return ring;
  })(),
  gates: spec.gates.map((g) => {
    const [lat, lng] = toLatLng(g.px[0], g.px[1]);
    return {
      id: g.id,
      name: g.name,
      shortName: g.shortName,
      kind: g.kind,
      lat,
      lng,
      details: g.details,
    };
  }),
  roads: [
    // ring road: generated just inside the campus wall
    ...(() => {
      const inset = Number(spec.ringInsetPx || 15);
      const ringPx = insetRing(spec.boundary, inset);
      return [{
        id: 'road-ring',
        name: 'Campus Ring Road',
        kind: 'internal',
        path: ringPx.concat([ringPx[0]]).map(([x, y]) => toLatLng(x, y)),
      }];
    })(),
    ...spec.roads.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      path: r.path.map(([x, y]) => toLatLng(x, y)),
    })),
  ],
  greens: spec.greens.map((g) => ({
    id: g.id,
    name: g.name,
    polygon: g.poly ? poly(g.poly) : poly(rectRing(g.px)),
  })),
  water: spec.water.map((w) => ({
    id: w.id,
    name: w.name,
    polygon: w.poly ? poly(w.poly) : poly(rectRing(w.px)),
  })),
  parking: (spec.parking || []).map((p) => ({
    id: p.id,
    name: p.name,
    polygon: p.poly.map(([x, y]) => toLatLng(x, y)),
  })),
  wall: (spec.wall || spec.boundary).map(([x, y]) => toLatLng(x, y)),
  structures: (spec.structures || []).map((st) => ({
    id: st.id,
    name: st.name,
    polygon: shapeRing(st),
  })),
  trees: (spec.trees || []).map(([x, y, r]) => {
    const [lat, lng] = toLatLng(x, y);
    return { lat, lng, radiusM: Number((r * s * 2).toFixed(1)) };
  }),
};

fs.writeFileSync(path.join(ROOT, 'src/data/campusLayout.json'), `${JSON.stringify(layout, null, 2)}\n`);

/* ------------------------------------------------------------------ places */

const existing = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/bbitPlaces.json'), 'utf8'));
const byId = new Map(existing.map((p) => [p.id, p]));
const byName = new Map(existing.map((p) => [p.name.toLowerCase(), p]));

const CATEGORY_LABELS = {
  landmark: 'gate', admin: 'administration', library: 'library', academic: 'academic block',
  building: 'auditorium', hostel: 'hostel', mess: 'dining hall', canteen: 'canteen',
  food: 'food court', tea: 'snack counter', sports: 'sports facility', gym: 'fitness',
  green: 'green space', health: 'health centre', atm: 'campus service',
};

const CATEGORY_COLORS = {
  landmark: '#FF3B30', admin: '#AF52DE', library: '#5856D6', academic: '#0071E3',
  building: '#FF9500', hostel: '#34C759', mess: '#FF9F0A', canteen: '#FF9F0A',
  food: '#FF9F0A', tea: '#FFB340', sports: '#30B0C7', gym: '#30B0C7',
  green: '#2DA44E', health: '#FF2D55', atm: '#8E8E93',
};

const aliasFor = (id, name) => {
  const prev = byId.get(id) || byName.get(name.toLowerCase());
  return prev?.aliases || [];
};

const places = spec.buildings.map((b) => {
  const ring = shapeRing(b);
  const centroid = centroidOf(ring);
  const category = b.category;
  return {
    id: b.id,
    name: b.name,
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    color: CATEGORY_COLORS[category] || '#0071E3',
    lat: centroid[0],
    lng: centroid[1],
    shortName: b.shortName || b.name,
    major: Boolean(b.major),
    levels: b.levels || null,
    polygon: ring,
    details: b.details,
    aliases: aliasFor(b.id, b.name),
  };
});

fs.writeFileSync(path.join(ROOT, 'src/data/bbitPlaces.json'), `${JSON.stringify(places, null, 2)}\n`);

/* ---------------------------------------------------------------- reporting */

const area = (ring) => {
  const kx = metersPerDegLng;
  const ky = METERS_PER_DEG_LAT;
  const y0 = ring[0][0];
  const x0 = ring[0][1];
  let a = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [y1, x1] = ring[i];
    const [y2, x2] = ring[(i + 1) % ring.length];
    a += (x1 - x0) * kx * (y2 - y0) * ky - (x2 - x0) * kx * (y1 - y0) * ky;
  }
  return Math.abs(a / 2);
};

// ------------------------------------------------------------------ QA pass
const problems = [];
/** Spec shape → pixel ring of [x, y] pairs (for QA before lat/lng conversion). */
const specRingPx = (shape) => {
  if (shape.poly) return shape.poly;
  if (shape.rectRot) {
    const [cx, cy, w, h, deg = 0] = shape.rectRot;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
      .map(([dx, dy]) => [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]);
  }
  const [x0, y0, x1, y1] = shape.rect;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
};

const shapes = [
  ...spec.buildings.map((b) => ({ id: b.id, name: b.name, ring: specRingPx(b), kind: 'place' })),
  ...(spec.structures || []).map((b) => ({ id: b.id, name: b.name, ring: specRingPx(b), kind: 'structure' })),
];
const bboxes = shapes.map((sh) => ({ ...sh, bb: bboxOf(sh.ring) }));
for (let i = 0; i < bboxes.length; i += 1) {
  for (let j = i + 1; j < bboxes.length; j += 1) {
    const a = bboxes[i];
    const b = bboxes[j];
    const ov = overlapArea(a.bb, b.bb);
    const areaA = (a.bb.x1 - a.bb.x0) * (a.bb.y1 - a.bb.y0);
    if (ov > Math.min(areaA, (b.bb.x1 - b.bb.x0) * (b.bb.y1 - b.bb.y0)) * 0.12) {
      problems.push(`overlap: ${a.name} ↔ ${b.name} (${Math.round(ov)} px²)`);
    }
  }
}
const centreOf = (ring) => [ring.reduce((t, p) => t + p[0], 0) / ring.length, ring.reduce((t, p) => t + p[1], 0) / ring.length];
for (const sh of bboxes) {
  const [cx, cy] = centreOf(sh.ring);
  let inside = false;
  const b = spec.boundary;
  for (let i = 0, j = b.length - 1; i < b.length; j = i, i += 1) {
    const [xi, yi] = b[i];
    const [xj, yj] = b[j];
    if ((yi > cy) !== (yj > cy) && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
  }
  if (!inside) problems.push(`outside campus boundary: ${sh.name}`);
}

// road centreline vs building footprint: a road may touch a block (it serves it)
// but must not run through it for more than a few metres.
const segRectOverlapLength = (roadPx, rect) => {
  const inside = (x, y) => x >= rect[0] && x <= rect[2] && y >= rect[1] && y <= rect[3];
  let run = 0;
  for (let i = 1; i < roadPx.length; i += 1) {
    const [x1, y1] = roadPx[i - 1];
    const [x2, y2] = roadPx[i];
    const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    let prev = inside(x1, y1);
    for (let k = 1; k <= steps; k += 1) {
      const t = k / steps;
      const cur = inside(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
      if (cur) run += Math.hypot(x2 - x1, y2 - y1) / steps;
      prev = cur;
    }
  }
  return run;
};
for (const road of spec.roads) {
  for (const b of spec.buildings) {
    const rect = b.rect || (b.rectRot ? [b.rectRot[0] - b.rectRot[2] / 2, b.rectRot[1] - b.rectRot[3] / 2, b.rectRot[0] + b.rectRot[2] / 2, b.rectRot[1] + b.rectRot[3] / 2] : null);
    if (!rect) continue;
    const runM = (segRectOverlapLength(road.path, rect) * s);
    // a drive is allowed to terminate at the building it serves
    const serves = String(road.id || '').includes('entry-drive') && ['main-gate', 'reception-and-enquiry'].includes(b.id);
    if (runM > 6 && !serves) problems.push(`road through building: ${road.name} → ${b.name} (${runM.toFixed(0)} m inside)`);
  }
}

console.log(`wrote src/data/campusLayout.json — ${layout.roads.length} roads, ${layout.greens.length} greens, ${layout.water.length} water, ${layout.gates.length} gates, ${layout.trees.length} trees, ${layout.structures.length} structures`);
if (problems.length) {
  console.log(`\n⚠ ${problems.length} layout problem(s):`);
  for (const p of problems) console.log(`   · ${p}`);
} else {
  console.log('\n✔ no building overlaps, every block inside the boundary');
}
console.log(`wrote src/data/bbitPlaces.json — ${places.length} places`);
for (const p of places) {
  console.log(`  ${p.name.padEnd(32)} ${String(Math.round(area(p.polygon))).padStart(6)} m²  ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
}
