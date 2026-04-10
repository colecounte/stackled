import {
  calcRiskLevel,
  buildTransitiveRiskEntry,
  analyzeTransitiveRisks,
  summarizeTransitiveRisks,
} from './transitive-risk-analyzer';
import { DependencyInfo } from '../types';

function makeDep(overrides: Partial<DependencyInfo> = {}): DependencyInfo {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    latestVersion: '1.0.0',
    updateAvailable: false,
    deprecated: false,
    vulnerabilities: [],
    ...overrides,
  } as DependencyInfo;
}

describe('calcRiskLevel', () => {
  it('returns critical for vuln at shallow depth', () => {
    expect(calcRiskLevel(true, false, false, 1)).toBe('critical');
  });

  it('returns high for vuln at deep depth', () => {
    expect(calcRiskLevel(true, false, false, 5)).toBe('high');
  });

  it('returns high for deprecated at depth 1', () => {
    expect(calcRiskLevel(false, true, false, 1)).toBe('high');
  });

  it('returns medium for deprecated at depth 3', () => {
    expect(calcRiskLevel(false, true, false, 3)).toBe('medium');
  });

  it('returns medium for outdated at depth 1', () => {
    expect(calcRiskLevel(false, false, true, 1)).toBe('medium');
  });

  it('returns low for outdated at depth 3', () => {
    expect(calcRiskLevel(false, false, true, 3)).toBe('low');
  });

  it('returns none when no issues', () => {
    expect(calcRiskLevel(false, false, false, 0)).toBe('none');
  });
});

describe('buildTransitiveRiskEntry', () => {
  it('includes vulnerability reason', () => {
    const dep = makeDep({ name: 'vuln-pkg', vulnerabilities: [{ id: 'CVE-001' } as any] });
    const entry = buildTransitiveRiskEntry(dep, 1, ['parent-pkg']);
    expect(entry.reasons).toContain('1 vulnerability found');
    expect(entry.affectedBy).toEqual(['parent-pkg']);
    expect(entry.depth).toBe(1);
  });

  it('includes deprecation reason', () => {
    const dep = makeDep({ name: 'old-pkg', deprecated: true });
    const entry = buildTransitiveRiskEntry(dep, 2, []);
    expect(entry.reasons).toContain('package is deprecated');
  });

  it('includes outdated reason', () => {
    const dep = makeDep({ name: 'stale-pkg', updateAvailable: true });
    const entry = buildTransitiveRiskEntry(dep, 1, []);
    expect(entry.reasons).toContain('newer version available');
  });
});

describe('analyzeTransitiveRisks', () => {
  it('filters out entries with no risk', () => {
    const deps = [makeDep({ name: 'safe' }), makeDep({ name: 'risky', deprecated: true })];
    const result = analyzeTransitiveRisks(deps, { safe: 1, risky: 1 }, { risky: ['app'] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('risky');
  });
});

describe('summarizeTransitiveRisks', () => {
  it('counts by severity and finds most impacted', () => {
    const entries = [
      { name: 'a', version: '1.0.0', depth: 1, riskLevel: 'critical' as const, reasons: [], affectedBy: ['x', 'y', 'z'] },
      { name: 'b', version: '1.0.0', depth: 2, riskLevel: 'high' as const, reasons: [], affectedBy: ['x'] },
      { name: 'c', version: '1.0.0', depth: 3, riskLevel: 'low' as const, reasons: [], affectedBy: [] },
    ];
    const summary = summarizeTransitiveRisks(entries);
    expect(summary.total).toBe(3);
    expect(summary.critical).toBe(1);
    expect(summary.high).toBe(1);
    expect(summary.low).toBe(1);
    expect(summary.mostImpacted[0]).toBe('a');
  });
});
