/**
 * Spam, Scam, and Fake Post Heuristic Detection Engine
 * Scans Civic Hazards and Lost & Found reports for malicious patterns,
 * phishing contacts, external promotional spam, and fabricated submissions.
 */

import { isInsideCampus } from '../types';

// Suspicious spam / scam / phishing keywords & regular expressions
const SCAM_PHISHING_PATTERNS = [
  /\btelegram\b/i,
  /\bt\.me\b/i,
  /\bwa\.me\b/i,
  /\bwhatsapp\s*(?:me|\+|group|link)?\b/i,
  /\bcrypto\b/i,
  /\bbitcoin\b/i,
  /\bethereum\b/i,
  /\binvest(?:ment)?\b/i,
  /\bfree\s+(?:money|cash|gift|iphone|laptop|card|crypto)\b/i,
  /\bclaim\s+(?:reward|cash|prize)\b/i,
  /\bpay\s*(?:first|advance|fee|shipping|deposit)\b/i,
  /\bgift\s*card\b/i,
  /\blottery\b/i,
  /\bcasino\b/i,
  /\bcasino[0-9]*\b/i,
  /\bearn\s+(?:\$|usd|inr|rs|₹|money|online|daily)\b/i,
  /\bwork\s+from\s+home\b/i,
  /\bpassive\s+income\b/i,
  /\bclick\s+(?:here|link)\b/i,
  /\b(?:bit\.ly|tinyurl\.com|goo\.gl|t\.co|rb\.gy|cutt\.ly)\b/i,
  /\b(?:escort|viagra|cialis|adult|dating)\b/i,
  /\bfree\s*followers\b/i,
  /\bhack(?:er|ing)?\b/i,
  /\bcall\s+(?:now|\+?1-?800|\+?0900)\b/i,
  /\bgoogle\.com\/forms\b/i,
];

// Patterns indicative of fake/troll/test/garbage submissions
const FAKE_JUNK_PATTERNS = [
  /\blorem\s+ipsum\b/i,
  /\basdfghjk/i,
  /\bqwertyuiop/i,
  /\btest\s*(?:123|post|testing|hazard|item|delete\s*me)\b/i,
  /\b(?:alien|ufo|meteor|nuclear|nuke|illuminati|dinosaur)\b/i,
  /\bha\s*ha\s*ha\b/i,
  /\bblah\s+blah\b/i,
  /\bfoo\s+bar\b/i,
];

/**
 * Analyzes a text string for spam & scam triggers.
 */
function analyzeText(text) {
  if (!text || typeof text !== 'string') return { score: 0, reasons: [], matched: [] };

  let score = 0;
  const reasons = [];
  const matched = [];

  // Check scam/phishing patterns
  for (const pattern of SCAM_PHISHING_PATTERNS) {
    if (pattern.test(text)) {
      score += 35;
      const matchName = pattern.source.replace(/\\b|\\s\*|\\i/g, '');
      matched.push(matchName);
      if (!reasons.includes('Suspect scam, phishing, or financial/crypto keyword')) {
        reasons.push('Suspect scam, phishing, or financial/crypto keyword');
      }
    }
  }

  // Check fake/troll patterns
  for (const pattern of FAKE_JUNK_PATTERNS) {
    if (pattern.test(text)) {
      score += 30;
      const matchName = pattern.source.replace(/\\b|\\s\*|\\i/g, '');
      matched.push(matchName);
      if (!reasons.includes('Suspect fake, test, or gibberish text')) {
        reasons.push('Suspect fake, test, or gibberish text');
      }
    }
  }

  // Excessive uppercase characters (SHOUTING / SPAM)
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 20) {
    const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
    if (uppercaseCount / letters.length > 0.7) {
      score += 15;
      reasons.push('High proportion of excessive uppercase letters');
    }
  }

  // Suspicious repeated characters (e.g. "aaaaaaa", "!!!!!!!")
  if (/(.)\1{6,}/.test(text)) {
    score += 15;
    reasons.push('Abnormal character repetition');
  }

  // Very short non-descriptive content
  if (text.trim().length > 0 && text.trim().length < 5) {
    score += 10;
    reasons.push('Extremely short content');
  }

  return { score, reasons, matched };
}

