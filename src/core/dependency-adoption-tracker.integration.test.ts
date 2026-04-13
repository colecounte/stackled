import { describe, it, expect } from 'vitest';
import { trackAdoption, summarizeAdoption } from './dependency-adoption-tracker.js';
import type { DependencyInfo } from '../types/index.js';

function dep(name: string, currentVersion: string): DependencyInfo {
  return { name, currentVersion, latestVersion: currentVersion, type: 'dependency', updateAvailable: false };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('dependency-adoption-tracker integration', () => {
  it('correctly classifies a mixed set of dependencies', () => {
    const deps = [
      dep('fast-pkg', '2.0.0'),
      dep('slow-pkg', '1.0.0'),
      dep('stale-pkg', '0.9.0'),
    ];

    const registryData = new Map([
      ['fast-pkg', { latest: '2.1.0', versions: ['2.1.0', '2.0.0'], releaseDate: daysAgo(10), latestReleaseDate: daysAgo(0) }],
      ['slow-pkg', { latest: '3.0.0', versions: ['3.0.0', '2.0.0', '1.0.0'], releaseDate: daysAgo(150), latestReleaseDate: daysAgo(0) }],
      ['stale-pkg', { latest: '2.0.0', versions: ['2.0.0', '1.0.0', '0.9.0'], releaseDate: daysAgo(400), latestReleaseDate: daysAgo(0) }],
    ]);

    const entries = trackAdoption(deps, registryData);
    expect(entries).toHaveLength(3);

    const fast = entries.find(e => e.name === 'fast-pkg')!;
    const slow = entries.find(e => e.name === 'slow-pkg')!;
    const stale = entries.find(e => e.name === 'stale-pkg')!;

    expect(fast.adoptionRate).toBe('fast');
    expect(slow.adoptionRate).toBe('slow');
    expect(stale.adoptionRate).toBe('stale');

    const summary = summarizeAdoption(entries);
    expect(summary.fast).toBe(1);
    expect(summary.slow).toBe(1);
    expect(summary.stale).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.averageLagDays).toBeGreaterThan(0);
  });

  it('handles all up-to-date dependencies', () => {
    const deps = [dep('up-to-date', '1.0.0')];
    const registryData = new Map([
      ['up-to-date', { latest: '1.0.0', versions: ['1.0.0'], releaseDate: daysAgo(5), latestReleaseDate: daysAgo(5) }],
    ]);
    const entries = trackAdoption(deps, registryData);
    expect(entries[0].adoptionRate).toBe('fast');
    expect(entries[0].versionsBehind).toBe(0);
  });
});
