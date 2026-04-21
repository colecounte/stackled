import {
  areLicensesCompatible,
  buildCompatibilityEntry,
  checkLicenseCompatibility,
} from './dependency-license-compatibility-checker';
import { ParsedDependency } from '../types';

function makeDep(name: string, version = '1.0.0'): ParsedDependency {
  return { name, version, type: 'dependency' };
}

describe('areLicensesCompatible', () => {
  it('returns compatible with no risk for identical licenses', () => {
    const result = areLicensesCompatible('MIT', 'MIT');
    expect(result.compatible).toBe(true);
    expect(result.risk).toBe('none');
  });

  it('returns compatible with no risk for two permissive licenses', () => {
    const result = areLicensesCompatible('MIT', 'Apache-2.0');
    expect(result.compatible).toBe(true);
    expect(result.risk).toBe('none');
  });

  it('returns medium risk when mixing copyleft and permissive (A copyleft)', () => {
    const result = areLicensesCompatible('GPL-3.0', 'MIT');
    expect(result.compatible).toBe(true);
    expect(result.risk).toBe('medium');
  });

  it('returns medium risk when mixing permissive and copyleft (B copyleft)', () => {
    const result = areLicensesCompatible('MIT', 'AGPL-3.0');
    expect(result.compatible).toBe(true);
    expect(result.risk).toBe('medium');
  });

  it('returns high risk for two different copyleft licenses', () => {
    const result = areLicensesCompatible('GPL-2.0', 'AGPL-3.0');
    expect(result.compatible).toBe(false);
    expect(result.risk).toBe('high');
  });

  it('returns high risk for unknown license combination', () => {
    const result = areLicensesCompatible('PROPRIETARY', 'MIT');
    expect(result.compatible).toBe(false);
    expect(result.risk).toBe('high');
  });
});

describe('buildCompatibilityEntry', () => {
  it('builds an entry for a compatible pair', () => {
    const dep = makeDep('lodash', '4.17.21');
    const entry = buildCompatibilityEntry(dep, 'MIT', 'MIT');
    expect(entry.name).toBe('lodash');
    expect(entry.version).toBe('4.17.21');
    expect(entry.compatible).toBe(true);
    expect(entry.risk).toBe('none');
    expect(entry.licenseA).toBe('MIT');
    expect(entry.licenseB).toBe('MIT');
  });

  it('builds an entry for an incompatible pair', () => {
    const dep = makeDep('some-gpl-lib', '2.0.0');
    const entry = buildCompatibilityEntry(dep, 'MIT', 'GPL-3.0');
    expect(entry.compatible).toBe(true);
    expect(entry.risk).toBe('medium');
  });
});

describe('checkLicenseCompatibility', () => {
  it('returns a summary with all entries', () => {
    const deps = [makeDep('react'), makeDep('gpl-lib'), makeDep('unknown-lib')];
    const licenseMap = { react: 'MIT', 'gpl-lib': 'GPL-3.0', 'unknown-lib': 'PROPRIETARY' };
    const summary = checkLicenseCompatibility(deps, 'MIT', licenseMap);
    expect(summary.total).toBe(3);
    expect(summary.incompatible).toBeGreaterThanOrEqual(1);
    expect(summary.highRisk).toBeGreaterThanOrEqual(1);
    expect(summary.entries).toHaveLength(3);
  });

  it('uses UNKNOWN when dep license is missing from map', () => {
    const deps = [makeDep('mystery')];
    const summary = checkLicenseCompatibility(deps, 'MIT', {});
    expect(summary.entries[0].licenseB).toBe('UNKNOWN');
    expect(summary.entries[0].compatible).toBe(false);
  });

  it('returns zero incompatible for all permissive deps', () => {
    const deps = [makeDep('a'), makeDep('b')];
    const licenseMap = { a: 'ISC', b: 'BSD-3-Clause' };
    const summary = checkLicenseCompatibility(deps, 'MIT', licenseMap);
    expect(summary.incompatible).toBe(0);
    expect(summary.highRisk).toBe(0);
  });
});
