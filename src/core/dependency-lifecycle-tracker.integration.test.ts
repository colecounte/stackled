import { trackDependencyLifecycles, buildLifecycleEntry } from './dependency-lifecycle-tracker';
import { PackageInfo } from '../types';

const NOW = new Date('2024-06-01T00:00:00Z').getTime();

function daysAgo(n: number): string {
  return new Date(NOW - n * 86_400_000).toISOString();
}

function pkg(name: string, lastPublish: string, deprecated?: string): PackageInfo {
  return {
    name,
    version: '1.0.0',
    created: daysAgo(800),
    lastPublish,
    versions: Array.from({ length: 25 }, (_, i) => `1.${i}.0`),
    deprecated,
  } as unknown as PackageInfo;
}

describe('dependency-lifecycle-tracker integration', () => {
  const packages = [
    pkg('fresh-lib', daysAgo(10)),
    pkg('aging-lib', daysAgo(400)),
    pkg('dead-lib', daysAgo(800)),
    pkg('dep-lib', daysAgo(5), 'Use new-lib instead'),
  ];

  it('classifies a realistic mix of packages', () => {
    const { entries, summary } = trackDependencyLifecycles(packages, NOW);
    expect(entries).toHaveLength(4);
    expect(summary.deprecated).toContain('dep-lib');
    expect(summary.abandoned).toContain('dead-lib');
  });

  it('scores fresh packages higher than abandoned ones', () => {
    const fresh = buildLifecycleEntry(pkg('fresh', daysAgo(10)), NOW);
    const dead = buildLifecycleEntry(pkg('dead', daysAgo(800)), NOW);
    expect(fresh.score).toBeGreaterThan(dead.score);
  });

  it('byStage counts are consistent with entries', () => {
    const { entries, summary } = trackDependencyLifecycles(packages, NOW);
    const total = Object.values(summary.byStage).reduce((a, b) => a + b, 0);
    expect(total).toBe(entries.length);
  });

  it('provides a reason for each entry', () => {
    const { entries } = trackDependencyLifecycles(packages, NOW);
    for (const e of entries) {
      expect(e.reason.length).toBeGreaterThan(0);
    }
  });
});
