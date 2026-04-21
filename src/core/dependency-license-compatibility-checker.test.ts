import { describe, it, expect } from 'vitest';
import {
  areLicensesCompatible,
  buildCompatibilityEntry,
  checkLicenseCompatibility,
} from './dependency-license-compatibility-checker';
import { ParsedDependency } from '../types';

function makeDep(name: string, version = '1.0.0', license = 'MIT'): ParsedDependency {
  return { name, version, license } as ParsedDependency & { license: string };
}

describe('areLicensesCompatible', () => {
  it('returns compatible for identical licenses', () => {
    const result = areLicensesCompatible('MIT', 'MIT');
    expect(result.compatible).toBe(true);
    expect(result.reason).toMatch(/same license/i);
  });

  it('flags GPL-2.0 and MIT as incompatible', () => {
    const result = areLicensesCompatible('GPL-2.0', 'MIT');
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('GPL-2.0');
  });

  it('flags GPL-3.0 and Apache-2.0 as incompatible', () => {
    const result = areLicensesCompatible('GPL-3.0', 'Apache-2.0');
    expect(result.compatible).toBe(false);
  });

  it('flags AGPL-3.0 and MIT as incompatible', () => {
    const result = areLicensesCompatible('AGPL-3.0', 'MIT');
    expect(result.compatible).toBe(false);
  });

  it('returns compatible for MIT and Apache-2.0', () => {
    const result = areLicensesCompatible('MIT', 'Apache-2.0');
    expect(result.compatible).toBe(true);
  });

  it('returns compatible when one license is unknown', () => {
    const result = areLicensesCompatible('', 'MIT');
    expect(result.compatible).toBe(true);
    expect(result.reason).toMatch(/unknown/i);
  });

  it('detects copyleft vs permissive incompatibility', () => {
    const result = areLicensesCompatible('LGPL-2.1', 'BSD-3-Clause');
    expect(result.compatible).toBe(false);
  });
});

describe('buildCompatibilityEntry', () => {
  it('builds an entry for a compatible pair', () => {
    const dep = makeDep('lodash', '4.17.21', 'MIT');
    const entry = buildCompatibilityEntry(dep, 'MIT', 'MIT');
    expect(entry.name).toBe('lodash');
    expect(entry.compatible).toBe(true);
    expect(entry.licenseA).toBe('MIT');
    expect(entry.licenseB).toBe('MIT');
  });

  it('builds an entry for an incompatible pair', () => {
    const dep = makeDep('some-gpl-lib', '1.0.0', 'GPL-2.0');
    const entry = buildCompatibilityEntry(dep, 'MIT', 'GPL-2.0');
    expect(entry.compatible).toBe(false);
    expect(entry.reason).toBeTruthy();
  });
});

describe('checkLicenseCompatibility', () => {
  it('returns a report with correct counts', () => {
    const deps = [
      makeDep('a', '1.0.0', 'MIT'),
      makeDep('b', '2.0.0', 'GPL-2.0'),
      makeDep('c', '3.0.0', 'Apache-2.0'),
    ];
    const report = checkLicenseCompatibility(deps, 'MIT');
    expect(report.checkedCount).toBe(3);
    expect(report.incompatibleCount).toBeGreaterThanOrEqual(1);
  });

  it('returns zero incompatible for all-permissive deps', () => {
    const deps = [
      makeDep('x', '1.0.0', 'MIT'),
      makeDep('y', '1.0.0', 'ISC'),
    ];
    const report = checkLicenseCompatibility(deps, 'MIT');
    expect(report.incompatibleCount).toBe(0);
  });

  it('handles empty dependency list', () => {
    const report = checkLicenseCompatibility([], 'MIT');
    expect(report.entries).toHaveLength(0);
    expect(report.incompatibleCount).toBe(0);
  });
});
