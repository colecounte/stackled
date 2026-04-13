import {
  classifyLifecycleStage,
  calcLifecycleScore,
  buildLifecycleEntry,
  trackDependencyLifecycles,
} from './dependency-lifecycle-tracker';
import { PackageInfo } from '../types';

const NOW = new Date('2024-06-01T00:00:00Z').getTime();

function daysAgo(n: number): string {
  return new Date(NOW - n * 86_400_000).toISOString();
}

function makePkg(overrides: Partial<PackageInfo> = {}): PackageInfo {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    created: daysAgo(500),
    lastPublish: daysAgo(30),
    versions: Array.from({ length: 20 }, (_, i) => `1.${i}.0`),
    deprecated: undefined,
    ...overrides,
  } as unknown as PackageInfo;
}

describe('classifyLifecycleStage', () => {
  it('returns deprecated when flagged', () => {
    expect(classifyLifecycleStage(500, 10, 20, true)).toBe('deprecated');
  });

  it('returns abandoned when no release in 730+ days', () => {
    expect(classifyLifecycleStage(900, 800, 15, false)).toBe('abandoned');
  });

  it('returns maintenance when no release in 365-730 days', () => {
    expect(classifyLifecycleStage(800, 400, 30, false)).toBe('maintenance');
  });

  it('returns incubating for young packages', () => {
    expect(classifyLifecycleStage(90, 10, 5, false)).toBe('incubating');
  });

  it('returns mature for old packages with many releases', () => {
    expect(classifyLifecycleStage(1200, 20, 80, false)).toBe('mature');
  });

  it('returns active for typical packages', () => {
    expect(classifyLifecycleStage(400, 45, 25, false)).toBe('active');
  });
});

describe('calcLifecycleScore', () => {
  it('gives high score for active stage with recent release', () => {
    expect(calcLifecycleScore('active', 10)).toBe(90);
  });

  it('gives low score for abandoned', () => {
    expect(calcLifecycleScore('abandoned', 800)).toBe(0);
  });

  it('penalises based on days since last release', () => {
    const score = calcLifecycleScore('mature', 300);
    expect(score).toBeLessThan(85);
  });
});

describe('buildLifecycleEntry', () => {
  it('builds entry for an active package', () => {
    const entry = buildLifecycleEntry(makePkg(), NOW);
    expect(entry.stage).toBe('active');
    expect(entry.score).toBeGreaterThan(50);
    expect(entry.name).toBe('test-pkg');
  });

  it('marks deprecated packages correctly', () => {
    const entry = buildLifecycleEntry(makePkg({ deprecated: 'use new-pkg instead' }), NOW);
    expect(entry.stage).toBe('deprecated');
    expect(entry.reason).toMatch(/deprecated/i);
  });

  it('detects abandoned packages', () => {
    const entry = buildLifecycleEntry(makePkg({ lastPublish: daysAgo(800) }), NOW);
    expect(entry.stage).toBe('abandoned');
  });
});

describe('trackDependencyLifecycles', () => {
  it('returns entries and summary', () => {
    const pkgs = [makePkg(), makePkg({ name: 'other', deprecated: 'yes' })];
    const { entries, summary } = trackDependencyLifecycles(pkgs, NOW);
    expect(entries).toHaveLength(2);
    expect(summary.total).toBe(2);
    expect(summary.deprecated).toContain('other');
  });

  it('counts stages correctly', () => {
    const pkgs = [makePkg(), makePkg({ name: 'b', lastPublish: daysAgo(800) })];
    const { summary } = trackDependencyLifecycles(pkgs, NOW);
    expect(summary.byStage['abandoned']).toBe(1);
    expect(summary.abandoned).toContain('b');
  });
});
