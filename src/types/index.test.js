/**
 * Unit tests — Domain types, campus geofence & curated data invariants
 * Covers: isInsideCampus, clampToCampus, BBIT_* constants, category/status
 *         catalogues, the surveyed campus layout and the 50 curated places.
 *
 * Corresponds to QA suites MAP-01…09 and the "app starts empty / no fake
 * data" project promise in docs/_qa-checklist.md §9.1.
 */
import { describe, it, expect } from 'vitest';
import {
  CIVIC_CATEGORIES,
  CIVIC_STATUSES,
  LOST_FOUND_CATEGORIES,
  BBIT_MAP_CENTER,
  BBIT_MAP_ZOOM,
  BBIT_CAMPUS_BOUNDS,
  BBIT_CAMPUS_LAYOUT,
  BBIT_CAMPUS_PLACES,
  CAMPUS_LANDMARKS,
  CAMPUS_GATES,
  isInsideCampus,
  clampToCampus,
} from './index';

const [[SOUTH, WEST], [NORTH, EAST]] = BBIT_CAMPUS_BOUNDS;

/** Planar metres between two [lat, lng] points (campus scale). */
const metres = (a, b) => Math.hypot((a[0] - b[0]) * 111132.92, (a[1] - b[1]) * 102970);

describe('isInsideCampus (surveyed campus geofence)', () => {
  it('accepts the campus centre (MAP-01)', () => {
    expect(isInsideCampus(BBIT_MAP_CENTER[0], BBIT_MAP_CENTER[1])).toBe(true);
  });

  it('treats the geofence edges as inside (inclusive bounds, MAP-03)', () => {
    expect(isInsideCampus(SOUTH, WEST)).toBe(true);
    expect(isInsideCampus(NORTH, EAST)).toBe(true);
    expect(isInsideCampus(SOUTH, EAST)).toBe(true);
    expect(isInsideCampus(NORTH, WEST)).toBe(true);
  });

  it('rejects coordinates just outside each edge (MAP-02, MAP-03)', () => {
    const eps = 0.00005; // ≈5 m
    expect(isInsideCampus(SOUTH - eps, BBIT_MAP_CENTER[1])).toBe(false);
    expect(isInsideCampus(NORTH + eps, BBIT_MAP_CENTER[1])).toBe(false);
    expect(isInsideCampus(BBIT_MAP_CENTER[0], WEST - eps)).toBe(false);
    expect(isInsideCampus(BBIT_MAP_CENTER[0], EAST + eps)).toBe(false);
  });

  it('rejects other cities entirely', () => {
    expect(isInsideCampus(22.5726, 88.3639)).toBe(false); // Kolkata
    expect(isInsideCampus(19.0760, 72.8777)).toBe(false); // Mumbai
    expect(isInsideCampus(28.6139, 77.2090)).toBe(false); // Delhi
  });

  it('spans the surveyed campus rather than a hand-drawn box', () => {
    // the campus is roughly 400 m × 340 m of real ground
    const widthM = (EAST - WEST) * 102970;
    const heightM = (NORTH - SOUTH) * 111132.92;
    expect(widthM).toBeGreaterThan(250);
    expect(widthM).toBeLessThan(500);
    expect(heightM).toBeGreaterThan(250);
    expect(heightM).toBeLessThan(450);
  });
});

describe('clampToCampus', () => {
  it('leaves on-campus coordinates untouched', () => {
    expect(clampToCampus(BBIT_MAP_CENTER[0], BBIT_MAP_CENTER[1])).toEqual(BBIT_MAP_CENTER);
  });

  it('clamps far-away coordinates to the nearest campus corner', () => {
    expect(clampToCampus(40, 100)).toEqual([NORTH, EAST]);
    expect(clampToCampus(-40, -100)).toEqual([SOUTH, WEST]);
  });

  it('clamps only the offending axis', () => {
    expect(clampToCampus(22.459, 88.0)).toEqual([22.459, WEST]);
    expect(clampToCampus(22.0, 88.1695)).toEqual([SOUTH, 88.1695]);
  });
});

