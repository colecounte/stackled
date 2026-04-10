import {
  classifyLicenseRisk,
  isOsiApproved,
  isCopyleft,
  checkLicense,
  checkLicenses,
  summarizeLicenseRisks,
} from './license-checker';
import { PackageInfo } from '../types';

const makePackage = (name: string, version: string, license?: string): PackageInfo => ({
  name,
  version,
  currentVersion: version,
  latestVersion: version,
  license,
  dependencies: {},
  devDependencies: {},
});

describe('classifyLicenseRisk', () => {
  it('returns low for MIT', () => expect(classifyLicenseRisk('MIT')).toBe('low'));
  it('returns low for Apache-2.0', () => expect(classifyLicenseRisk('Apache-2.0')).toBe('low'));
  it('returns medium for LGPL-2.1', () => expect(classifyLicenseRisk('LGPL-2.1')).toBe('medium'));
  it('returns high for GPL-3.0', () => expect(classifyLicenseRisk('GPL-3.0')).toBe('high'));
  it('returns high for AGPL-3.0', () => expect(classifyLicenseRisk('AGPL-3.0')).toBe('high'));
  it('returns unknown for null', () => expect(classifyLicenseRisk(null)).toBe('unknown'));
  it('returns unknown for unrecognized license', () => expect(classifyLicenseRisk('Custom-1.0')).toBe('unknown'));
  it('returns high for PROPRIETARY', () => expect(classifyLicenseRisk('PROPRIETARY')).toBe('high'));
});

describe('isOsiApproved', () => {
  it('returns true for MIT', () => expect(isOsiApproved('MIT')).toBe(true));
  it('returns true for ISC', () => expect(isOsiApproved('ISC')).toBe(true));
  it('returns false for null', () => expect(isOsiApproved(null)).toBe(false));
  it('returns false for unknown license', () => expect(isOsiApproved('Custom-1.0')).toBe(false));
});

describe('isCopyleft', () => {
  it('returns true for GPL-2.0', () => expect(isCopyleft('GPL-2.0')).toBe(true));
  it('returns true for MPL-2.0', () => expect(isCopyleft('MPL-2.0')).toBe(true));
  it('returns false for MIT', () => expect(isCopyleft('MIT')).toBe(false));
  it('returns false for null', () => expect(isCopyleft(null)).toBe(false));
});

describe('checkLicense', () => {
  it('returns full license info for a known package', () => {
    const pkg = makePackage('lodash', '4.17.21', 'MIT');
    const result = checkLicense(pkg);
    expect(result.packageName).toBe('lodash');
    expect(result.license).toBe('MIT');
    expect(result.risk).toBe('low');
    expect(result.isOsiApproved).toBe(true);
    expect(result.isCopyleft).toBe(false);
  });

  it('handles missing license', () => {
    const pkg = makePackage('mystery-pkg', '1.0.0');
    const result = checkLicense(pkg);
    expect(result.license).toBeNull();
    expect(result.risk).toBe('unknown');
  });
});

describe('checkLicenses', () => {
  it('maps over all packages', () => {
    const pkgs = [
      makePackage('a', '1.0.0', 'MIT'),
      makePackage('b', '2.0.0', 'GPL-3.0'),
    ];
    const results = checkLicenses(pkgs);
    expect(results).toHaveLength(2);
    expect(results[0].risk).toBe('low');
    expect(results[1].risk).toBe('high');
  });
});

describe('summarizeLicenseRisks', () => {
  it('counts risks correctly', () => {
    const pkgs = [
      makePackage('a', '1.0.0', 'MIT'),
      makePackage('b', '1.0.0', 'GPL-3.0'),
      makePackage('c', '1.0.0', 'LGPL-2.1'),
      makePackage('d', '1.0.0'),
    ];
    const summary = summarizeLicenseRisks(checkLicenses(pkgs));
    expect(summary.low).toBe(1);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(1);
    expect(summary.unknown).toBe(1);
  });
});
