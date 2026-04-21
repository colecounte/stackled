import { describe, it, expect } from 'vitest';
import {
  sameMajor,
  findKnownConflict,
  buildAdvisory,
  adviseCompatibility,
} from './dependency-compatibility-advisor';
import type { ParsedPackage } from '../types';

function makePkg(name: string, version: string, extra: Partial<ParsedPackage> = {}): ParsedPackage {
  return {
    name,
    version,
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    ...extra,
  };
}

describe('sameMajor', () => {
  it('returns true when both versions share the same major', () => {
    expect(sameMajor('2.3.1', '2.9.0')).toBe(true);
  });

  it('returns false when major versions differ', () => {
    expect(sameMajor('1.0.0', '2.0.0')).toBe(false);
  });

  it('handles pre-release versions', () => {
    expect(sameMajor('3.0.0-alpha.1', '3.1.0')).toBe(true);
  });

  it('returns false for invalid version strings', () => {
    expect(sameMajor('invalid', '1.0.0')).toBe(false);
  });
});

describe('findKnownConflict', () => {
  it('returns a conflict entry for a known incompatible pair', () => {
    const conflict = findKnownConflict('react', '17.0.0', 'react-dom', '18.0.0');
    expect(conflict).not.toBeNull();
    expect(conflict?.severity).toBeDefined();
  });

  it('returns null when no known conflict exists', () => {
    const conflict = findKnownConflict('lodash', '4.17.0', 'ramda', '0.29.0');
    expect(conflict).toBeNull();
  });

  it('returns null when versions are compatible', () => {
    const conflict = findKnownConflict('react', '18.0.0', 'react-dom', '18.0.0');
    expect(conflict).toBeNull();
  });
});

describe('buildAdvisory', () => {
  it('builds an advisory with high severity for major version mismatch', () => {
    const pkgA = makePkg('react', '17.0.0');
    const pkgB = makePkg('react-dom', '18.0.0');
    const advisory = buildAdvisory(pkgA, pkgB, 'major-mismatch');
    expect(advisory.severity).toBe('high');
    expect(advisory.packageA).toBe('react');
    expect(advisory.packageB).toBe('react-dom');
    expect(advisory.recommendation).toBeTruthy();
  });

  it('builds an advisory with low severity for minor mismatch', () => {
    const pkgA = makePkg('typescript', '5.0.0');
    const pkgB = makePkg('@types/node', '20.0.0');
    const advisory = buildAdvisory(pkgA, pkgB, 'minor-mismatch');
    expect(advisory.severity).toBe('low');
  });

  it('includes version info in the advisory', () => {
    const pkgA = makePkg('webpack', '4.0.0');
    const pkgB = makePkg('webpack-cli', '5.0.0');
    const advisory = buildAdvisory(pkgA, pkgB, 'known-conflict');
    expect(advisory.versionA).toBe('4.0.0');
    expect(advisory.versionB).toBe('5.0.0');
  });
});

describe('adviseCompatibility', () => {
  it('returns empty array when no packages provided', () => {
    const result = adviseCompatibility([]);
    expect(result).toEqual([]);
  });

  it('returns empty array for a single package', () => {
    const result = adviseCompatibility([makePkg('react', '18.0.0')]);
    expect(result).toEqual([]);
  });

  it('detects react / react-dom major version mismatch', () => {
    const packages = [
      makePkg('react', '17.0.2'),
      makePkg('react-dom', '18.2.0'),
    ];
    const advisories = adviseCompatibility(packages);
    expect(advisories.length).toBeGreaterThan(0);
    const names = advisories.map((a) => `${a.packageA}+${a.packageB}`);
    expect(names.some((n) => n.includes('react'))).toBe(true);
  });

  it('does not flag packages with matching major versions', () => {
    const packages = [
      makePkg('react', '18.1.0'),
      makePkg('react-dom', '18.2.0'),
    ];
    const advisories = adviseCompatibility(packages);
    expect(advisories.length).toBe(0);
  });

  it('returns advisories sorted by severity descending', () => {
    const packages = [
      makePkg('react', '16.0.0'),
      makePkg('react-dom', '18.0.0'),
      makePkg('react-router', '6.0.0'),
    ];
    const advisories = adviseCompatibility(packages);
    const severityOrder = ['critical', 'high', 'medium', 'low', 'none'];
    for (let i = 1; i < advisories.length; i++) {
      const prev = severityOrder.indexOf(advisories[i - 1].severity);
      const curr = severityOrder.indexOf(advisories[i].severity);
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });
});
