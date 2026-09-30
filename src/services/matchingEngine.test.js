/**
 * Unit tests — Proximity & Smart Matching Engine
 * Covers: calculateDistanceInMeters, findNearbyCivicDuplicates,
 *         calculateLostFoundSimilarity, findMatchesForPost
 *
 * Corresponds to QA suites DUP-01…08 and MAT-01…08 in docs/_qa-checklist.md.
 *
 * Reference points: coordinates around the BBIT campus (maths-only fixture).
 * 1 deg latitude ≈ 111,194.93 m, so:
 *   10 m ≈ 0.0000899322° · 30 m ≈ 0.000269796° · 40 m ≈ 0.000359729°
 *  100 m ≈ 0.000899322° · 300 m ≈ 0.00269796° · 600 m ≈ 0.00539593°
 */
import { describe, it, expect } from 'vitest';
import {
  calculateDistanceInMeters,
  findNearbyCivicDuplicates,
  calculateLostFoundSimilarity,
  findMatchesForPost,
} from './matchingEngine';

const CENTER = { lat: 22.4589, lng: 88.1695 };
const M_PER_DEG_LAT = 111194.9266;
const atMetresNorth = (metres) => CENTER.lat + metres / M_PER_DEG_LAT;

const makeIssue = (overrides = {}) => ({
  id: 'issue-1',
  status: 'reported',
  category: 'pothole',
  location: { lat: CENTER.lat, lng: CENTER.lng },
  ...overrides,
});

describe('calculateDistanceInMeters (Haversine)', () => {
  it('returns 0 for identical coordinates', () => {
    expect(calculateDistanceInMeters(22.4589, 88.1695, 22.4589, 88.1695)).toBe(0);
  });

  it('returns ~111,195 m for 1 degree of latitude at the equator', () => {
    expect(calculateDistanceInMeters(0, 0, 1, 0)).toBe(111195);
  });

  it('measures the BBIT campus diagonal (SW → NE corner) as ~755 m', () => {
    expect(calculateDistanceInMeters(22.4570, 88.1658, 22.4618, 88.1710)).toBe(755);
  });

  it('is symmetric: distance(A,B) === distance(B,A)', () => {
    const ab = calculateDistanceInMeters(22.4589, 88.1695, 22.4592, 88.1701);
    const ba = calculateDistanceInMeters(22.4592, 88.1701, 22.4589, 88.1695);
    expect(ab).toBe(ba);
  });

  it('returns Infinity when any coordinate is undefined (DUP robustness)', () => {
    expect(calculateDistanceInMeters(undefined, 88.1695, 22.4589, 88.1695)).toBe(Infinity);
    expect(calculateDistanceInMeters(22.4589, undefined, 22.4589, 88.1695)).toBe(Infinity);
    expect(calculateDistanceInMeters(22.4589, 88.1695, undefined, 88.1695)).toBe(Infinity);
    expect(calculateDistanceInMeters(22.4589, 88.1695, 22.4589, undefined)).toBe(Infinity);
  });
});

