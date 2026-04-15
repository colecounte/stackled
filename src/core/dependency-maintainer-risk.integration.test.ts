import {
  buildMaintainerRiskEntry,
  summarizeMaintainerRisks,
} from './dependency-maintainer-risk';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version } as PackageInfo;
}

function daysAgo(n: number): number {
  return n;
}

describe('dependency-maintainer-risk integration', () => {
  it('single-maintainer inactive package scores high', () => {
    const entry = buildMaintainerRiskEntry(makePkg('legacy-lib'), 1, daysAgo(400));
    expect(['high', 'critical']).toContain(entry.riskLevel);
    expect(entry.flags).toContain('single-maintainer');
    expect(entry.flags).toContain('inactive-1yr');
  });

  it('no-maintainer very old package scores critical', () => {
    const entry = buildMaintainerRiskEntry(makePkg('abandoned'), 0, daysAgo(800));
    expect(entry.riskLevel).toBe('critical');
    expect(entry.flags).toContain('no-maintainers');
    expect(entry.flags).toContain('inactive-2yr');
  });

  it('healthy package with many maintainers scores low', () => {
    const entry = buildMaintainerRiskEntry(makePkg('popular-lib'), 10, daysAgo(14));
    expect(entry.riskLevel).toBe('low');
    expect(entry.flags).toHaveLength(0);
  });

  it('summary aggregates correctly across mixed packages', () => {
    const entries = [
      buildMaintainerRiskEntry(makePkg('a'), 0, 800),
      buildMaintainerRiskEntry(makePkg('b'), 1, 400),
      buildMaintainerRiskEntry(makePkg('c'), 3, 200),
      buildMaintainerRiskEntry(makePkg('d'), 8, 10),
    ];
    const summary = summarizeMaintainerRisks(entries);
    expect(summary.total).toBe(4);
    expect(summary.critical + summary.high + summary.medium + summary.low).toBe(4);
    expect(summary.averageScore).toBeGreaterThan(0);
  });
});
