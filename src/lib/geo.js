/**
 * Geodesy helpers for the BBIT campus map.
 * ---------------------------------------------------------------------------
 * Everything here works on plain [lat, lng] pairs (Leaflet's convention) so it
 * can be shared between the React map surfaces, the geofence utilities and the
 * unit tests. Distances use an equirectangular approximation with a latitude
 * scale factor — accurate to well under a metre at campus scale, which is far
 * below the precision of the survey data itself.
 */

export const EARTH_RADIUS_M = 6378137;
export const METERS_PER_DEG_LAT = 111132.92;

/** Metres per degree of longitude at a given latitude. */
export function metersPerDegLng(lat) {
  return 111412.84 * Math.cos((lat * Math.PI) / 180) - 93.5 * Math.cos((3 * lat * Math.PI) / 180);
}

/** Planar distance in metres between two [lat, lng] points. */
export function distanceMeters(aLat, aLng, bLat, bLng) {
  const midLat = ((aLat + bLat) / 2) * (Math.PI / 180);
  const dx = (bLng - aLng) * 111412.84 * Math.cos(midLat);
  const dy = (bLat - aLat) * METERS_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/**
 * Signed area of a [lat, lng] ring in square metres (positive = CCW).
 * Worked in metres relative to the first vertex: absolute lat/lng products are
 * ~1e13 here and their cancellation costs several digits of precision.
 */
export function polygonAreaM2(ring) {
  if (!ring || ring.length < 3) return 0;
  const ky = METERS_PER_DEG_LAT;
  const meanLat = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const kx = metersPerDegLng(meanLat);
  const [y0, x0] = ring[0];
  let area = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [y1, x1] = ring[i];
    const [y2, x2] = ring[(i + 1) % ring.length];
    const px1 = (x1 - x0) * kx;
    const py1 = (y1 - y0) * ky;
    const px2 = (x2 - x0) * kx;
    const py2 = (y2 - y0) * ky;
    area += px1 * py2 - px2 * py1;
  }
  return area / 2;
}

/**
 * Geometric centre of a [lat, lng] ring (area centroid, falling back to the
 * plain mean for degenerate rings). Metres-relative for numerical stability.
 */
export function polygonCentroid(ring) {
  if (!ring || !ring.length) return null;
  const mean = () => [
    ring.reduce((s, p) => s + p[0], 0) / ring.length,
    ring.reduce((s, p) => s + p[1], 0) / ring.length,
  ];
  if (ring.length < 3) return mean();

  const ky = METERS_PER_DEG_LAT;
  const meanLat = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const kx = metersPerDegLng(meanLat);
  const [y0, x0] = ring[0];
  let cx = 0;
  let cy = 0;
  let signedArea = 0;

  for (let i = 0; i < ring.length; i += 1) {
    const [y1, x1] = ring[i];
    const [y2, x2] = ring[(i + 1) % ring.length];
    const px1 = (x1 - x0) * kx;
    const py1 = (y1 - y0) * ky;
    const px2 = (x2 - x0) * kx;
    const py2 = (y2 - y0) * ky;
    const a = px1 * py2 - px2 * py1;
    signedArea += a;
    cx += (px1 + px2) * a;
    cy += (py1 + py2) * a;
  }

  if (Math.abs(signedArea) < 1e-6) return mean();
  signedArea *= 0.5;
  return [y0 + cy / (6 * signedArea) / ky, x0 + cx / (6 * signedArea) / kx];
}

/** Ray-casting point-in-polygon test for a [lat, lng] ring. */
export function pointInPolygon(lat, lng, ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const yi = ring[i][0];
    const xi = ring[i][1];
    const yj = ring[j][0];
    const xj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Axis-aligned bounds of a collection of [lat, lng] paths: [[south, west], [north, east]] */
export function boundsOf(paths) {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  const visit = (pt) => {
    if (!Array.isArray(pt) || pt.length < 2 || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) return;
    south = Math.min(south, pt[0]);
    north = Math.max(north, pt[0]);
    west = Math.min(west, pt[1]);
    east = Math.max(east, pt[1]);
  };
  const walk = (val) => {
    if (!Array.isArray(val)) return;
    if (typeof val[0] === 'number') visit(val);
    else val.forEach(walk);
  };
  walk(paths);
  if (!Number.isFinite(south)) return null;
  return [[south, west], [north, east]];
}

/** Great-circle-ish length of a polyline of [lat, lng] points, in metres. */
export function pathLengthM(path) {
  let total = 0;
  for (let i = 1; i < (path?.length || 0); i += 1) {
    total += distanceMeters(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
  }
  return total;
}

/** Pretty "lat, lng" label used across the map surfaces. */
export function formatLatLng(lat, lng, digits = 6) {
  return `${Number(lat).toFixed(digits)}° N, ${Number(lng).toFixed(digits)}° E`;
}

/** Human readable area, e.g. 1,240 m². */
export function formatArea(m2) {
  if (!Number.isFinite(m2) || m2 <= 0) return '—';
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${Math.round(m2).toLocaleString('en-IN')} m²`;
}