describe('findNearbyCivicDuplicates (proximity duplicate detection)', () => {
  it('flags a report at the exact same spot with 95% confidence (DUP-01)', () => {
    const matches = findNearbyCivicDuplicates(
      CENTER.lat, CENTER.lng, 'pothole', [makeIssue()]
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].issue.id).toBe('issue-1');
    expect(matches[0].distanceMeters).toBe(0);
    expect(matches[0].isSameCategory).toBe(true);
    expect(matches[0].confidence).toBe(95);
  });

  it('lowers confidence to 75% for a different category at the same spot (DUP-02)', () => {
    const matches = findNearbyCivicDuplicates(
      CENTER.lat, CENTER.lng, 'streetlight', [makeIssue({ category: 'pothole' })]
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].isSameCategory).toBe(false);
    expect(matches[0].confidence).toBe(75);
  });

  it('uses a 35 m default threshold: 30 m matches, 40 m does not (DUP-03/04)', () => {
    const near = findNearbyCivicDuplicates(
      atMetresNorth(30), CENTER.lng, 'pothole', [makeIssue()]
    );
    expect(near).toHaveLength(1);
    expect(near[0].distanceMeters).toBe(30);

    const far = findNearbyCivicDuplicates(
      atMetresNorth(40), CENTER.lng, 'pothole', [makeIssue()]
    );
    expect(far).toHaveLength(0);
  });

  it('respects a custom threshold (the app passes 40 m from CivicReportModal)', () => {
    const matches = findNearbyCivicDuplicates(
      atMetresNorth(40), CENTER.lng, 'pothole', [makeIssue()], 40
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].distanceMeters).toBe(40);
  });

  it('ignores resolved issues (DUP-05)', () => {
    const matches = findNearbyCivicDuplicates(
      CENTER.lat, CENTER.lng, 'pothole', [makeIssue({ status: 'resolved' })]
    );
    expect(matches).toHaveLength(0);
  });

  it('ignores issues with missing or non-numeric locations', () => {
    const matches = findNearbyCivicDuplicates(
      CENTER.lat, CENTER.lng, 'pothole', [makeIssue({ location: null }), makeIssue({ location: {} })]
    );
    expect(matches).toHaveLength(0);
  });

  it('sorts multiple duplicates by closest first (DUP-08)', () => {
    const matches = findNearbyCivicDuplicates(
      atMetresNorth(20), CENTER.lng, 'pothole',
      [
        makeIssue({ id: 'far', location: { lat: atMetresNorth(-10), lng: CENTER.lng } }),   // ~30 m away
        makeIssue({ id: 'near', location: { lat: atMetresNorth(10), lng: CENTER.lng } }),   // ~10 m away
      ],
      50
    );
    expect(matches.map((m) => m.issue.id)).toEqual(['near', 'far']);
    expect(matches[0].distanceMeters).toBeLessThan(matches[1].distanceMeters);
  });

  it('returns an empty list for missing coordinates or a non-array input', () => {
    expect(findNearbyCivicDuplicates(0, CENTER.lng, 'pothole', [makeIssue()])).toHaveLength(0);
    expect(findNearbyCivicDuplicates(CENTER.lat, 0, 'pothole', [makeIssue()])).toHaveLength(0);
    expect(findNearbyCivicDuplicates(CENTER.lat, CENTER.lng, 'pothole', null)).toHaveLength(0);
    expect(findNearbyCivicDuplicates(CENTER.lat, CENTER.lng, 'pothole', 'not-an-array')).toHaveLength(0);
  });
});

