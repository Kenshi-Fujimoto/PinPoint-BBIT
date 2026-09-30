/**
 * Proximity and Smart Matching Utilities
 */

// Calculate Haversine distance in meters between two coordinates [lat, lng]
export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }
  const R = 6371e3; // Earth's radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Civic Duplicate Detection
 * Checks if a proposed location is within `thresholdMeters` (default 30m) of an existing active issue.
 */
export function findNearbyCivicDuplicates(newLat, newLng, newCategory, existingIssues, thresholdMeters = 35) {
  if (!newLat || !newLng || !Array.isArray(existingIssues)) return [];

  const candidates = existingIssues.filter(issue => issue.status !== 'resolved');

  const matches = [];

  for (const issue of candidates) {
    if (issue.location && typeof issue.location.lat === 'number' && typeof issue.location.lng === 'number') {
      const distance = calculateDistanceInMeters(newLat, newLng, issue.location.lat, issue.location.lng);
      
      if (distance <= thresholdMeters) {
        const isSameCategory = issue.category === newCategory;
        // Higher relevance if same category
        matches.push({
          issue,
          distanceMeters: distance,
          isSameCategory,
          confidence: isSameCategory ? 95 : 75,
        });
      }
    }
  }

  // Sort by closest distance first
  return matches.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

const STOP_WORDS = new Set([
  'no', 'details', 'provided', 'the', 'and', 'with', 'for', 'item', 'lost', 
  'found', 'please', 'contact', 'near', 'from', 'this', 'that', 'have', 'been', 'a', 'an'
]);

function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Text tokenization and Jaccard similarity for keyword matching
 */
function tokenizeText(text) {
  if (!text) return new Set();
  const words = normalizeString(text)
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w) && (w.length > 1 || /\d/.test(w)));
  return new Set(words);
}

function calculateJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }
  const unionSize = setA.size + setB.size - intersectionCount;
  return unionSize === 0 ? 0 : intersectionCount / unionSize;
}

/**
 * Smart Lost & Found Cross-Match Engine
 * Calculates similarity between a 'lost' item and a 'found' item.
 */
export function calculateLostFoundSimilarity(itemA, itemB) {
  // If both are lost or both are found, skip
  if (itemA.type === itemB.type) return { score: 0, reasons: [] };

  const reasons = [];
  let score = 0;

  const normTitleA = normalizeString(itemA.title);
  const normTitleB = normalizeString(itemB.title);

  // 1. Direct or Partial Title Match (Up to 45 pts)
  if (normTitleA && normTitleB) {
    if (normTitleA === normTitleB) {
      score += 45;
      reasons.push(`Identical title: "${itemA.title}"`);
    } else if (normTitleA.includes(normTitleB) || normTitleB.includes(normTitleA)) {
      score += 35;
      reasons.push(`Strong title match: "${itemA.title}"`);
    }
  }

  // 2. Category Matching (25 pts)
  const isSameCategory = itemA.category && itemB.category && itemA.category === itemB.category;
  if (isSameCategory) {
    score += 25;
    reasons.push('Identical item category');
  }

  // 3. Keyword & Brand/Color Overlap (25 pts)
  const textA = `${itemA.title} ${itemA.description || ''} ${itemA.color || ''} ${itemA.brand || ''}`;
  const textB = `${itemB.title} ${itemB.description || ''} ${itemB.color || ''} ${itemB.brand || ''}`;
  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);
  const textSim = calculateJaccardSimilarity(tokensA, tokensB);

  if (textSim > 0.05) {
    const textScore = Math.min(25, Math.round(textSim * 40));
    score += textScore;
    
    // Find common keywords for explanation
    const commonKeywords = [...tokensA].filter(x => tokensB.has(x)).slice(0, 3);
    if (commonKeywords.length > 0 && !reasons.some(r => r.includes('title'))) {
      reasons.push(`Matching keywords: "${commonKeywords.join(', ')}"`);
    }
  }

  // 4. Location Proximity (15 pts)
  if (itemA.location?.lat && itemA.location?.lng && itemB.location?.lat && itemB.location?.lng) {
    const dist = calculateDistanceInMeters(
      itemA.location.lat,
      itemA.location.lng,
      itemB.location.lat,
      itemB.location.lng
    );

    if (dist <= 50) {
      score += 15;
      reasons.push(`Within ${dist}m of reported spot`);
    } else if (dist <= 200) {
      score += 10;
      reasons.push(`Within ${dist}m walking area`);
    } else if (dist <= 500) {
      score += 5;
      reasons.push(`Same campus zone (${dist}m)`);
    }
  } else if (itemA.locationName && itemB.locationName) {
    const locA = normalizeString(itemA.locationName);
    const locB = normalizeString(itemB.locationName);
    const locTokensA = tokenizeText(locA);
    const locTokensB = tokenizeText(locB);
    const locOverlap = [...locTokensA].filter(w => locTokensB.has(w));
    if (locA.includes(locB) || locB.includes(locA) || locOverlap.length > 0) {
      score += 12;
      reasons.push(`Matching location area`);
    }
  }

  // 5. Time Proximity (10 pts)
  if (itemA.timestamp && itemB.timestamp) {
    const dateA = new Date(itemA.timestamp).getTime();
    const dateB = new Date(itemB.timestamp).getTime();
    const diffHours = Math.abs(dateA - dateB) / (1000 * 60 * 60);

    if (diffHours <= 24) {
      score += 10;
      reasons.push('Reported within 24 hours');
    } else if (diffHours <= 72) {
      score += 5;
      reasons.push('Reported within 3 days');
    }
  }

  // Cap at 98%
  const finalScore = Math.min(98, Math.max(0, score));

  return {
    score: finalScore,
    reasons,
    isHighConfidence: finalScore >= 50,
  };
}

/**
 * Find top match candidates for a specific lost or found post
 */
export function findMatchesForPost(targetPost, allPosts, minConfidence = 45) {
  if (!targetPost || !Array.isArray(allPosts)) return [];

  const candidates = allPosts.filter(
    p => p.id !== targetPost.id && p.type !== targetPost.type && p.status !== 'reunited'
  );

  const matchedList = [];

  for (const item of candidates) {
    const matchResult = calculateLostFoundSimilarity(targetPost, item);
    if (matchResult.score >= minConfidence) {
      matchedList.push({
        matchedItem: item,
        score: matchResult.score,
        reasons: matchResult.reasons,
        isHighConfidence: matchResult.isHighConfidence,
      });
    }
  }

  return matchedList.sort((a, b) => b.score - a.score);
}
