import { analyzeSentiment, summarizeSentiment } from './dependency-sentiment-analyzer';
import { PackageInfo } from '../types';

function makePkg(overrides: Partial<PackageInfo> = {}): PackageInfo {
  return {
    name: 'integration-pkg',
    version: '2.0.0',
    weeklyDownloads: 120_000,
    openIssues: 15,
    deprecated: false,
    daysSinceLastPublish: 45,
    stars: 800,
    contributors: 4,
    ...overrides,
  } as PackageInfo;
}

describe('dependency-sentiment-analyzer integration', () => {
  it('produces consistent results for a realistic set of packages', () => {
    const packages: PackageInfo[] = [
      makePkg({ name: 'express', weeklyDownloads: 20_000_000, stars: 60_000, contributors: 50 }),
      makePkg({ name: 'left-pad', weeklyDownloads: 500, deprecated: true, daysSinceLastPublish: 2000 }),
      makePkg({ name: 'lodash', weeklyDownloads: 40_000_000, stars: 55_000, contributors: 30 }),
      makePkg({ name: 'unknown-lib', weeklyDownloads: 200, contributors: 1, openIssues: 300 }),
    ];

    const entries = analyzeSentiment(packages);
    expect(entries).toHaveLength(4);

    const express = entries.find(e => e.name === 'express')!;
    expect(express.level).toBe('positive');

    const leftPad = entries.find(e => e.name === 'left-pad')!;
    expect(leftPad.level).toBe('critical');
    expect(leftPad.signals).toContain('package is deprecated');

    const summary = summarizeSentiment(entries);
    expect(summary.total).toBe(4);
    expect(summary.critical).toBeGreaterThanOrEqual(1);
    expect(summary.positive).toBeGreaterThanOrEqual(1);
    expect(summary.averageScore).toBeGreaterThan(0);
    expect(summary.averageScore).toBeLessThanOrEqual(100);
  });

  it('handles an empty package list gracefully', () => {
    const entries = analyzeSentiment([]);
    expect(entries).toEqual([]);
    const summary = summarizeSentiment(entries);
    expect(summary.total).toBe(0);
    expect(summary.averageScore).toBe(0);
  });
});