/**
 * Analyzes a Civic Issue or Lost & Found entry.
 * @param {Object} item - The entry object.
 * @param {string} itemType - 'civic' or 'lostfound'.
 * @returns {Object} { isSuspect, score, level: 'low'|'medium'|'high'|'critical', reasons, matchedKeywords }
 */
export function evaluateSpamRisk(item, itemType = 'civic') {
  if (!item) {
    return { isSuspect: false, score: 0, level: 'clean', reasons: [], matchedKeywords: [] };
  }

  let totalScore = 0;
  const reasonsList = [];
  const matchedKeywordsList = [];

  // Combine title, description, reporter/poster info, and comments
  const titleAnalysis = analyzeText(item.title);
  const descAnalysis = analyzeText(item.description);
  const reporterAnalysis = analyzeText(item.reporterName || item.posterName);
  const contactAnalysis = analyzeText(item.posterContact || '');
  const rewardAnalysis = analyzeText(item.reward || '');

  totalScore += titleAnalysis.score * 1.2;
  totalScore += descAnalysis.score;
  totalScore += reporterAnalysis.score * 0.8;
  totalScore += contactAnalysis.score * 1.5;
  totalScore += rewardAnalysis.score * 1.2;

  reasonsList.push(...titleAnalysis.reasons, ...descAnalysis.reasons, ...contactAnalysis.reasons, ...rewardAnalysis.reasons);
  matchedKeywordsList.push(...titleAnalysis.matched, ...descAnalysis.matched, ...contactAnalysis.matched, ...rewardAnalysis.matched);

  // Check coordinates location bounds for BBIT campus
  if (item.location && typeof item.location.lat === 'number' && typeof item.location.lng === 'number') {
    if (!isInsideCampus(item.location.lat, item.location.lng)) {
      totalScore += 25;
      reasonsList.push('GPS Coordinates located outside official BBIT campus bounds');
    }
  }

  // Check for suspicious suspicious contact information in lost & found
  if (itemType === 'lostfound' && item.posterContact) {
    if (/(?:telegram|t\.me|\+?1-?900|\+?0900|crypto)/i.test(item.posterContact)) {
      totalScore += 40;
      reasonsList.push('Suspicious or external contact channel');
    }
  }

  // Deduplicate reasons and matched keywords
  const uniqueReasons = Array.from(new Set(reasonsList));
  const uniqueMatched = Array.from(new Set(matchedKeywordsList));

  // Determine risk level
  let level = 'clean';
  if (totalScore >= 60) level = 'critical';
  else if (totalScore >= 35) level = 'high';
  else if (totalScore >= 20) level = 'medium';
  else if (totalScore > 0) level = 'low';

  const isSuspect = totalScore >= 20;

  return {
    isSuspect,
    score: Math.min(100, Math.round(totalScore)),
    level,
    reasons: uniqueReasons,
    matchedKeywords: uniqueMatched,
  };
}

export const MODERATION_REASONS = [
  {
    id: 'spam',
    label: 'Spam / Commercial Ads',
    emoji: '🚩',
    description: 'Promotions, external product links, bulk junk text, or advertising',
    color: 'amber'
  },
  {
    id: 'fake',
    label: 'Fake / Hoax Report',
    emoji: '🚫',
    description: 'Fabricated hazard, non-existent incident, or intentional troll report',
    color: 'rose'
  },
  {
    id: 'scam',
    label: 'Scam / Phishing / Fraud',
    emoji: '⚠️',
    description: 'Advance fee demand, extortion, fraudulent lost item claim, or malicious link',
    color: 'red'
  },
  {
    id: 'duplicate',
    label: 'Duplicate / Test / Junk',
    emoji: '🗑️',
    description: 'Accidental duplicate submission, test run, or meaningless garbage entry',
    color: 'stone'
  },
  {
    id: 'inappropriate',
    label: 'Inappropriate / Abusive Content',
    emoji: '❌',
    description: 'Harassment, hate speech, explicit language, or community guideline violation',
    color: 'purple'
  }
];
