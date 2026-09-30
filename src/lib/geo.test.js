/**
 * Unit tests — geodesy helpers (src/lib/geo.js)
 * The map depends on these for footprint areas, centroids and the "nearest
 * place" behaviour, so they are pinned against hand-computed answers.
 */
import { describe, it, expect } from 'vitest';
import {
  distanceMeters,
  polygonAreaM2,
  polygonCentroid,
  pointInPolygon,
  boundsOf,
  pathLengthM,
  metersPerDegLng,
  formatArea,
  formatLatLng,
} from './geo';

/** Build a [lat, lng] ring from metre offsets around a base point. */
const ringFromMetres = (baseLat, baseLng, widthM, heightM) => {
  const dLat = heightM / 2 / 111132.92;
  const dLng = widthM / 2 / metersPerDegLng(baseLat);
  return [
    [baseLat + dLat, baseLng - dLng],
    [baseLat + dLat, baseLng + dLng],
    [baseLat - dLat, baseLng + dLng],
    [baseLat - dLat, baseLng - dLng],
  ];
};

describe('distanceMeters', () => {
  it('is zero for identical points', () => {
    expect(distanceMeters(22.4583, 88.1694, 22.4583, 88.1694)).toBe(0);
  });

  it('matches a hand-computed one-degree latitude (≈111 km)', () => {
    const d = distanceMeters(22.0, 88.0, 23.0, 88.0);
    expect(d).toBeGreaterThan(111000);
    expect(d).toBeLessThan(111300);
  });

  it('matches a hand-computed one-degree longitude at 22.46°N (≈102.9 km)', () => {
    const d = distanceMeters(22.4583, 88.0, 22.4583, 89.0);
    expect(d).toBeGreaterThan(102500);
    expect(d).toBeLessThan(103300);
  });

  it('is symmetric', () => {
    const a = distanceMeters(22.4583, 88.1694, 22.4591, 88.1702);
    const b = distanceMeters(22.4591, 88.1702, 22.4583, 88.1694);
    expect(a).toBeCloseTo(b, 6);
  });

  it('measures a 100 m east-west leg to within a metre', () => {
    const lng = 88.1694 + 100 / metersPerDegLng(22.4583);
    expect(distanceMeters(22.4583, 88.1694, 22.4583, lng)).toBeCloseTo(100, 0);
  });
});

describe('polygonAreaM2', () => {
  it('returns 0 for degenerate rings', () => {
    expect(polygonAreaM2([])).toBe(0);
    expect(polygonAreaM2([[22.4, 88.1], [22.5, 88.2]])).toBe(0);
  });

  it('measures a 100 × 50 m block as 5000 m²', () => {
    const ring = ringFromMetres(22.4583, 88.1694, 100, 50);
    expect(Math.abs(polygonAreaM2(ring))).toBeGreaterThan(4800);
    expect(Math.abs(polygonAreaM2(ring))).toBeLessThan(5200);
  });

  it('is orientation-independent in magnitude', () => {
    const ring = ringFromMetres(22.4583, 88.1694, 40, 25);
    expect(Math.abs(polygonAreaM2(ring))).toBeCloseTo(Math.abs(polygonAreaM2(ring.slice().reverse())), 6);
  });
});

describe('polygonCentroid', () => {
  it('finds the centre of a symmetric block', () => {
    const ring = ringFromMetres(22.4583, 88.1694, 60, 30);
    const [lat, lng] = polygonCentroid(ring);
    expect(lat).toBeCloseTo(22.4583, 6);
    expect(lng).toBeCloseTo(88.1694, 6);
  });

  it('returns null for an empty ring and the mean for <3 points', () => {
    expect(polygonCentroid([])).toBeNull();
    const [lat, lng] = polygonCentroid([[22.4, 88.1], [22.6, 88.3]]);
    expect(lat).toBeCloseTo(22.5, 6);
    expect(lng).toBeCloseTo(88.2, 6);
  });
});

describe('pointInPolygon', () => {
  const ring = ringFromMetres(22.4583, 88.1694, 80, 80);

  it('accepts the centre and rejects points outside', () => {
    expect(pointInPolygon(22.4583, 88.1694, ring)).toBe(true);
    expect(pointInPolygon(22.4595, 88.1694, ring)).toBe(false);
    expect(pointInPolygon(22.4583, 88.1720, ring)).toBe(false);
  });
});

describe('boundsOf', () => {
  it('computes [[south, west], [north, east]] from nested paths', () => {
    const bounds = boundsOf([
      [[22.45, 88.16], [22.46, 88.18]],
      [[[22.44, 88.15], [22.47, 88.19]]],
    ]);
    expect(bounds).toEqual([[22.44, 88.15], [22.47, 88.19]]);
  });

  it('ignores malformed points and returns null when there is nothing to measure', () => {
    expect(boundsOf([[[null, null], ['x', 'y']]])).toBeNull();
    expect(boundsOf([])).toBeNull();
  });
});

describe('pathLengthM', () => {
  it('sums a two-leg path', () => {
    const lngStep = 100 / metersPerDegLng(22.4583);
    const path = [[22.4583, 88.1694], [22.4583, 88.1694 + lngStep], [22.4583, 88.1694 + 2 * lngStep]];
    expect(pathLengthM(path)).toBeCloseTo(200, 0);
  });

  it('is zero for short paths', () => {
    expect(pathLengthM([])).toBe(0);
    expect(pathLengthM([[22.4, 88.1]])).toBe(0);
  });
});

describe('formatting helpers', () => {
  it('formats coordinates and areas for the UI', () => {
    expect(formatLatLng(22.4583, 88.1694)).toBe('22.458300° N, 88.169400° E');
    expect(formatArea(0)).toBe('—');
    expect(formatArea(1250)).toMatch(/m²$/);
    expect(formatArea(30000)).toMatch(/ha$/);
  });
});
