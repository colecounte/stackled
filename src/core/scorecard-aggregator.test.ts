import {
  gradeFromOverall,
  buildFlags,
  calcOverallScore,
  buildScorecardEntry,
  aggregateScorecard,
} from './scorecard-aggregator';
import { DependencyInfo } from '../types';

const makeDep = (name: string, version = '1.0.0'): DependencyInfo =>
  ({ name, version, type: 'production' } as DependencyInfo);

describe('gradeFromOverall', () => {
  it('returns A for score >= 90', () => expect(gradeFromOverall(95)).toBe('A'));
  it('returns B for score 75-89', () => expect(gradeFromOverall(80)).toBe('B'));
  it('returns C for score 60-74', () => expect(gradeFromOverall(65)).toBe('C'));
  it('returns D for score 40-59', () => expect(gradeFromOverall(50)).toBe('D'));
  it('returns F for score < 40', () => expect(gradeFromOverall(30)).toBe('F'));
});

describe('buildFlags', () => {
  const base = (overrides = {}) => ({
    name: 'pkg', version: '1.0.0', healthScore: 80, securityScore: 80,
    freshnessScore: 80, maintenanceScore: 80, ...overrides,
  });

  it('returns empty array when all scores healthy', () => {
    expect(buildFlags(base())).toEqual([]);
  });

  it('flags security-risk when securityScore < 50', () => {
    expect(buildFlags(base({ securityScore: 30 }))).toContain('security-risk');
  });

  it('flags outdated when freshnessScore < 40', () => {
    expect(buildFlags(base({ freshnessScore: 20 }))).toContain('outdated');
  });

  it('flags unmaintained when maintenanceScore < 40', () => {
    expect(buildFlags(base({ maintenanceScore: 10 }))).toContain('unmaintained');
  });

  it('flags unhealthy when healthScore < 50', () => {
    expect(buildFlags(base({ healthScore: 40 }))).toContain('unhealthy');
  });
});

describe('calcOverallScore', () => {
  it('computes weighted average correctly', () => {
    expect(calcOverallScore(100, 100, 100, 100)).toBe(100);
    expect(calcOverallScore(0, 0, 0, 0)).toBe(0);
  });

  it('weights security highest', () => {
    const withHighSecurity = calcOverallScore(0, 100, 0, 0);
    const withHighHealth = calcOverallScore(100, 0, 0, 0);
    expect(withHighSecurity).toBeGreaterThan(withHighHealth);
  });
});

describe('buildScorecardEntry', () => {
  it('builds a complete entry', () => {
    const entry = buildScorecardEntry(makeDep('react'), 90, 85, 70, 80);
    expect(entry.name).toBe('react');
    expect(entry.grade).toBe('B');
    expect(entry.overallScore).toBeGreaterThan(0);
    expect(Array.isArray(entry.flags)).toBe(true);
  });
});

describe('aggregateScorecard', () => {
  it('returns zero averages for empty input', () => {
    const summary = aggregateScorecard([]);
    expect(summary.averageOverall).toBe(0);
  });

  it('counts critical, warning, and healthy correctly', () => {
    const entries = [
      buildScorecardEntry(makeDep('a'), 20, 20, 20, 20),
      buildScorecardEntry(makeDep('b'), 60, 60, 60, 60),
      buildScorecardEntry(makeDep('c'), 90, 90, 90, 90),
    ];
    const summary = aggregateScorecard(entries);
    expect(summary.criticalCount).toBe(1);
    expect(summary.healthyCount).toBe(1);
    expect(summary.warningCount).toBe(1);
  });
});
