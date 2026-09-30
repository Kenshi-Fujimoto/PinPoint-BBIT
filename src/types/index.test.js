/**
 * Unit tests — Domain types, campus geofence & curated data invariants
 * Covers: isInsideCampus, clampToCampus, BBIT_* constants, category/status
 *         catalogues, and the 50 curated campus places.
 *
 * Corresponds to QA suites MAP-01…04, MAP-09 and the "app starts empty /
 * no fake data" project promise in docs/_qa-checklist.md §9.1.
 */
import { describe, it, expect } from 'vitest';
import {
  CIVIC_CATEGORIES,
  CIVIC_STATUSES,
  LOST_FOUND_CATEGORIES,
  BBIT_MAP_CENTER,
  BBIT_MAP_ZOOM,
  BBIT_CAMPUS_BOUNDS,
  BBIT_CAMPUS_PLACES,
  CAMPUS_LANDMARKS,
  isInsideCampus,
  clampToCampus,
} from './index';

// Official BBIT boundary box: lat 22.4570–22.4618, lng 88.1658–88.1710
const SW = [22.4570, 88.1658];
const NE = [22.4618, 88.1710];
const CENTER = [22.4589, 88.1695];

describe('isInsideCampus (strict geofence)', () => {
  it('accepts the campus centre (MAP-01)', () => {
    expect(isInsideCampus(CENTER[0], CENTER[1])).toBe(true);
  });

  it('treats the boundary corners as inside (inclusive bounds, MAP-03)', () => {
    expect(isInsideCampus(SW[0], SW[1])).toBe(true);
    expect(isInsideCampus(NE[0], NE[1])).toBe(true);
    expect(isInsideCampus(SW[0], NE[1])).toBe(true);
    expect(isInsideCampus(NE[0], SW[1])).toBe(true);
  });

  it('rejects coordinates just outside each edge (MAP-02, MAP-03)', () => {
    expect(isInsideCampus(22.4569, CENTER[1])).toBe(false); // south of campus
    expect(isInsideCampus(22.4619, CENTER[1])).toBe(false); // north of campus
    expect(isInsideCampus(CENTER[0], 88.1657)).toBe(false); // west of campus
    expect(isInsideCampus(CENTER[0], 88.1711)).toBe(false); // east of campus
  });

  it('rejects other cities entirely', () => {
    expect(isInsideCampus(22.5726, 88.3639)).toBe(false); // Kolkata
    expect(isInsideCampus(19.0760, 72.8777)).toBe(false); // Mumbai
    expect(isInsideCampus(28.6139, 77.2090)).toBe(false); // Delhi
  });
});

describe('clampToCampus', () => {
  it('leaves on-campus coordinates untouched', () => {
    expect(clampToCampus(CENTER[0], CENTER[1])).toEqual(CENTER);
  });

  it('clamps far-away coordinates to the nearest campus corner', () => {
    expect(clampToCampus(40, 100)).toEqual(NE);
    expect(clampToCampus(-40, -100)).toEqual(SW);
  });

  it('clamps only the offending axis', () => {
    expect(clampToCampus(22.46, 88.15)).toEqual([22.46, SW[1]]);
    expect(clampToCampus(22.4, 88.17)).toEqual([SW[0], 88.17]);
  });
});

describe('Map constants', () => {
  it('exposes the BBIT map centre, zoom level and boundary box', () => {
    expect(BBIT_MAP_CENTER).toEqual(CENTER);
    expect(BBIT_MAP_ZOOM).toBe(17);
    expect(BBIT_CAMPUS_BOUNDS).toEqual([SW, NE]);
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

  it('keeps every curated place inside the official campus bounds', () => {
    for (const place of BBIT_CAMPUS_PLACES) {
      expect(isInsideCampus(place.lat, place.lng)).toBe(true);
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
