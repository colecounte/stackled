import { describe, it, expect } from 'vitest';
import { ImpactScorer } from './impact-scorer.js';
import { BreakingChange } from '../types/index.js';

describe('ImpactScorer', () => {
  const scorer = new ImpactScorer();

  describe('calculateScore', () => {
    it('should calculate high score for critical breaking change', () => {
      const breakingChange: BreakingChange = {
        packageName: 'react',
        fromVersion: '17.0.0',
        toVersion: '18.0.0',
        severity: 'high',
        description: 'Major version with breaking changes',
        type: 'major-version',
        affectedAPIs: ['render', 'hydrate', 'unmountComponentAtNode']
      };

      const result = scorer.calculateScore(breakingChange, 5);

      expect(result.score).toBeGreaterThan(70);
      expect(result.level).toBe('critical');
      expect(result.packageName).toBe('react');
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should calculate low score for minor breaking change', () => {
      const breakingChange: BreakingChange = {
        packageName: 'lodash',
        fromVersion: '4.17.20',
        toVersion: '4.17.21',
        severity: 'low',
        description: 'Deprecated function warning',
        type: 'deprecation',
        affectedAPIs: []
      };

      const result = scorer.calculateScore(breakingChange, 0);

      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('low');
    });

    it('should factor in usage count', () => {
      const breakingChange: BreakingChange = {
        packageName: 'axios',
        fromVersion: '0.27.0',
        toVersion: '1.0.0',
        severity: 'medium',
        description: 'API changes',
        type: 'api-removal',
        affectedAPIs: ['cancelToken']
      };

      const lowUsage = scorer.calculateScore(breakingChange, 1);
      const highUsage = scorer.calculateScore(breakingChange, 10);

      expect(highUsage.score).toBeGreaterThan(lowUsage.score);
    });

    it('should factor in number of affected APIs', () => {
      const fewAPIs: BreakingChange = {
        packageName: 'express',
        fromVersion: '4.0.0',
        toVersion: '5.0.0',
        severity: 'medium',
        description: 'Changes',
        type: 'major-version',
        affectedAPIs: ['app.del']
      };

      const manyAPIs: BreakingChange = {
        ...fewAPIs,
        affectedAPIs: ['app.del', 'req.param', 'res.send', 'res.json', 'app.use']
      };

      const fewScore = scorer.calculateScore(fewAPIs, 0);
      const manyScore = scorer.calculateScore(manyAPIs, 0);

      expect(manyScore.score).toBeGreaterThan(fewScore.score);
    });

    it('should provide appropriate recommendations', () => {
      const critical: BreakingChange = {
        packageName: 'vue',
        fromVersion: '2.0.0',
        toVersion: '3.0.0',
        severity: 'high',
        description: 'Complete rewrite',
        type: 'major-version',
        affectedAPIs: ['createApp', 'mount', 'component']
      };

      const result = scorer.calculateScore(critical, 5);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should return score within valid range (0-100)', () => {
      const extremeChange: BreakingChange = {
        packageName: 'angular',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        severity: 'high',
        description: 'Complete framework rewrite',
        type: 'major-version',
        affectedAPIs: Array.from({ length: 50 }, (_, i) => `api${i}`)
      };

      const result = scorer.calculateScore(extremeChange, 100);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
