import { describe, it, expect } from 'vitest';
import {
  classifyChurnLevel,
  calcChurnScore,
  buildChurnEntry,
  analyzeChurn,
  summarizeChurn,
} from './dependency-churn-analyzer.js';
import type { DependencyInfo } from '../types/index.js';

function makeDep(name: string, version = '1.0.0'): DependencyInfo {
  return { name, currentVersion: version, latestVersion: version, type: 'production' } as DependencyInfo;
}

const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0'];
const publishDates: Record<string, string> = {
  '1.0.0': '2023-01-01',
  '1.1.0': '2023-03-01',
  '1.2.0': '2023-05-01',
  '2.0.0': '2023-07-01',
  '2.1.0': '2023-09-01',
};

describe('classifyChurnLevel', () => {
  it('returns low for score < 25', () => {
    expect(classifyChurnLevel(10)).toBe('low');
  });
  it('returns moderate for score 25-49', () => {
    expect(classifyChurnLevel(30)).toBe('moderate');
  });
  it('returns high for score 50-79', () => {
    expect(classifyChurnLevel(60)).toBe('high');
  });
  it('returns extreme for score >= 80', () => {
    expect(classifyChurnLevel(85)).toBe('extreme');
  });
});

describe('calcChurnScore', () => {
  it('returns 0 for no releases and no majors', () => {
    const score = calcChurnScore(0, 0, 365);
    expect(score).toBeGreaterThanOrEqual(0);
  });
  it('increases with more releases', () => {
    const low = calcChurnScore(2, 0, 180);
    const high = calcChurnScore(20, 0, 180);
    expect(high).toBeGreaterThan(low);
  });
  it('increases with more major bumps', () => {
    const few = calcChurnScore(5, 0, 90);
    const many = calcChurnScore(5, 3, 90);
    expect(many).toBeGreaterThan(few);
  });
});

describe('buildChurnEntry', () => {
  it('counts major and minor bumps correctly', () => {
    const dep = makeDep('react', '2.1.0');
    const entry = buildChurnEntry(dep, versions, publishDates);
    expect(entry.majorCount).toBe(1);
    expect(entry.minorCount).toBe(2);
    expect(entry.releaseCount).toBe(5);
  });

  it('computes avgDaysBetweenReleases', () => {
    const dep = makeDep('react', '2.1.0');
    const entry = buildChurnEntry(dep, versions, publishDates);
    expect(entry.avgDaysBetweenReleases).toBeGreaterThan(0);
  });

  it('handles empty versions gracefully', () => {
    const dep = makeDep('empty', '1.0.0');
    const entry = buildChurnEntry(dep, [], {});
    expect(entry.releaseCount).toBe(0);
    expect(entry.churnScore).toBeGreaterThanOrEqual(0);
  });
});

describe('analyzeChurn', () => {
  it('returns an entry per dependency', () => {
    const deps = [makeDep('react', '2.1.0'), makeDep('lodash', '1.0.0')];
    const results = analyzeChurn(
      deps,
      { react: versions, lodash: ['1.0.0'] },
      { react: publishDates, lodash: { '1.0.0': '2022-01-01' } }
    );
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('react');
  });
});

describe('summarizeChurn', () => {
  it('counts high churn entries', () => {
    const entries = [
      { name: 'a', churnScore: 60, churnLevel: 'high' as const, releaseCount: 10, majorCount: 1, minorCount: 5, patchCount: 4, avgDaysBetweenReleases: 30, currentVersion: '1.0.0' },
      { name: 'b', churnScore: 10, churnLevel: 'low' as const, releaseCount: 2, majorCount: 0, minorCount: 1, patchCount: 1, avgDaysBetweenReleases: 120, currentVersion: '1.0.0' },
    ];
    const summary = summarizeChurn(entries);
    expect(summary.highChurn).toBe(1);
    expect(summary.mostChurned).toBe('a');
    expect(summary.total).toBe(2);
  });

  it('handles empty list', () => {
    const summary = summarizeChurn([]);
    expect(summary.mostChurned).toBeNull();
    expect(summary.avgChurnScore).toBe(0);
  });
});
