import { describe, it, expect } from 'vitest';
import {
  classifyUpdateType,
  calcPatchRisk,
  buildPatchRiskEntry,
  assessPatchRisks,
} from './patch-risk-assessor.js';
import { DependencyInfo } from '../types/index.js';

function makeDep(overrides: Partial<DependencyInfo> = {}): DependencyInfo {
  return {
    name: 'test-pkg',
    currentVersion: '1.0.0',
    latestVersion: '1.0.1',
    isDeprecated: false,
    repositoryUrl: 'https://github.com/test/pkg',
    ...overrides,
  } as DependencyInfo;
}

describe('classifyUpdateType', () => {
  it('returns patch for patch bump', () => {
    expect(classifyUpdateType('1.0.0', '1.0.1')).toBe('patch');
  });

  it('returns minor for minor bump', () => {
    expect(classifyUpdateType('1.0.0', '1.1.0')).toBe('minor');
  });

  it('returns major for major bump', () => {
    expect(classifyUpdateType('1.0.0', '2.0.0')).toBe('major');
  });

  it('returns unknown for equal versions', () => {
    expect(classifyUpdateType('1.0.0', '1.0.0')).toBe('unknown');
  });
});

describe('calcPatchRisk', () => {
  it('returns safe for patch update with healthy dep', () => {
    const dep = makeDep();
    const { riskLevel, reasons } = calcPatchRisk('patch', dep);
    expect(riskLevel).toBe('safe');
    expect(reasons).toHaveLength(0);
  });

  it('returns low for minor update', () => {
    const dep = makeDep();
    const { riskLevel } = calcPatchRisk('minor', dep);
    expect(riskLevel).toBe('low');
  });

  it('returns high for major update on deprecated dep', () => {
    const dep = makeDep({ isDeprecated: true });
    const { riskLevel, reasons } = calcPatchRisk('major', dep);
    expect(riskLevel).toBe('high');
    expect(reasons).toContain('Package is deprecated');
    expect(reasons).toContain('Major version bump — likely breaking changes');
  });

  it('adds reason when no repository url', () => {
    const dep = makeDep({ repositoryUrl: undefined });
    const { reasons } = calcPatchRisk('patch', dep);
    expect(reasons).toContain('No repository URL — provenance unclear');
  });
});

describe('buildPatchRiskEntry', () => {
  it('builds a full entry', () => {
    const dep = makeDep({ name: 'react', currentVersion: '17.0.0' });
    const entry = buildPatchRiskEntry(dep, '18.0.0');
    expect(entry.name).toBe('react');
    expect(entry.updateType).toBe('major');
    expect(entry.riskLevel).toBe('medium');
    expect(entry.targetVersion).toBe('18.0.0');
  });
});

describe('assessPatchRisks', () => {
  it('skips deps not in target map', () => {
    const deps = [makeDep({ name: 'a' }), makeDep({ name: 'b' })];
    const { entries } = assessPatchRisks(deps, { a: '1.0.1' });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('a');
  });

  it('computes summary counts correctly', () => {
    const deps = [
      makeDep({ name: 'a', currentVersion: '1.0.0' }),
      makeDep({ name: 'b', currentVersion: '1.0.0' }),
    ];
    const { summary } = assessPatchRisks(deps, { a: '1.0.1', b: '2.0.0' });
    expect(summary.total).toBe(2);
    expect(summary.safe).toBe(1);
    expect(summary.medium).toBe(1);
  });
});
