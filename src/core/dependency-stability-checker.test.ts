import {
  classifyStability,
  calcStabilityRisk,
  buildStabilityEntry,
  checkDependencyStability,
  summarizeStability,
  buildStabilityFlags,
} from './dependency-stability-checker';
import { PackageInfo } from '../types';

function makePkg(name: string, version: string): PackageInfo {
  return { name, version } as PackageInfo;
}

describe('classifyStability', () => {
  it('returns stable for a normal release', () => {
    expect(classifyStability('2.3.1')).toBe('stable');
  });

  it('returns unstable for 0.x versions', () => {
    expect(classifyStability('0.9.0')).toBe('unstable');
  });

  it('returns experimental for alpha pre-release', () => {
    expect(classifyStability('1.0.0-alpha.1')).toBe('experimental');
  });

  it('returns experimental for canary pre-release', () => {
    expect(classifyStability('2.0.0-canary.3')).toBe('experimental');
  });

  it('returns unstable for beta pre-release', () => {
    expect(classifyStability('1.0.0-beta.2')).toBe('unstable');
  });

  it('returns unknown for invalid version', () => {
    expect(classifyStability('not-a-version')).toBe('unknown');
  });
});

describe('calcStabilityRisk', () => {
  it('returns high for experimental', () => {
    expect(calcStabilityRisk('experimental', 1)).toBe('high');
  });

  it('returns medium for unstable', () => {
    expect(calcStabilityRisk('unstable', 1)).toBe('medium');
  });

  it('returns medium for stable pre-v1', () => {
    expect(calcStabilityRisk('stable', 0)).toBe('medium');
  });

  it('returns low for stable v1+', () => {
    expect(calcStabilityRisk('stable', 2)).toBe('low');
  });
});

describe('buildStabilityFlags', () => {
  it('includes pre-release flag when applicable', () => {
    const flags = buildStabilityFlags({ stabilityLevel: 'unstable', isPreRelease: true, majorVersion: 1 });
    expect(flags).toContain('pre-release');
  });

  it('includes pre-v1 flag for major version 0', () => {
    const flags = buildStabilityFlags({ stabilityLevel: 'unstable', isPreRelease: false, majorVersion: 0 });
    expect(flags).toContain('pre-v1');
  });

  it('returns empty flags for stable v1+', () => {
    const flags = buildStabilityFlags({ stabilityLevel: 'stable', isPreRelease: false, majorVersion: 2 });
    expect(flags).toHaveLength(0);
  });
});

describe('buildStabilityEntry', () => {
  it('builds a correct entry for a stable package', () => {
    const entry = buildStabilityEntry(makePkg('lodash', '4.17.21'));
    expect(entry.name).toBe('lodash');
    expect(entry.stabilityLevel).toBe('stable');
    expect(entry.risk).toBe('low');
    expect(entry.isPreRelease).toBe(false);
    expect(entry.majorVersion).toBe(4);
  });

  it('builds a correct entry for an alpha package', () => {
    const entry = buildStabilityEntry(makePkg('my-lib', '1.0.0-alpha.1'));
    expect(entry.stabilityLevel).toBe('experimental');
    expect(entry.risk).toBe('high');
    expect(entry.isPreRelease).toBe(true);
    expect(entry.flags).toContain('experimental-tag');
  });
});

describe('checkDependencyStability', () => {
  it('returns an entry per package', () => {
    const pkgs = [makePkg('a', '1.0.0'), makePkg('b', '0.1.0')];
    const results = checkDependencyStability(pkgs);
    expect(results).toHaveLength(2);
  });
});

describe('summarizeStability', () => {
  it('summarizes correctly', () => {
    const entries = checkDependencyStability([
      makePkg('a', '2.0.0'),
      makePkg('b', '0.5.0'),
      makePkg('c', '1.0.0-alpha.1'),
    ]);
    const summary = summarizeStability(entries);
    expect(summary.total).toBe(3);
    expect(summary.stable).toBe(1);
    expect(summary.unstable).toBe(1);
    expect(summary.experimental).toBe(1);
    expect(summary.highRisk).toBe(1);
  });
});
