import { describe, it, expect } from 'vitest';
import {
  classifyRelicenseRisk,
  buildRelicenseNote,
  detectRelicensedDependencies,
} from './dependency-relicense-detector';
import { ParsedDependency } from '../types';

function makeDep(name: string, license?: string): ParsedDependency {
  return { name, currentVersion: '1.0.0', specifiedVersion: '^1.0.0', type: 'dependency', ...(license ? { license } : {}) } as any;
}

describe('classifyRelicenseRisk', () => {
  it('returns high when permissive -> restrictive', () => {
    expect(classifyRelicenseRisk('MIT', 'GPL-3.0')).toBe('high');
    expect(classifyRelicenseRisk('Apache-2.0', 'AGPL-3.0')).toBe('high');
  });

  it('returns low when both permissive', () => {
    expect(classifyRelicenseRisk('MIT', 'ISC')).toBe('low');
  });

  it('returns medium for unknown target license', () => {
    expect(classifyRelicenseRisk('MIT', 'Proprietary')).toBe('medium');
  });

  it('returns low when restrictive stays restrictive', () => {
    expect(classifyRelicenseRisk('GPL-2.0', 'GPL-3.0')).toBe('low');
  });
});

describe('buildRelicenseNote', () => {
  it('includes review warning for high risk', () => {
    const note = buildRelicenseNote('MIT', 'GPL-3.0', 'high');
    expect(note).toContain('Review usage immediately');
  });

  it('recommends manual review for medium risk', () => {
    const note = buildRelicenseNote('MIT', 'Proprietary', 'medium');
    expect(note).toContain('Manual review recommended');
  });

  it('indicates low risk for benign changes', () => {
    const note = buildRelicenseNote('MIT', 'ISC', 'low');
    expect(note).toContain('Low risk');
  });
});

describe('detectRelicensedDependencies', () => {
  it('detects a high-risk license change', () => {
    const deps = [makeDep('react', 'GPL-3.0')];
    const prev = { react: 'MIT' };
    const report = detectRelicensedDependencies(deps, prev);
    expect(report.totalChanged).toBe(1);
    expect(report.highRiskCount).toBe(1);
    expect(report.changes[0].riskLevel).toBe('high');
    expect(report.changes[0].isRestrictive).toBe(true);
  });

  it('ignores dependencies with unchanged licenses', () => {
    const deps = [makeDep('lodash', 'MIT')];
    const prev = { lodash: 'MIT' };
    const report = detectRelicensedDependencies(deps, prev);
    expect(report.totalChanged).toBe(0);
  });

  it('ignores dependencies with no previous license record', () => {
    const deps = [makeDep('new-pkg', 'MIT')];
    const report = detectRelicensedDependencies(deps, {});
    expect(report.totalChanged).toBe(0);
  });

  it('ignores dependencies with no current license', () => {
    const deps = [makeDep('no-license')];
    const prev = { 'no-license': 'MIT' };
    const report = detectRelicensedDependencies(deps, prev);
    expect(report.totalChanged).toBe(0);
  });

  it('handles multiple changes and counts high risk correctly', () => {
    const deps = [
      makeDep('pkg-a', 'GPL-3.0'),
      makeDep('pkg-b', 'ISC'),
      makeDep('pkg-c', 'Proprietary'),
    ];
    const prev = { 'pkg-a': 'MIT', 'pkg-b': 'MIT', 'pkg-c': 'Apache-2.0' };
    const report = detectRelicensedDependencies(deps, prev);
    expect(report.totalChanged).toBe(3);
    expect(report.highRiskCount).toBe(1);
  });
});
