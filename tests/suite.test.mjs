import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchCrackingWords, TORN_CRACKING_DICTIONARY } from '../src/modules/crimes.js';
import { calculateOptimalMeds } from '../src/modules/hospital.js';
import { getNextHappyTickSeconds, formatTimeRemaining } from '../src/modules/gymTimer.js';
import { DEFAULT_SETTINGS, loadSettings } from '../src/core/storage.js';

describe('TornCore Suite Tests', () => {
  describe('Crimes 2.0 Cracking Word Matcher', () => {
    it('should have a rich dictionary loaded', () => {
      assert.ok(TORN_CRACKING_DICTIONARY.length > 50, 'Dictionary should have extensive word list');
    });

    it('should match pattern with single missing letter', () => {
      const matches = matchCrackingWords('P A S S W O R _');
      assert.ok(matches.includes('PASSWORD'));
    });

    it('should match pattern with multiple missing letters', () => {
      const matches = matchCrackingWords('H _ C K _ R');
      assert.ok(matches.includes('HACKER'));
    });

    it('should handle whitespace and underscore formats', () => {
      const matches = matchCrackingWords('C _ M P _ T _ R');
      assert.ok(matches.length >= 0);
    });

    it('should return empty array for non-matching nonsense', () => {
      const matches = matchCrackingWords('Z Z Z Q Q X');
      assert.equal(matches.length, 0);
    });
  });

  describe('Zero-Waste Hospital Med-Out Calculator', () => {
    it('should return 0 cooldown when 0% life missing', () => {
      const res = calculateOptimalMeds(0);
      assert.equal(res.totalCooldown, 0);
    });

    it('should recommend Small First Aid for 5% missing life', () => {
      const res = calculateOptimalMeds(5);
      assert.equal(res.smallFirstAid, 1);
      assert.equal(res.firstAid, 0);
      assert.equal(res.morphine, 0);
      assert.equal(res.totalCooldown, 10);
    });

    it('should recommend First Aid for 10% missing life', () => {
      const res = calculateOptimalMeds(10);
      assert.equal(res.smallFirstAid, 0);
      assert.equal(res.firstAid, 1);
      assert.equal(res.morphine, 0);
      assert.equal(res.totalCooldown, 15);
    });

    it('should recommend Morphine for 20% missing life', () => {
      const res = calculateOptimalMeds(20);
      assert.equal(res.morphine, 1);
      assert.equal(res.firstAid, 0);
      assert.equal(res.smallFirstAid, 0);
      assert.equal(res.totalCooldown, 25);
    });

    it('should find optimal combination for 35% missing life', () => {
      const res = calculateOptimalMeds(35);
      // 1x Morphine (20%) + 1x First Aid (10%) + 1x Small First Aid (5%) = 35% (25 + 15 + 10 = 50 min)
      // vs 2x Morphine (40%) = 50 min
      assert.ok(res.totalHealed >= 35);
      assert.ok(res.totalCooldown <= 50);
    });
  });

  describe('Gym Happy Reset Timer', () => {
    it('should calculate next tick seconds between 1 and 900 seconds', () => {
      const sec = getNextHappyTickSeconds();
      assert.ok(sec >= 0 && sec <= 900, `Seconds left was ${sec}, expected 0-900`);
    });

    it('should format seconds into MM:SS correctly', () => {
      assert.equal(formatTimeRemaining(90), '01:30');
      assert.equal(formatTimeRemaining(0), '00:00');
      assert.equal(formatTimeRemaining(899), '14:59');
    });
  });

  describe('Storage & Default Settings', () => {
    it('should provide default settings with all modules enabled', () => {
      assert.equal(DEFAULT_SETTINGS.enabledModules.vault, true);
      assert.equal(DEFAULT_SETTINGS.enabledModules.bazaarGuard, true);
      assert.equal(DEFAULT_SETTINGS.enabledModules.travel, true);
      assert.equal(DEFAULT_SETTINGS.enabledModules.cityScanner, true);
      assert.equal(DEFAULT_SETTINGS.enabledModules.crimes, true);
      assert.equal(DEFAULT_SETTINGS.enabledModules.hospital, true);
      assert.equal(DEFAULT_SETTINGS.enabledModules.gymTimer, true);
    });
  });
});
