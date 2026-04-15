import {
  calcMaintainerRiskScore,
  classifyMaintainerRisk,
  buildMaintainerRiskFlags,
  buildMaintainerRiskEntry,
  summarizeMaintainerRisks,
  MaintainerRiskEntry,
} from './dependency-maintainer-risk';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version } as PackageInfo;
}

describe('calcMaintainerRiskScore', () => {
  it('returns high score for no maintainers and old publish', () => {
    expect(calcMaintainerRiskScore(0, 800)).toBe(90);
  });

  it('returns moderate score for single maintainer, recent publish', () => {
    expect(calcMaintainerRiskScore(1, 30)).toBe(30);
  });

  it('caps score at 100', () => {
    expect(calcMaintainerRiskScore(0, 1000)).toBeLessThanOrEqual(100);
  });

  it('returns 0 for healthy package', () => {
    expect(calcMaintainerRiskScore(5, 10)).toBe(0);
  });
});

describe('classifyMaintainerRisk', () => {
  it('classifies critical at 70+', () => expect(classifyMaintainerRisk(70)).toBe('critical'));
  it('classifies high at 45-69', () => expect(classifyMaintainerRisk(50)).toBe('high'));
  it('classifies medium at 20-44', () => expect(classifyMaintainerRisk(25)).toBe('medium'));
  it('classifies low below 20', () => expect(classifyMaintainerRisk(5)).toBe('low'));
});

describe('buildMaintainerRiskFlags', () => {
  it('flags no-maintainers', () => {
    expect(buildMaintainerRiskFlags(0, 10)).toContain('no-maintainers');
  });

  it('flags single-maintainer', () => {
    expect(buildMaintainerRiskFlags(1, 10)).toContain('single-maintainer');
  });

  it('flags inactive-2yr', () => {
    expect(buildMaintainerRiskFlags(3, 800)).toContain('inactive-2yr');
  });

  it('flags inactive-1yr', () => {
    expect(buildMaintainerRiskFlags(3, 400)).toContain('inactive-1yr');
  });

  it('returns empty flags for healthy package', () => {
    expect(buildMaintainerRiskFlags(4, 30)).toHaveLength(0);
  });
});

describe('buildMaintainerRiskEntry', () => {
  it('builds a complete entry', () => {
    const entry = buildMaintainerRiskEntry(makePkg('lodash', '4.0.0'), 2, 90);
    expect(entry.name).toBe('lodash');
    expect(entry.version).toBe('4.0.0');
    expect(entry.maintainerCount).toBe(2);
    expect(entry.daysSinceLastPublish).toBe(90);
    expect(entry.riskScore).toBeGreaterThanOrEqual(0);
    expect(['low', 'medium', 'high', 'critical']).toContain(entry.riskLevel);
  });
});

describe('summarizeMaintainerRisks', () => {
  const entries: MaintainerRiskEntry[] = [
    buildMaintainerRiskEntry(makePkg('a'), 0, 800),
    buildMaintainerRiskEntry(makePkg('b'), 1, 400),
    buildMaintainerRiskEntry(makePkg('c'), 5, 30),
  ];

  it('counts total', () => expect(summarizeMaintainerRisks(entries).total).toBe(3));
  it('computes averageScore', () => {
    const s = summarizeMaintainerRisks(entries);
    expect(s.averageScore).toBeGreaterThanOrEqual(0);
  });
  it('returns zeros for empty list', () => {
    const s = summarizeMaintainerRisks([]);
    expect(s.total).toBe(0);
    expect(s.averageScore).toBe(0);
  });
});
