import {
  classifyHealthStatus,
  calcHealthScore,
  buildHealthFlags,
  buildHealthEntry,
  summarizeChangelogHealth,
  ChangelogHealthEntry,
} from './dependency-changelog-health';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version } as PackageInfo;
}

describe('classifyHealthStatus', () => {
  it('returns missing when no changelog', () => {
    expect(classifyHealthStatus(false, null, 0)).toBe('missing');
  });

  it('returns sparse when entry count < 3', () => {
    expect(classifyHealthStatus(true, 10, 2)).toBe('sparse');
  });

  it('returns stale when last entry > 365 days ago', () => {
    expect(classifyHealthStatus(true, 400, 10)).toBe('stale');
  });

  it('returns healthy otherwise', () => {
    expect(classifyHealthStatus(true, 30, 15)).toBe('healthy');
  });
});

describe('calcHealthScore', () => {
  it('returns 0 for missing changelog', () => {
    expect(calcHealthScore(false, null, 0)).toBe(0);
  });

  it('returns high score for recent, many entries', () => {
    const score = calcHealthScore(true, 30, 15);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('penalizes old last entry', () => {
    const fresh = calcHealthScore(true, 30, 10);
    const stale = calcHealthScore(true, 400, 10);
    expect(fresh).toBeGreaterThan(stale);
  });

  it('caps at 100', () => {
    expect(calcHealthScore(true, 10, 100)).toBeLessThanOrEqual(100);
  });
});

describe('buildHealthFlags', () => {
  it('flags no-changelog', () => {
    expect(buildHealthFlags(false, null, 0)).toContain('no-changelog');
  });

  it('flags sparse-entries', () => {
    expect(buildHealthFlags(true, 10, 1)).toContain('sparse-entries');
  });

  it('flags stale-changelog', () => {
    expect(buildHealthFlags(true, 400, 10)).toContain('stale-changelog');
  });

  it('returns empty for healthy package', () => {
    expect(buildHealthFlags(true, 30, 10)).toHaveLength(0);
  });
});

describe('buildHealthEntry', () => {
  it('builds a complete entry', () => {
    const entry = buildHealthEntry(makePkg('react', '18.0.0'), 20, 12);
    expect(entry.name).toBe('react');
    expect(entry.status).toBe('healthy');
    expect(entry.hasChangelog).toBe(true);
    expect(entry.score).toBeGreaterThan(0);
  });

  it('marks missing when entryCount is 0', () => {
    const entry = buildHealthEntry(makePkg('ghost'), null, 0);
    expect(entry.hasChangelog).toBe(false);
    expect(entry.status).toBe('missing');
  });
});

describe('summarizeChangelogHealth', () => {
  const entries: ChangelogHealthEntry[] = [
    { name: 'a', version: '1.0.0', status: 'healthy', hasChangelog: true, lastEntryDaysAgo: 10, entryCount: 10, score: 100, flags: [] },
    { name: 'b', version: '1.0.0', status: 'missing', hasChangelog: false, lastEntryDaysAgo: null, entryCount: 0, score: 0, flags: ['no-changelog'] },
    { name: 'c', version: '1.0.0', status: 'stale', hasChangelog: true, lastEntryDaysAgo: 400, entryCount: 5, score: 55, flags: ['stale-changelog'] },
  ];

  it('counts statuses correctly', () => {
    const summary = summarizeChangelogHealth(entries);
    expect(summary.healthy).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.stale).toBe(1);
    expect(summary.total).toBe(3);
  });

  it('calculates average score', () => {
    const summary = summarizeChangelogHealth(entries);
    expect(summary.averageScore).toBe(Math.round((100 + 0 + 55) / 3));
  });

  it('handles empty list', () => {
    const summary = summarizeChangelogHealth([]);
    expect(summary.total).toBe(0);
    expect(summary.averageScore).toBe(0);
  });
});
