/**
 * Local persistence for PinPoint BBIT.
 *
 * The app always starts EMPTY. Nothing is ever auto-seeded: reports,
 * hazards and lost & found items only appear when a student registers them.
 * Storage keys are versioned; every older generation is purged on load so
 * stale demo data from previous versions can never resurface.
 */

const CIVIC_STORAGE_KEY = 'pinpoint_issues_v4';
const LOST_FOUND_STORAGE_KEY = 'pinpoint_lostfound_v4';
const USER_UPVOTES_KEY = 'pinpoint_user_upvotes_v4';

// One-time purge of every legacy storage generation.
// NOTE: session keys ('pinpoint_user', 'civicbloom_user') are deliberately NOT
// listed here — wiping them on load would sign the user out (and erase the
// offline demo profile) on every single page refresh. Session lifecycle is
// owned by services/firebase.js + services/demoSession.js.
try {
  ['pinpoint_issues_v1', 'pinpoint_lostfound_v1', 'pinpoint_user_upvotes_v1',
   'pinpoint_issues_v2', 'pinpoint_lostfound_v2', 'pinpoint_user_upvotes_v2',
   'pinpoint_issues_v3', 'pinpoint_lostfound_v3', 'pinpoint_user_upvotes_v3',
   'civicbloom_issues_v1', 'civicbloom_lostfound_v1'].forEach(k => localStorage.removeItem(k));
} catch (_) { /* no-op */ }

export function getStoredCivicIssues() {
  try {
    const raw = localStorage.getItem(CIVIC_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading civic issues from localStorage:', e);
    return [];
  }
}

export function saveCivicIssues(issues) {
  try {
    localStorage.setItem(CIVIC_STORAGE_KEY, JSON.stringify(issues));
  } catch (e) {
    console.error('Error saving civic issues:', e);
  }
}

export function getStoredLostFound() {
  try {
    const raw = localStorage.getItem(LOST_FOUND_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading lost & found from localStorage:', e);
    return [];
  }
}

export function saveLostFound(items) {
  try {
    localStorage.setItem(LOST_FOUND_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving lost & found:', e);
  }
}

export function resetAllToDefault() {
  localStorage.setItem(CIVIC_STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(LOST_FOUND_STORAGE_KEY, JSON.stringify([]));
  localStorage.removeItem(USER_UPVOTES_KEY);
  return {
    civicIssues: [],
    lostFound: [],
  };
}