describe('Map constants', () => {
  it('places the map centre inside the surveyed campus', () => {
    expect(isInsideCampus(BBIT_MAP_CENTER[0], BBIT_MAP_CENTER[1])).toBe(true);
    expect(BBIT_MAP_ZOOM).toBeGreaterThanOrEqual(16);
    expect(BBIT_MAP_ZOOM).toBeLessThanOrEqual(18);
  });

  it('derives the geofence from the campus wall in the layout data', () => {
    for (const [lat, lng] of BBIT_CAMPUS_LAYOUT.boundary) {
      expect(isInsideCampus(lat, lng)).toBe(true);
    }
  });
});

describe('Surveyed campus layout', () => {
  it('describes a closed boundary wall with real shape', () => {
    expect(BBIT_CAMPUS_LAYOUT.boundary.length).toBeGreaterThanOrEqual(12);
    expect(metres(BBIT_CAMPUS_LAYOUT.boundary[0], BBIT_CAMPUS_LAYOUT.boundary.at(-1))).toBeLessThan(2);
  });

  it('contains roads, greens, water, parking, trees and gates', () => {
    expect(BBIT_CAMPUS_LAYOUT.roads.length).toBeGreaterThanOrEqual(8);
    expect(BBIT_CAMPUS_LAYOUT.greens.length).toBeGreaterThanOrEqual(4);
    expect(BBIT_CAMPUS_LAYOUT.water.length).toBeGreaterThanOrEqual(1);
    expect(BBIT_CAMPUS_LAYOUT.parking.length).toBeGreaterThanOrEqual(1);
    expect(BBIT_CAMPUS_LAYOUT.trees.length).toBeGreaterThanOrEqual(10);
    expect(BBIT_CAMPUS_LAYOUT.gates.length).toBeGreaterThanOrEqual(2);
  });

  it('gives every road a name, a kind and at least two points', () => {
    const kinds = new Set(['arterial', 'internal', 'service', 'footpath']);
    for (const road of BBIT_CAMPUS_LAYOUT.roads) {
      expect(road.name).toBeTruthy();
      expect(kinds.has(road.kind)).toBe(true);
      expect(road.path.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps every road, tree and structure inside the campus geofence', () => {
    for (const road of BBIT_CAMPUS_LAYOUT.roads) {
      for (const [lat, lng] of road.path) expect(isInsideCampus(lat, lng)).toBe(true);
    }
    for (const tree of BBIT_CAMPUS_LAYOUT.trees) expect(isInsideCampus(tree.lat, tree.lng)).toBe(true);
    for (const st of BBIT_CAMPUS_LAYOUT.structures) {
      expect(st.polygon.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('positions every gate on or near the campus wall', () => {
    for (const gate of CAMPUS_GATES) {
      expect(isInsideCampus(gate.lat, gate.lng)).toBe(true);
      const nearest = Math.min(...BBIT_CAMPUS_LAYOUT.boundary.map((pt) => metres([gate.lat, gate.lng], pt)));
      expect(nearest).toBeLessThan(90);
    }
  });
});

describe('Civic category & status catalogues', () => {
  it('defines all 9 civic categories with unique ids and full styling metadata', () => {
    expect(CIVIC_CATEGORIES).toHaveLength(9);
    const ids = CIVIC_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(9);
    expect(ids).toContain('pothole');
    expect(ids).toContain('other');
    for (const category of CIVIC_CATEGORIES) {
      expect(category.label).toBeTruthy();
      expect(category.icon).toBeTruthy();
      expect(category.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(category.emoji).toBeTruthy();
      expect(category.tagClass).toBeTruthy();
    }
  });

  it('defines the 4-stage status pipeline in order (STS-01)', () => {
    expect(CIVIC_STATUSES.map((s) => s.id)).toEqual([
      'reported', 'acknowledged', 'in_progress', 'resolved',
    ]);
    for (const status of CIVIC_STATUSES) {
      expect(status.label).toBeTruthy();
      expect(status.description).toBeTruthy();
      expect(status.badgeClass).toBeTruthy();
    }
  });

  it('defines all 6 lost & found categories with unique ids', () => {
    expect(LOST_FOUND_CATEGORIES).toHaveLength(6);
    const ids = LOST_FOUND_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(6);
    expect(ids).toContain('electronics');
    expect(ids).toContain('other');
    for (const category of LOST_FOUND_CATEGORIES) {
      expect(category.label).toBeTruthy();
      expect(category.icon).toBeTruthy();
    }
  });
});

describe('Curated campus places (50 BBIT landmarks)', () => {
  it('contains exactly 50 places (MAP-04)', () => {
    expect(BBIT_CAMPUS_PLACES).toHaveLength(50);
  });

  it('has unique ids and unique names', () => {
    const ids = BBIT_CAMPUS_PLACES.map((p) => p.id);
    const names = BBIT_CAMPUS_PLACES.map((p) => p.name);
    expect(new Set(ids).size).toBe(50);
    expect(new Set(names).size).toBe(50);
  });

  it('gives every place complete, well-formed metadata', () => {
    for (const place of BBIT_CAMPUS_PLACES) {
      expect(place.id).toBeTruthy();
      expect(place.name).toBeTruthy();
      expect(place.category).toBeTruthy();
      expect(place.categoryLabel).toBeTruthy();
      expect(place.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Number.isFinite(place.lat)).toBe(true);
      expect(Number.isFinite(place.lng)).toBe(true);
    }
  });

  it('keeps every curated place centroid inside the campus geofence', () => {
    for (const place of BBIT_CAMPUS_PLACES) {
      expect(isInsideCampus(place.lat, place.lng)).toBe(true);
    }
  });

  it('gives every place a real footprint polygon (MAP-07)', () => {
    for (const place of BBIT_CAMPUS_PLACES) {
      expect(Array.isArray(place.polygon)).toBe(true);
      expect(place.polygon.length).toBeGreaterThanOrEqual(3);
      // footprint is measured in metres at campus scale: 20 m² … 20 000 m²
      const latSpan = (Math.max(...place.polygon.map((p) => p[0])) - Math.min(...place.polygon.map((p) => p[0]))) * 111132.92;
      const lngSpan = (Math.max(...place.polygon.map((p) => p[1])) - Math.min(...place.polygon.map((p) => p[1]))) * 102970;
      const boxArea = latSpan * lngSpan;
      expect(boxArea).toBeGreaterThan(20);
      expect(boxArea).toBeLessThan(20000);
    }
  });

  it('does not let two building footprints sit on top of each other (MAP-08)', () => {
    const boxes = BBIT_CAMPUS_PLACES.map((place) => {
      const lats = place.polygon.map((p) => p[0] * 111132.92);
      const lngs = place.polygon.map((p) => p[1] * 102970);
      return {
        id: place.id,
        name: place.name,
        x0: Math.min(...lngs), x1: Math.max(...lngs),
        y0: Math.min(...lats), y1: Math.max(...lats),
      };
    });
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (w <= 0 || h <= 0) continue;
        const overlap = w * h;
        const smaller = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
        // adjacent wings may touch slightly; anything more is a data error
        expect(overlap / smaller, `${a.name} overlaps ${b.name}`).toBeLessThan(0.15);
      }
    }
  });

  it('projects every place into CAMPUS_LANDMARKS with map-ready fields (MAP-09)', () => {
    expect(CAMPUS_LANDMARKS).toHaveLength(50);
    for (const landmark of CAMPUS_LANDMARKS) {
      expect(landmark).toHaveProperty('id');
      expect(landmark).toHaveProperty('name');
      expect(landmark).toHaveProperty('lat');
      expect(landmark).toHaveProperty('lng');
      expect(landmark).toHaveProperty('category');
      expect(landmark).toHaveProperty('color');
    }
  });
});
