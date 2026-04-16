import { buildHealthEntry, summarizeChangelogHealth } from './dependency-changelog-health';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version } as PackageInfo;
}

describe('dependency-changelog-health integration', () => {
  it('builds and summarizes a mixed set of entries', () => {
    const packages = [
      { pkg: makePkg('react', '18.0.0'), daysAgo: 15, count: 20 },
      { pkg: makePkg('lodash', '4.17.21'), daysAgo: 500, count: 8 },
      { pkg: makePkg('ghost-lib', '0.1.0'), daysAgo: null, count: 0 },
      { pkg: makePkg('tiny-lib', '1.0.0'), daysAgo: 20, count: 2 },
    ];

    const entries = packages.map(({ pkg, daysAgo, count }) =>
      buildHealthEntry(pkg, daysAgo, count)
    );

    expect(entries[0].status).toBe('healthy');
    expect(entries[1].status).toBe('stale');
    expect(entries[2].status).toBe('missing');
    expect(entries[3].status).toBe('sparse');

    const summary = summarizeChangelogHealth(entries);
    expect(summary.total).toBe(4);
    expect(summary.healthy).toBe(1);
    expect(summary.stale).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.sparse).toBe(1);
    expect(summary.averageScore).toBeGreaterThan(0);
  });

  it('healthy packages score higher than missing ones', () => {
    const healthy = buildHealthEntry(makePkg('a'), 10, 15);
    const missing = buildHealthEntry(makePkg('b'), null, 0);
    expect(healthy.score).toBeGreaterThan(missing.score);
  });

  it('recent changelogs score higher than stale ones', () => {
    const recent = buildHealthEntry(makePkg('a'), 30, 10);
    const stale = buildHealthEntry(makePkg('b'), 400, 10);
    expect(recent.score).toBeGreaterThan(stale.score);
  });
});
