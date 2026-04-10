import {
  classifyReleaseFrequency,
  calcAverageDaysBetweenReleases,
  determineTrend,
  analyzeTrend,
  TrendPoint,
} from './trend-analyzer';
import { DependencyInfo } from '../types';

const mockDep: DependencyInfo = {
  name: 'react',
  currentVersion: '18.0.0',
  latestVersion: '18.2.0',
  type: 'dependency',
};

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

describe('classifyReleaseFrequency', () => {
  it('returns high for 10+ releases', () => {
    expect(classifyReleaseFrequency(12)).toBe('high');
  });
  it('returns medium for 4-9 releases', () => {
    expect(classifyReleaseFrequency(5)).toBe('medium');
  });
  it('returns low for 1-3 releases', () => {
    expect(classifyReleaseFrequency(2)).toBe('low');
  });
  it('returns stale for 0 releases', () => {
    expect(classifyReleaseFrequency(0)).toBe('stale');
  });
});

describe('calcAverageDaysBetweenReleases', () => {
  it('returns 0 for fewer than 2 points', () => {
    expect(calcAverageDaysBetweenReleases([])).toBe(0);
    expect(calcAverageDaysBetweenReleases([{ date: daysAgo(10), version: '1.0.0' }])).toBe(0);
  });

  it('calculates average correctly', () => {
    const points: TrendPoint[] = [
      { date: daysAgo(30), version: '1.0.0' },
      { date: daysAgo(20), version: '1.1.0' },
      { date: daysAgo(10), version: '1.2.0' },
    ];
    expect(calcAverageDaysBetweenReleases(points)).toBe(10);
  });
});

describe('determineTrend', () => {
  it('returns abandoned when both are 0', () => {
    expect(determineTrend(0, 0)).toBe('abandoned');
  });
  it('returns accelerating when recent is much higher', () => {
    expect(determineTrend(10, 3)).toBe('accelerating');
  });
  it('returns slowing when recent is much lower', () => {
    expect(determineTrend(2, 10)).toBe('slowing');
  });
  it('returns steady for similar counts', () => {
    expect(determineTrend(5, 5)).toBe('steady');
  });
});

describe('analyzeTrend', () => {
  it('builds a full trend summary', () => {
    const history: TrendPoint[] = [
      { date: daysAgo(5), version: '18.2.0' },
      { date: daysAgo(30), version: '18.1.0' },
      { date: daysAgo(60), version: '18.0.1' },
      { date: daysAgo(120), version: '18.0.0' },
    ];
    const result = analyzeTrend(mockDep, history);
    expect(result.packageName).toBe('react');
    expect(result.releasesLast90Days).toBe(3);
    expect(result.daysSinceLastRelease).toBe(5);
    expect(result.releaseFrequency).toBe('medium');
  });

  it('handles empty history gracefully', () => {
    const result = analyzeTrend(mockDep, []);
    expect(result.releasesLast90Days).toBe(0);
    expect(result.releaseFrequency).toBe('stale');
    expect(result.trend).toBe('abandoned');
  });
});
