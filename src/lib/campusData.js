/**
 * Campus data access layer
 * ---------------------------------------------------------------------------
 * Single source of truth for the map surfaces. All geometry lives in
 * `src/data/campusLayout.json` (boundary, roads, greens, water, gates) and
 * `src/data/bbitPlaces.json` (the 50 curated campus places with real
 * footprints), both traced over Esri World Imagery.
 */
import layout from '../data/campusLayout.json';
import places from '../data/bbitPlaces.json';
import { boundsOf, polygonAreaM2, polygonCentroid } from './geo';

export const CAMPUS_LAYOUT = layout;
export const CAMPUS_PLACES = places;

/** Per-category presentation metadata, keyed by the `category` field. */
export const PLACE_CATEGORY_META = {
  landmark: { label: 'Gates, Plazas & Landmarks', color: '#FF3B30', icon: '🚪', order: 1 },
  admin: { label: 'Administration', color: '#AF52DE', icon: '🏛️', order: 2 },
  academic: { label: 'Academic Blocks & Labs', color: '#0071E3', icon: '🏫', order: 3 },
  library: { label: 'Library', color: '#5856D6', icon: '📚', order: 4 },
  building: { label: 'Auditoria & Large Halls', color: '#FF9500', icon: '🎭', order: 5 },
  hostel: { label: 'Hostels', color: '#34C759', icon: '🛏️', order: 6 },
  mess: { label: 'Dining & Mess', color: '#FF9F0A', icon: '🍛', order: 7 },
  canteen: { label: 'Canteens', color: '#FF9F0A', icon: '🍽️', order: 8 },
  food: { label: 'Food Court', color: '#FF9F0A', icon: '🍔', order: 9 },
  tea: { label: 'Tea & Snacks', color: '#FFB340', icon: '☕', order: 10 },
  sports: { label: 'Sports & Grounds', color: '#30B0C7', icon: '🏏', order: 11 },
  gym: { label: 'Fitness', color: '#30B0C7', icon: '🏋️', order: 12 },
  green: { label: 'Lawns & Gardens', color: '#2DA44E', icon: '🌳', order: 13 },
  health: { label: 'Health & Wellness', color: '#FF2D55', icon: '⛑️', order: 14 },
  atm: { label: 'ATM & Services', color: '#8E8E93', icon: '🏧', order: 15 },
};

export const placeColor = (place) =>
  place.color || PLACE_CATEGORY_META[place.category]?.color || '#0071E3';

/** Zoom at which each class of feature starts being drawn. */
export const LAYER_ZOOM = {
  boundary: 13,
  greens: 15,
  trees: 17.5,
  roads: 14.5,
  roadNames: 16.5,
  buildings: 16,
  buildingNames: 17,
  minorNames: 18,
  gates: 16,
};

export const ROAD_STYLE = {
  arterial: { weightSat: 5.5, weightPlan: 6, colorSat: '#FFD166', colorPlan: '#F4B740', casing: '#1F2937', dash: null },
  internal: { weightSat: 3.6, weightPlan: 4, colorSat: '#F8FAFC', colorPlan: '#FFFFFF', casing: '#334155', dash: null },
  service: { weightSat: 2.2, weightPlan: 2.4, colorSat: '#E2E8F0', colorPlan: '#E5E7EB', casing: '#475569', dash: null },
  footpath: { weightSat: 1.6, weightPlan: 1.8, colorSat: '#FDE68A', colorPlan: '#D1D5DB', casing: null, dash: '4 4' },
};

export const layerCounts = () => ({
  places: CAMPUS_PLACES.length,
  roads: CAMPUS_LAYOUT.roads.length,
  greens: CAMPUS_LAYOUT.greens.length,
  water: CAMPUS_LAYOUT.water.length,
  gates: CAMPUS_LAYOUT.gates.length,
  parking: (CAMPUS_LAYOUT.parking || []).length,
  structures: (CAMPUS_LAYOUT.structures || []).length,
  trees: (CAMPUS_LAYOUT.trees || []).length,
});

export const campusBounds = () =>
  boundsOf([
    CAMPUS_LAYOUT.boundary,
    (CAMPUS_LAYOUT.structures || []).map((s) => s.polygon),
    CAMPUS_PLACES.map((p) => p.polygon),
  ]);

/** All distinct categories actually present in the data, in display order. */
export const placeCategories = () => {
  const present = new Set(CAMPUS_PLACES.map((p) => p.category));
  return Object.entries(PLACE_CATEGORY_META)
    .filter(([id]) => present.has(id))
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id, meta]) => ({ id, ...meta, count: CAMPUS_PLACES.filter((p) => p.category === id).length }));
};

/** Places enriched with derived geometry (centroid, footprint area, bounds). */
export const placesWithGeometry = CAMPUS_PLACES.map((place) => {
  const ring = place.polygon?.length >= 3 ? place.polygon : null;
  const centroid = ring ? polygonCentroid(ring) : [place.lat, place.lng];
  return {
    ...place,
    color: placeColor(place),
    centroid,
    areaM2: ring ? Math.abs(polygonAreaM2(ring)) : 0,
    labelPoint: place.labelPoint || centroid,
    bounds: ring ? boundsOf([ring]) : null,
  };
});

export const findPlaceById = (id) => placesWithGeometry.find((p) => p.id === id) || null;

export const findPlaceByName = (name) =>
  placesWithGeometry.find((p) => p.name.toLowerCase() === String(name || '').toLowerCase()) || null;

/** Nearest curated place to a coordinate, with the distance in metres. */
export const nearestPlace = (lat, lng, maxMeters = Infinity) => {
  let best = null;
  let bestD = Infinity;
  for (const place of placesWithGeometry) {
    const d = Math.hypot((place.centroid[0] - lat) * 111132.92, (place.centroid[1] - lng) * 102500);
    if (d < bestD) {
      bestD = d;
      best = place;
    }
  }
  return bestD <= maxMeters ? { place: best, distanceM: bestD } : { place: null, distanceM: bestD };
};

export const searchPlaces = (term, categoryId = 'all') => {
  const q = String(term || '').trim().toLowerCase();
  return placesWithGeometry.filter((place) => {
    const matchesCategory =
      categoryId === 'all' ||
      place.category === categoryId ||
      (place.aliases || []).some((alias) => alias.toLowerCase() === categoryId);
    if (!matchesCategory) return false;
    if (!q) return true;
    return (
      place.name.toLowerCase().includes(q) ||
      (place.categoryLabel || '').toLowerCase().includes(q) ||
      (place.details || '').toLowerCase().includes(q) ||
      (place.aliases || []).some((alias) => alias.toLowerCase().includes(q))
    );
  });
};
