import {
  classifyCadenceBand,
  calcAvgDaysBetweenReleases,
  buildCadenceFlags,
  buildReleaseCadenceEntry,
  analyzeReleaseCadence,
  summarizeReleaseCadence,
} from './dependency-release-cadence';
import { PackageInfo } from '../types';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function makePkg(overrides: Partial<PackageInfo> & { name: string; version: string }): PackageInfo {
  return {
    description: '',
    license: 'MIT',
    time: {},
    ...overrides,
  } as PackageInfo;
}

describe('classifyCadenceBand', () => {
  it('returns rapid for < 14 days', () => expect(classifyCadenceBand(7)).toBe('rapid'));
  it('returns regular for 14–59 days', () => expect(classifyCadenceBand(30)).toBe('regular'));
  it('returns slow for 60–179 days', () => expect(classifyCadenceBand(90)).toBe('slow'));
  it('returns stagnant for >= 180 days', () => expect(classifyCadenceBand(200)).toBe('stagnant'));
});

describe('calcAvgDaysBetweenReleases', () => {
  it('returns 0 for fewer than 2 dates', () => {
    expect(calcAvgDaysBetweenReleases([new Date()])).toBe(0);
  });

  it('calculates correctly for evenly spaced dates', () => {
    const dates = [new Date(daysAgo(60)), new Date(daysAgo(30)), new Date(daysAgo(0))];
    expect(calcAvgDaysBetweenReleases(dates)).toBe(30);
  });

  it('handles unsorted dates', () => {
    const dates = [new Date(daysAgo(0)), new Date(daysAgo(60)), new Date(daysAgo(30))];
    expect(calcAvgDaysBetweenReleases(dates)).toBe(30);
  });
});

describe('buildCadenceFlags', () => {
  it('flags stagnant band', () => {
    expect(buildCadenceFlags('stagnant', 200)).toContain('no recent releases');
  });

  it('flags rapid band', () => {
    expect(buildCadenceFlags('rapid', 5)).toContain('very frequent releases — may be unstable');
  });

  it('flags no release in over a year', () => {
    expect(buildCadenceFlags('slow', 400)).toContain('no release in over a year');
  });

  it('returns empty for healthy regular cadence', () => {
    expect(buildCadenceFlags('regular', 30)).toHaveLength(0);
  });
});

describe('buildReleaseCadenceEntry', () => {
  it('builds entry for package with release history', () => {
    const pkg = makePkg({
      name: 'lodash',
      version: '4.17.21',
      time: {
        created: daysAgo(400),
        modified: daysAgo(0),
        '4.0.0': daysAgo(300),
        '4.1.0': daysAgo(240),
        '4.17.21': daysAgo(180),
      },
    });
    const entry = buildReleaseCadenceEntry(pkg);
    expect(entry.name).toBe('lodash');
    expect(entry.totalReleases).toBe(3);
    expect(entry.cadenceBand).toBeDefined();
  });

  it('handles package with no time entries', () => {
    const pkg = makePkg({ name: 'empty-pkg', version: '1.0.0', time: {} });
    const entry = buildReleaseCadenceEntry(pkg);
    expect(entry.totalReleases).toBe(0);
    expect(entry.avgDaysBetweenReleases).toBe(0);
  });
});

describe('analyzeReleaseCadence', () => {
  it('returns one entry per package', () => {
    const pkgs = [
      makePkg({ name: 'a', version: '1.0.0' }),
      makePkg({ name: 'b', version: '2.0.0' }),
    ];
    expect(analyzeReleaseCadence(pkgs)).toHaveLength(2);
  });
});

describe('summarizeReleaseCadence', () => {
  it('counts bands correctly', () => {
    const entries = [
      { cadenceBand: 'rapid', avgDaysBetweenReleases: 7 },
      { cadenceBand: 'regular', avgDaysBetweenReleases: 30 },
      { cadenceBand: 'stagnant', avgDaysBetweenReleases: 200 },
    ] as any;
    const summary = summarizeReleaseCadence(entries);
    expect(summary.rapid).toBe(1);
    expect(summary.regular).toBe(1);
    expect(summary.stagnant).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.avgDaysBetweenReleases).toBe(79);
  });
});
