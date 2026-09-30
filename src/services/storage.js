import { INITIAL_CIVIC_ISSUES, INITIAL_LOST_FOUND } from '../data/mockData';

const CIVIC_STORAGE_KEY = 'pinpoint_issues_v2';
const LOST_FOUND_STORAGE_KEY = 'pinpoint_lostfound_v2';
const USER_UPVOTES_KEY = 'pinpoint_user_upvotes_v2';

// One-time purge of legacy storage (pre-BBIT data)
try {
  ['pinpoint_issues_v1', 'pinpoint_lostfound_v1', 'pinpoint_user_upvotes_v1',
   'civicbloom_issues_v1', 'civicbloom_lostfound_v1'].forEach(k => localStorage.removeItem(k));
} catch (_) { /* no-op */ }

export function getStoredCivicIssues() {
  try {
    const raw = localStorage.getItem(CIVIC_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CIVIC_STORAGE_KEY, JSON.stringify(INITIAL_CIVIC_ISSUES));
      return INITIAL_CIVIC_ISSUES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading civic issues from localStorage:', e);
    return INITIAL_CIVIC_ISSUES;
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
    if (!raw) {
      localStorage.setItem(LOST_FOUND_STORAGE_KEY, JSON.stringify(INITIAL_LOST_FOUND));
      return INITIAL_LOST_FOUND;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading lost & found from localStorage:', e);
    return INITIAL_LOST_FOUND;
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

