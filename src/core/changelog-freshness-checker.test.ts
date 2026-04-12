import {
  classifyFreshness,
  calcFreshnessScore,
  buildFreshnessEntry,
  checkChangelogFreshness,
  FreshnessEntry,
} from './changelog-freshness-checker';
import { PackageInfo } from '../types';

function makePkg(name: string, version: string): PackageInfo {
  return { name, version, dependencies: {} } as PackageInfo;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

describe('classifyFreshness', () => {
  it('returns fresh for recent changelog-updated release', () => {
    expect(classifyFreshness(3, true)).toBe('fresh');
  });

  it('returns stale for 7-day-old release without changelog', () => {
    expect(classifyFreshness(7, false)).toBe('stale');
  });

  it('returns stale for 20-day-old release', () => {
    expect(classifyFreshness(20, true)).toBe('stale');
  });

  it('returns outdated for 60-day-old release', () => {
    expect(classifyFreshness(60, false)).toBe('outdated');
  });

  it('returns unknown for negative days', () => {
    expect(classifyFreshness(-1, false)).toBe('unknown');
  });
});

describe('calcFreshnessScore', () => {
  it('returns 0 for unknown (negative days)', () => {
    expect(calcFreshnessScore(-1, false)).toBe(0);
  });

  it('gives higher score for recent release with changelog', () => {
    const withChangelog = calcFreshnessScore(2, true);
    const withoutChangelog = calcFreshnessScore(2, false);
    expect(withChangelog).toBeGreaterThan(withoutChangelog);
  });

  it('caps score at 100', () => {
    expect(calcFreshnessScore(0, true)).toBe(100);
  });

  it('decreases with age', () => {
    const recent = calcFreshnessScore(5, false);
    const old = calcFreshnessScore(60, false);
    expect(recent).toBeGreaterThan(old);
  });
});

describe('buildFreshnessEntry', () => {
  it('builds entry with correct status for fresh package', () => {
    const pkg = makePkg('react', '18.0.0');
    const entry = buildFreshnessEntry(pkg, '18.0.0', daysAgo(3), true);
    expect(entry.status).toBe('fresh');
    expect(entry.name).toBe('react');
    expect(entry.changelogUpdated).toBe(true);
  });

  it('handles missing release date', () => {
    const pkg = makePkg('lodash', '4.17.21');
    const entry = buildFreshnessEntry(pkg, '4.17.21', undefined, false);
    expect(entry.status).toBe('unknown');
    expect(entry.daysSinceRelease).toBe(-1);
  });
});

describe('checkChangelogFreshness', () => {
  const entries: FreshnessEntry[] = [
    { name: 'a', currentVersion: '1.0.0', latestVersion: '1.0.0', daysSinceRelease: 3, changelogUpdated: true, freshnessScore: 100, status: 'fresh' },
    { name: 'b', currentVersion: '1.0.0', latestVersion: '1.1.0', daysSinceRelease: 20, changelogUpdated: false, freshnessScore: 50, status: 'stale' },
    { name: 'c', currentVersion: '1.0.0', latestVersion: '2.0.0', daysSinceRelease: 90, changelogUpdated: false, freshnessScore: 10, status: 'outdated' },
  ];

  it('counts statuses correctly', () => {
    const summary = checkChangelogFreshness(entries);
    expect(summary.fresh).toBe(1);
    expect(summary.stale).toBe(1);
    expect(summary.outdated).toBe(1);
    expect(summary.total).toBe(3);
  });

  it('calculates average score', () => {
    const summary = checkChangelogFreshness(entries);
    expect(summary.averageScore).toBe(Math.round((100 + 50 + 10) / 3));
  });

  it('returns zero averageScore for empty list', () => {
    expect(checkChangelogFreshness([]).averageScore).toBe(0);
  });
});
