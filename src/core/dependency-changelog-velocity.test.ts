import {
  classifyVelocityBand,
  calcAvgDaysBetween,
  detectTrend,
  buildVelocityEntry,
  analyzeChangelogVelocity,
  summarizeVelocity,
} from './dependency-changelog-velocity';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version } as PackageInfo;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

describe('classifyVelocityBand', () => {
  it('returns rapid for <= 7 days', () => {
    expect(classifyVelocityBand(5)).toBe('rapid');
  });
  it('returns active for <= 30 days', () => {
    expect(classifyVelocityBand(20)).toBe('active');
  });
  it('returns moderate for <= 90 days', () => {
    expect(classifyVelocityBand(60)).toBe('moderate');
  });
  it('returns slow for <= 180 days', () => {
    expect(classifyVelocityBand(120)).toBe('slow');
  });
  it('returns stagnant for > 180 days', () => {
    expect(classifyVelocityBand(999)).toBe('stagnant');
  });
});

describe('calcAvgDaysBetween', () => {
  it('returns Infinity for fewer than 2 dates', () => {
    expect(calcAvgDaysBetween([new Date()])).toBe(Infinity);
    expect(calcAvgDaysBetween([])).toBe(Infinity);
  });

  it('calculates average gap correctly', () => {
    const dates = [daysAgo(30), daysAgo(20), daysAgo(10)];
    expect(calcAvgDaysBetween(dates)).toBeCloseTo(10, 0);
  });
});

describe('detectTrend', () => {
  it('returns accelerating when recent pace is much higher', () => {
    expect(detectTrend(20, 30)).toBe('accelerating');
  });
  it('returns decelerating when recent pace is much lower', () => {
    expect(detectTrend(1, 40)).toBe('decelerating');
  });
  it('returns stable when pace is roughly proportional', () => {
    expect(detectTrend(5, 20)).toBe('stable');
  });
});

describe('buildVelocityEntry', () => {
  it('builds an entry with correct band and trend', () => {
    const releaseDates = [
      daysAgo(5), daysAgo(12), daysAgo(19), daysAgo(26),
      daysAgo(60), daysAgo(120), daysAgo(200),
    ];
    const entry = buildVelocityEntry(makePkg('react', '18.0.0'), releaseDates);
    expect(entry.name).toBe('react');
    expect(entry.currentVersion).toBe('18.0.0');
    expect(entry.releasesLast90Days).toBeGreaterThan(0);
    expect(['rapid', 'active', 'moderate', 'slow', 'stagnant']).toContain(
      entry.velocityBand
    );
    expect(['accelerating', 'stable', 'decelerating']).toContain(entry.trend);
  });

  it('adds stagnant flag when no releases', () => {
    const entry = buildVelocityEntry(makePkg('old-pkg'), [daysAgo(400)]);
    expect(entry.flags).toContain('no recent releases detected');
    expect(entry.velocityBand).toBe('stagnant');
  });

  it('sets avgDaysBetweenReleases to -1 when only one release date', () => {
    const entry = buildVelocityEntry(makePkg('single'), [daysAgo(10)]);
    expect(entry.avgDaysBetweenReleases).toBe(-1);
  });
});

describe('analyzeChangelogVelocity', () => {
  it('returns one entry per package', () => {
    const input = [
      { pkg: makePkg('a'), releaseDates: [daysAgo(10), daysAgo(20)] },
      { pkg: makePkg('b'), releaseDates: [daysAgo(5), daysAgo(15)] },
    ];
    const result = analyzeChangelogVelocity(input);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('a');
    expect(result[1].name).toBe('b');
  });
});

describe('summarizeVelocity', () => {
  it('counts entries by band', () => {
    const entries = [
      { velocityBand: 'rapid' },
      { velocityBand: 'active' },
      { velocityBand: 'stagnant' },
      { velocityBand: 'stagnant' },
    ] as any;
    const summary = summarizeVelocity(entries);
    expect(summary.total).toBe(4);
    expect(summary.rapid).toBe(1);
    expect(summary.active).toBe(1);
    expect(summary.stagnant).toBe(2);
    expect(summary.moderate).toBe(0);
  });
});
