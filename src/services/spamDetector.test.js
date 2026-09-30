/**
 * Unit tests — Spam, Scam & Fake Post Detection Engine
 * Covers: evaluateSpamRisk, MODERATION_REASONS
 *
 * Corresponds to QA suite SPA-01…07 in docs/_qa-checklist.md.
 *
 * Weighting inside evaluateSpamRisk:
 *   title ×1.2 · description ×1.0 · reporter/poster name ×0.8
 *   poster contact ×1.5 · reward ×1.2 · off-campus GPS +25
 *   suspicious lost&found contact channel +40
 * Risk levels: clean · low (>0) · medium (≥20) · high (≥35) · critical (≥60)
 * isSuspect is true from a total score of 20.
 */
import { describe, it, expect } from 'vitest';
import { evaluateSpamRisk, MODERATION_REASONS } from './spamDetector';

const ON_CAMPUS = { lat: 22.4589, lng: 88.1695 }; // BBIT campus centre

describe('evaluateSpamRisk — legitimate content stays clean (SPA-05, false positives)', () => {
  it.each([
    {
      title: 'Pothole near main gate',
      description: 'Deep pothole causing water logging after rain',
      location: ON_CAMPUS,
    },
    {
      title: 'Broken streetlight outside boys hostel',
      description: 'The lamp post has been dark for a week, path is unsafe at night',
      location: ON_CAMPUS,
    },
    {
      title: 'Found water bottle in library reading hall',
      description: 'Blue bottle kept at the issue desk, describe it to claim',
      location: ON_CAMPUS,
    },
    {
      title: 'Lost my ID card somewhere near canteen',
      description: 'Blue lanyard with student ID, name on the card. Reward: samosa',
      location: ON_CAMPUS,
    },
    {
      title: 'WiFi keeps disconnecting in room 204',
      description: 'Signal drops every few minutes during online classes',
      location: ON_CAMPUS,
    },
  ])('clean: "$title"', (item) => {
    const result = evaluateSpamRisk(item, 'civic');
    expect(result.isSuspect).toBe(false);
    expect(result.level).toBe('clean');
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it('returns a clean result for a null item', () => {
    expect(evaluateSpamRisk(null)).toEqual({
      isSuspect: false,
      score: 0,
      level: 'clean',
      reasons: [],
      matchedKeywords: [],
    });
  });
});

describe('evaluateSpamRisk — scam / phishing detection (SPA-01, SPA-02)', () => {
  it('flags a telegram contact attempt in the title as high risk', () => {
    const result = evaluateSpamRisk({ title: 'Found iPhone, contact me on telegram' });
    expect(result.isSuspect).toBe(true);
    expect(result.level).toBe('high'); // 35 × 1.2 = 42
    expect(result.score).toBe(42);
    expect(result.reasons).toContain('Suspect scam, phishing, or financial/crypto keyword');
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('flags crypto investment bait (weighted title ×1.2 + description)', () => {
    const result = evaluateSpamRisk({
      title: 'Invest in bitcoin now',
      description: 'Double your money, guaranteed returns, join our crypto group',
    });
    // title: invest+bitcoin = 70×1.2 = 84 alone → already critical
    expect(result.isSuspect).toBe(true);
    expect(result.level).toBe('critical');
    expect(result.score).toBe(100); // capped
  });

  it('flags URL-shortener prize scams (SPA-03)', () => {
    const result = evaluateSpamRisk({
      title: 'Claim your reward',
      description: 'Click here: bit.ly/free-gift-card winner list',
    });
    expect(result.isSuspect).toBe(true);
    expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(2);
  });
});

describe('evaluateSpamRisk — fake / junk / troll detection (SPA-04)', () => {
  it('flags lorem ipsum placeholder text', () => {
    const result = evaluateSpamRisk({ title: 'Lorem ipsum dolor sit amet consectetur' });
    expect(result.isSuspect).toBe(true);
    expect(result.level).toBe('high'); // 30 × 1.2 = 36
    expect(result.reasons).toContain('Suspect fake, test, or gibberish text');
  });

  it('flags keyboard-mash submissions', () => {
    const result = evaluateSpamRisk({ title: 'Hazard', description: 'asdfghjkl qwertyuiop everywhere' });
    expect(result.isSuspect).toBe(true);
    expect(result.reasons).toContain('Suspect fake, test, or gibberish text');
  });
});

describe('evaluateSpamRisk — heuristic signals and weightings', () => {
  it('detects excessive uppercase shouting (below suspect threshold on its own)', () => {
    const result = evaluateSpamRisk({ title: 'HUGE DANGEROUS POTHOLES EVERYWHERE ON ROAD' });
    expect(result.reasons).toContain('High proportion of excessive uppercase letters');
    expect(result.score).toBe(18); // 15 × 1.2
    expect(result.level).toBe('low');
    expect(result.isSuspect).toBe(false); // 18 < 20 — not suspicious by itself
  });

  it('detects abnormal character repetition', () => {
    const result = evaluateSpamRisk({ title: 'Pothole', description: 'Water flowing like aaaaaaaa everywhere' });
    expect(result.reasons).toContain('Abnormal character repetition');
    expect(result.score).toBe(15);
    expect(result.isSuspect).toBe(false);
  });

  it('penalises extremely short titles', () => {
    const result = evaluateSpamRisk({ title: 'Hi' });
    expect(result.reasons).toContain('Extremely short content');
    expect(result.score).toBe(12); // 10 × 1.2
  });

  it('weighs the reporter name lighter (×0.8) than the title', () => {
    const result = evaluateSpamRisk({ title: 'Pothole', reporterName: 'Bitcoin Trader' });
    expect(result.score).toBe(28); // 35 × 0.8
    expect(result.level).toBe('medium');
    expect(result.isSuspect).toBe(true);
  });

  it('adds +25 for GPS coordinates outside the BBIT campus bounds (SPA-07 reason)', () => {
    const result = evaluateSpamRisk({
      title: 'Pothole',
      description: 'Big pothole',
      location: { lat: 22.5726, lng: 88.3639 }, // central Kolkata, off campus
    });
    expect(result.score).toBe(25);
    expect(result.level).toBe('medium');
    expect(result.isSuspect).toBe(true);
    expect(result.reasons).toContain('GPS Coordinates located outside official BBIT campus bounds');
  });

  it('weighs contact fields heaviest (×1.5) and adds +40 for suspicious lost&found channels (SPA-06)', () => {
    const result = evaluateSpamRisk(
      { title: 'Found wallet', posterContact: 't.me/quickcash' },
      'lostfound'
    );
    // contact: t.me 35 × 1.5 = 52.5, plus the lost&found channel penalty +40 = 92.5
    expect(result.score).toBe(93);
    expect(result.level).toBe('critical');
    expect(result.isSuspect).toBe(true);
    expect(result.reasons).toContain('Suspicious or external contact channel');
    expect(result.reasons).toContain('Suspect scam, phishing, or financial/crypto keyword');
  });

  it('does not apply the lost&found contact penalty to civic reports', () => {
    const civic = evaluateSpamRisk({ title: 'Pothole', posterContact: 't.me/quickcash' }, 'civic');
    expect(civic.score).toBe(53); // 35 × 1.5 only
    expect(civic.reasons).not.toContain('Suspicious or external contact channel');
  });

  it('deduplicates reasons across fields', () => {
    const result = evaluateSpamRisk({
      title: 'Crypto giveaway on telegram',
      description: 'Join our crypto telegram channel',
    });
    const scamReasons = result.reasons.filter((r) => r.includes('scam'));
    expect(scamReasons).toHaveLength(1);
  });
});

describe('MODERATION_REASONS', () => {
  it('exposes the five admin moderation reason codes with unique ids', () => {
    expect(MODERATION_REASONS).toHaveLength(5);
    expect(MODERATION_REASONS.map((r) => r.id)).toEqual([
      'spam', 'fake', 'scam', 'duplicate', 'inappropriate',
    ]);
  });

  it('gives every reason a label, emoji and description for the admin UI', () => {
    for (const reason of MODERATION_REASONS) {
      expect(reason.label).toBeTruthy();
      expect(reason.emoji).toBeTruthy();
      expect(reason.description).toBeTruthy();
    }
  });
});
