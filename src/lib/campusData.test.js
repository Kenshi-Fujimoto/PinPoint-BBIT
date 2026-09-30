/**
 * Unit tests — campus data access layer (src/lib/campusData.js)
 * Guards the contract every map surface relies on: enriched places, category
 * catalogue, search, nearest-place lookup and the layer zoom table.
 */
import { describe, it, expect } from 'vitest';
import {
  CAMPUS_LAYOUT,
  CAMPUS_PLACES,
  PLACE_CATEGORY_META,
  LAYER_ZOOM,
  placesWithGeometry,
  placeCategories,
  placeColor,
  findPlaceById,
  findPlaceByName,
  nearestPlace,
  searchPlaces,
  layerCounts,
  campusBounds,
} from './campusData';

describe('enriched campus places', () => {
  it('exposes all 50 curated places with derived geometry', () => {
    expect(placesWithGeometry).toHaveLength(50);
    for (const place of placesWithGeometry) {
      expect(place.centroid).toHaveLength(2);
      expect(Number.isFinite(place.centroid[0])).toBe(true);
      expect(Number.isFinite(place.centroid[1])).toBe(true);
      expect(place.areaM2).toBeGreaterThan(0);
      expect(place.bounds).not.toBeNull();
      expect(place.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('places the centroid inside the footprint bounds (MAP-07)', () => {
    for (const place of placesWithGeometry) {
      const [[south, west], [north, east]] = place.bounds;
      expect(place.centroid[0]).toBeGreaterThanOrEqual(south - 1e-6);
      expect(place.centroid[0]).toBeLessThanOrEqual(north + 1e-6);
      expect(place.centroid[1]).toBeGreaterThanOrEqual(west - 1e-6);
      expect(place.centroid[1]).toBeLessThanOrEqual(east + 1e-6);
    }
  });

  it('keeps every footprint a plausible size for a campus building or ground', () => {
    for (const place of placesWithGeometry) {
      expect(place.areaM2).toBeGreaterThan(60);
      expect(place.areaM2).toBeLessThan(15000);
    }
  });

  it('marks a sensible number of key landmarks for labelling', () => {
    const majors = placesWithGeometry.filter((p) => p.major);
    expect(majors.length).toBeGreaterThanOrEqual(8);
    expect(majors.length).toBeLessThanOrEqual(20);
  });
});

describe('category catalogue', () => {
  it('lists every category present in the data, in display order', () => {
    const categories = placeCategories();
    const ids = categories.map((c) => c.id);
    expect(ids).toContain('academic');
    expect(ids).toContain('hostel');
    expect(ids).toContain('sports');
    const counts = categories.reduce((total, c) => total + c.count, 0);
    expect(counts).toBe(CAMPUS_PLACES.length);
    for (const category of categories) {
      expect(category.label).toBeTruthy();
      expect(category.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(PLACE_CATEGORY_META[category.id]).toBeTruthy();
    }
  });

  it('has a metadata entry for every category used by the data', () => {
    for (const place of CAMPUS_PLACES) {
      expect(PLACE_CATEGORY_META[place.category], `missing meta for ${place.category}`).toBeTruthy();
    }
  });
});

describe('lookups', () => {
  it('finds places by id and name', () => {
    const first = placesWithGeometry[0];
    expect(findPlaceById(first.id)?.name).toBe(first.name);
    expect(findPlaceByName(first.name)?.id).toBe(first.id);
    expect(findPlaceById('does-not-exist')).toBeNull();
    expect(findPlaceByName('does-not-exist')).toBeNull();
  });

  it('reports the nearest curated place to a coordinate', () => {
    const library = findPlaceById('central-library');
    const { place, distanceM } = nearestPlace(library.centroid[0], library.centroid[1]);
    expect(place.id).toBe('central-library');
    expect(distanceM).toBeLessThan(1);
  });

  it('honours the distance ceiling', () => {
    const library = findPlaceById('central-library');
    const near = nearestPlace(library.centroid[0] + 0.02, library.centroid[1] + 0.02, 100);
    expect(near.place).toBeNull();
    expect(near.distanceM).toBeGreaterThan(100);
  });
});

describe('search', () => {
  it('returns everything for an empty query', () => {
    expect(searchPlaces('', 'all')).toHaveLength(50);
  });

  it('matches names, aliases and details, case-insensitively', () => {
    expect(searchPlaces('library').map((p) => p.id)).toContain('central-library');
    expect(searchPlaces('LIBRARY').length).toBeGreaterThan(0);
    expect(searchPlaces('cse').length).toBeGreaterThan(0);
  });

  it('filters by category', () => {
    const hostels = searchPlaces('', 'hostel');
    expect(hostels.length).toBeGreaterThan(0);
    for (const hostel of hostels) expect(hostel.category).toBe('hostel');
  });

  it('returns an empty list when nothing matches', () => {
    expect(searchPlaces('zzzzz-no-such-place')).toHaveLength(0);
  });
});

describe('layout & layer metadata', () => {
  it('counts every layer', () => {
    const counts = layerCounts();
    expect(counts.places).toBe(50);
    expect(counts.roads).toBe(CAMPUS_LAYOUT.roads.length);
    expect(counts.gates).toBe(CAMPUS_LAYOUT.gates.length);
    expect(counts.trees).toBe(CAMPUS_LAYOUT.trees.length);
  });

  it('exposes a bounds box that contains every layer', () => {
    const [[south, west], [north, east]] = campusBounds();
    for (const place of placesWithGeometry) {
      expect(place.centroid[0]).toBeGreaterThanOrEqual(south);
      expect(place.centroid[0]).toBeLessThanOrEqual(north);
      expect(place.centroid[1]).toBeGreaterThanOrEqual(west);
      expect(place.centroid[1]).toBeLessThanOrEqual(east);
    }
  });

  it('uses a progressive zoom table', () => {
    expect(LAYER_ZOOM.boundary).toBeLessThan(LAYER_ZOOM.greens);
    expect(LAYER_ZOOM.greens).toBeLessThan(LAYER_ZOOM.buildings);
    expect(LAYER_ZOOM.buildings).toBeLessThanOrEqual(LAYER_ZOOM.buildingNames);
  });

  it('colours a place from its category when it has no explicit colour', () => {
    expect(placeColor({ category: 'sports' })).toBe(PLACE_CATEGORY_META.sports.color);
    expect(placeColor({ category: 'sports', color: '#123456' })).toBe('#123456');
  });
});