describe('calculateLostFoundSimilarity (smart cross-match scoring)', () => {
  const lostBottle = {
    id: 'lost-1',
    type: 'lost',
    title: 'Blue Milton Bottle',
    description: 'Blue sipper water bottle left behind after labs',
    color: 'Blue',
    brand: 'Milton',
    category: 'bottles_mugs',
    location: { lat: CENTER.lat, lng: CENTER.lng },
    timestamp: '2026-09-28T10:00:00.000Z',
  };
  const foundBottle = {
    id: 'found-1',
    type: 'found',
    title: 'Blue Milton Bottle',
    description: 'Blue sipper water bottle left behind after labs',
    color: 'Blue',
    brand: 'Milton',
    category: 'bottles_mugs',
    location: { lat: CENTER.lat, lng: CENTER.lng },
    timestamp: '2026-09-28T14:00:00.000Z',
  };

  it('scores an identical lost/found pair at the 98% cap with reasons (MAT-01)', () => {
    const result = calculateLostFoundSimilarity(lostBottle, foundBottle);
    expect(result.score).toBe(98); // 45 title + 25 category + 25 keywords + 15 location + 10 time = 120, capped
    expect(result.isHighConfidence).toBe(true);
    expect(result.reasons).toContain('Identical title: "Blue Milton Bottle"');
    expect(result.reasons).toContain('Identical item category');
    expect(result.reasons).toContain('Reported within 24 hours');
  });

  it('never matches two items of the same type (MAT-03)', () => {
    const result = calculateLostFoundSimilarity(
      { ...lostBottle, id: 'lost-2' }, lostBottle
    );
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it('awards partial-title + category + keyword points for "iPhone 15" vs "iPhone 15 Pro" (MAT-02)', () => {
    const result = calculateLostFoundSimilarity(
      { id: 'l', type: 'lost', title: 'iPhone 15', category: 'electronics' },
      { id: 'f', type: 'found', title: 'iPhone 15 Pro', category: 'electronics' }
    );
    // 35 partial title + 25 category + 25 keywords (jaccard 2/3 → min(25, 27))
    expect(result.score).toBe(85);
    expect(result.reasons.some((r) => r.startsWith('Strong title match'))).toBe(true);
    expect(result.reasons).toContain('Identical item category');
  });

  it('scores genuinely unrelated items at 0 (MAT-04)', () => {
    const result = calculateLostFoundSimilarity(
      {
        id: 'l', type: 'lost', title: 'Chemistry Notes', category: 'stationery',
        location: { lat: CENTER.lat, lng: CENTER.lng },
        timestamp: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'f', type: 'found', title: 'Silver Keys', category: 'keys_cards',
        location: { lat: atMetresNorth(600), lng: CENTER.lng }, // > 500 m: no location points
        timestamp: '2026-09-28T10:00:00.000Z',                    // 27 days: no time points
      }
    );
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
    expect(result.isHighConfidence).toBe(false);
  });

  it('scores location proximity in tiers: ≤50 m +15, ≤200 m +10, ≤500 m +5', () => {
    const base = (loc, id) => ({
      id, type: id.startsWith('l') ? 'lost' : 'found',
      title: id.startsWith('l') ? 'Chemistry Notes' : 'Silver Keys',
      category: id.startsWith('l') ? 'stationery' : 'keys_cards',
      location: loc,
    });

    const tier1 = calculateLostFoundSimilarity(
      base({ lat: CENTER.lat, lng: CENTER.lng }, 'l1'),
      base({ lat: atMetresNorth(30), lng: CENTER.lng }, 'f1')
    );
    expect(tier1.score).toBe(15);
    expect(tier1.reasons).toContain('Within 30m of reported spot');

    const tier2 = calculateLostFoundSimilarity(
      base({ lat: CENTER.lat, lng: CENTER.lng }, 'l2'),
      base({ lat: atMetresNorth(100), lng: CENTER.lng }, 'f2')
    );
    expect(tier2.score).toBe(10);
    expect(tier2.reasons).toContain('Within 100m walking area');

    const tier3 = calculateLostFoundSimilarity(
      base({ lat: CENTER.lat, lng: CENTER.lng }, 'l3'),
      base({ lat: atMetresNorth(300), lng: CENTER.lng }, 'f3')
    );
    expect(tier3.score).toBe(5);
    expect(tier3.reasons).toContain('Same campus zone (300m)');
  });

  it('falls back to location-name matching (+12) when GPS is absent', () => {
    const result = calculateLostFoundSimilarity(
      { id: 'l', type: 'lost', title: 'Chemistry Notes', category: 'stationery', locationName: 'Main Library' },
      { id: 'f', type: 'found', title: 'Silver Keys', category: 'keys_cards', locationName: 'main library' }
    );
    expect(result.score).toBe(12);
    expect(result.reasons).toContain('Matching location area');
  });

  it('scores time proximity in tiers: ≤24 h +10, ≤72 h +5, older +0', () => {
    const at = (id, iso, type) => ({
      id, type,
      title: type === 'lost' ? 'Chemistry Notes' : 'Silver Keys',
      category: type === 'lost' ? 'stationery' : 'keys_cards',
      timestamp: iso,
    });

    const within24h = calculateLostFoundSimilarity(
      at('l', '2026-09-28T10:00:00.000Z', 'lost'),
      at('f', '2026-09-28T20:00:00.000Z', 'found') // 10 h later
    );
    expect(within24h.score).toBe(10);
    expect(within24h.reasons).toContain('Reported within 24 hours');

    const within72h = calculateLostFoundSimilarity(
      at('l', '2026-09-28T10:00:00.000Z', 'lost'),
      at('f', '2026-09-30T10:00:00.000Z', 'found') // 48 h later
    );
    expect(within72h.score).toBe(5);
    expect(within72h.reasons).toContain('Reported within 3 days');

    const old = calculateLostFoundSimilarity(
      at('l', '2026-09-01T10:00:00.000Z', 'lost'),
      at('f', '2026-09-28T10:00:00.000Z', 'found') // 27 days later
    );
    expect(old.score).toBe(0);
  });

  it('is not inflated by stop-word-only overlap (MAT-07)', () => {
    const result = calculateLostFoundSimilarity(
      { id: 'l', type: 'lost', title: 'Notes the item', description: 'lost near the canteen' },
      { id: 'f', type: 'found', title: 'Keys for the item', description: 'found from the canteen' }
    );
    // Only meaningful overlap ("canteen") — stop words (the, item, lost, found, near, from) are filtered
    expect(result.score).toBeLessThan(25);
  });
});

describe('findMatchesForPost (match suggestions for a post)', () => {
  const target = {
    id: 'lost-1',
    type: 'lost',
    title: 'Blue Milton Bottle',
    description: 'Blue sipper water bottle',
    category: 'bottles_mugs',
    location: { lat: CENTER.lat, lng: CENTER.lng },
    timestamp: '2026-09-28T10:00:00.000Z',
  };

  const strongFoundMatch = {
    id: 'found-1',
    type: 'found',
    title: 'Blue Milton Bottle',
    description: 'Blue sipper water bottle',
    category: 'bottles_mugs',
    location: { lat: CENTER.lat, lng: CENTER.lng },
    timestamp: '2026-09-28T14:00:00.000Z',
  };

  it('returns only cross-type, non-reunited candidates above the confidence floor, best first (MAT-06)', () => {
    const allPosts = [
      { id: 'weak', type: 'found', title: 'Silver Keys', category: 'keys_cards' },      // score 0 → below floor
      { ...strongFoundMatch, id: 'reunited-1', status: 'reunited' },                     // excluded: reunited
      { ...target, id: 'lost-2' },                                                        // excluded: same type
      target,                                                                             // excluded: same id
      strongFoundMatch,                                                                   // ✅ the real match
    ];

    const matches = findMatchesForPost(target, allPosts);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchedItem.id).toBe('found-1');
    expect(matches[0].score).toBe(98);
    expect(matches[0].isHighConfidence).toBe(true);
  });

  it('sorts multiple qualifying matches by score, descending', () => {
    const allPosts = [
      { id: 'mid', type: 'found', title: 'Milton Bottle', category: 'bottles_mugs' },
      strongFoundMatch,
    ];
    const matches = findMatchesForPost(target, allPosts);
    expect(matches).toHaveLength(2);
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
    expect(matches[0].matchedItem.id).toBe('found-1');
  });

  it('honours a custom minimum confidence', () => {
    const weak = { id: 'weak', type: 'found', title: 'Silver Keys', category: 'keys_cards' };
    expect(findMatchesForPost(target, [weak])).toHaveLength(0);          // default floor 45
    expect(findMatchesForPost(target, [weak], 0)).toHaveLength(1);       // floor 0 admits it
  });

  it('returns an empty list for a missing post or non-array input', () => {
    expect(findMatchesForPost(null, [])).toEqual([]);
    expect(findMatchesForPost(target, null)).toEqual([]);
    expect(findMatchesForPost(target, 'nope')).toEqual([]);
  });
});
