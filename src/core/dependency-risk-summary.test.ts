import {
  classifyRiskLevel,
  buildRiskFlags,
  calcDependencyRiskScore,
  buildRiskSummaryEntry,
  summarizeDependencyRisks,
} from './dependency-risk-summary';
import { DependencyInfo } from '../types';

function makeDep(overrides: Partial<DependencyInfo> = {}): DependencyInfo {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    latestVersion: '1.0.0',
    isDeprecated: false,
    repositoryUrl: 'https://github.com/test/test-pkg',
    license: 'MIT',
    ...overrides,
  } as DependencyInfo;
}

describe('classifyRiskLevel', () => {
  it('returns critical for score >= 80', () => {
    expect(classifyRiskLevel(80)).toBe('critical');
    expect(classifyRiskLevel(100)).toBe('critical');
  });

  it('returns high for score 60-79', () => {
    expect(classifyRiskLevel(60)).toBe('high');
    expect(classifyRiskLevel(79)).toBe('high');
  });

  it('returns medium for score 40-59', () => {
    expect(classifyRiskLevel(40)).toBe('medium');
  });

  it('returns low for score 20-39', () => {
    expect(classifyRiskLevel(20)).toBe('low');
  });

  it('returns none for score < 20', () => {
    expect(classifyRiskLevel(0)).toBe('none');
    expect(classifyRiskLevel(19)).toBe('none');
  });
});

describe('buildRiskFlags', () => {
  it('returns empty array for healthy dep', () => {
    expect(buildRiskFlags(makeDep())).toEqual([]);
  });

  it('flags deprecated dep', () => {
    expect(buildRiskFlags(makeDep({ isDeprecated: true }))).toContain('deprecated');
  });

  it('flags missing repository', () => {
    expect(buildRiskFlags(makeDep({ repositoryUrl: undefined }))).toContain('no-repository');
  });

  it('flags missing license', () => {
    expect(buildRiskFlags(makeDep({ license: undefined }))).toContain('no-license');
  });

  it('flags missing latestVersion', () => {
    expect(buildRiskFlags(makeDep({ latestVersion: undefined }))).toContain('no-registry-data');
  });
});

describe('calcDependencyRiskScore', () => {
  it('returns 0 for healthy dep', () => {
    expect(calcDependencyRiskScore(makeDep())).toBe(0);
  });

  it('adds 40 for deprecated', () => {
    expect(calcDependencyRiskScore(makeDep({ isDeprecated: true }))).toBe(40);
  });

  it('caps at 100', () => {
    const dep = makeDep({
      isDeprecated: true,
      repositoryUrl: undefined,
      license: undefined,
      latestVersion: undefined,
    });
    expect(calcDependencyRiskScore(dep)).toBeLessThanOrEqual(100);
  });
});

describe('buildRiskSummaryEntry', () => {
  it('builds entry with correct fields', () => {
    const entry = buildRiskSummaryEntry(makeDep());
    expect(entry.name).toBe('test-pkg');
    expect(entry.version).toBe('1.0.0');
    expect(entry.riskLevel).toBe('none');
    expect(entry.flags).toEqual([]);
  });
});

describe('summarizeDependencyRisks', () => {
  it('returns empty report for no deps', () => {
    const report = summarizeDependencyRisks([]);
    expect(report.totalDependencies).toBe(0);
    expect(report.overallRiskScore).toBe(0);
  });

  it('counts risk levels correctly', () => {
    const deps = [
      makeDep({ isDeprecated: true, repositoryUrl: undefined, license: undefined }),
      makeDep(),
    ];
    const report = summarizeDependencyRisks(deps);
    expect(report.totalDependencies).toBe(2);
    expect(report.criticalCount + report.highCount + report.mediumCount + report.lowCount).toBeGreaterThanOrEqual(1);
  });

  it('calculates overallRiskScore as average', () => {
    const deps = [makeDep(), makeDep({ isDeprecated: true })];
    const report = summarizeDependencyRisks(deps);
    expect(report.overallRiskScore).toBe(20);
  });
});
