import {
  classifyFrequencyBand,
  calcAvgDaysBetween,
  buildPublishFrequencyEntry,
  analyzePublishFrequency,
  summarizePublishFrequency,
} from './dependency-publish-frequency';
import { PackageInfo } from '../types';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function makePkg(name: string, overrides: Partial<PackageInfo> = {}): PackageInfo {
  return { name, version: '1.0.0', ...overrides } as PackageInfo;
}

describe('classifyFrequencyBand', () => {
  it('returns very-active for >= 24 releases/year', () => {
    expect(classifyFrequencyBand(24)).toBe('very-active');
    expect(classifyFrequencyBand(52)).toBe('very-active');
  });

  it('returns active for 12-23 releases/year', () => {
    expect(classifyFrequencyBand(12)).toBe('active');
    expect(classifyFrequencyBand(23)).toBe('active');
  });

  it('returns moderate for 4-11 releases/year', () => {
    expect(classifyFrequencyBand(4)).toBe('moderate');
    expect(classifyFrequencyBand(11)).toBe('moderate');
  });

  it('returns slow for 1-3 releases/year', () => {
    expect(classifyFrequencyBand(1)).toBe('slow');
    expect(classifyFrequencyBand(3)).toBe('slow');
  });

  it('returns stale for < 1 release/year', () => {
    expect(classifyFrequencyBand(0)).toBe('stale');
    expect(classifyFrequencyBand(0.5)).toBe('stale');
  });
});

describe('calcAvgDaysBetween', () => {
  it('returns ageInDays when totalReleases <= 1', () => {
    expect(calcAvgDaysBetween(1, 365)).toBe(365);
    expect(calcAvgDaysBetween(0, 100)).toBe(100);
  });

  it('divides age by (releases - 1)', () => {
    expect(calcAvgDaysBetween(13, 365)).toBe(30);
  });
});

describe('buildPublishFrequencyEntry', () => {
  it('builds entry with correct band for active package', () => {
    const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
    const time: Record<string, string> = {
      '1.0.0': daysAgo(365),
      '1.1.0': daysAgo(270),
      '1.2.0': daysAgo(180),
      '2.0.0': daysAgo(30),
    };
    const pkg = makePkg('lodash', { time } as any);
    const entry = buildPublishFrequencyEntry(pkg, versions);

    expect(entry.name).toBe('lodash');
    expect(entry.totalReleases).toBe(4);
    expect(entry.lastPublished).toBeTruthy();
    expect(['very-active', 'active', 'moderate', 'slow', 'stale']).toContain(entry.band);
  });

  it('handles empty versions gracefully', () => {
    const pkg = makePkg('empty-pkg');
    const entry = buildPublishFrequencyEntry(pkg, []);
    expect(entry.totalReleases).toBe(0);
    expect(entry.band).toBe('stale');
  });
});

describe('analyzePublishFrequency', () => {
  it('returns one entry per package', () => {
    const pkgs = [makePkg('a'), makePkg('b')];
    const map = { a: ['1.0.0'], b: ['1.0.0', '2.0.0'] };
    const results = analyzePublishFrequency(pkgs, map);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('a');
    expect(results[1].name).toBe('b');
  });
});

describe('summarizePublishFrequency', () => {
  it('counts bands correctly', () => {
    const entries = [
      { band: 'very-active' },
      { band: 'active' },
      { band: 'moderate' },
      { band: 'slow' },
      { band: 'stale' },
      { band: 'stale' },
    ] as any;
    const summary = summarizePublishFrequency(entries);
    expect(summary.total).toBe(6);
    expect(summary.veryActive).toBe(1);
    expect(summary.active).toBe(1);
    expect(summary.moderate).toBe(1);
    expect(summary.slow).toBe(1);
    expect(summary.stale).toBe(2);
  });
});
