import { PackageInfo } from '../types';

export type LicenseRisk = 'low' | 'medium' | 'high' | 'unknown';

export interface LicenseInfo {
  packageName: string;
  version: string;
  license: string | null;
  risk: LicenseRisk;
  isOsiApproved: boolean;
  isCopyleft: boolean;
}

const OSI_APPROVED = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC',
  'MPL-2.0', 'LGPL-2.1', 'LGPL-3.0', 'GPL-2.0', 'GPL-3.0',
  'AGPL-3.0', 'CDDL-1.0', 'EPL-1.0', 'EPL-2.0'
]);

const COPYLEFT_LICENSES = new Set([
  'GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0',
  'MPL-2.0', 'CDDL-1.0', 'EPL-1.0', 'EPL-2.0'
]);

const HIGH_RISK_LICENSES = new Set([
  'GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'SSPL-1.0', 'BUSL-1.1'
]);

export function classifyLicenseRisk(license: string | null): LicenseRisk {
  if (!license) return 'unknown';
  const normalized = license.toUpperCase().replace(/ /g, '-');
  if (HIGH_RISK_LICENSES.has(license)) return 'high';
  if (COPYLEFT_LICENSES.has(license)) return 'medium';
  if (OSI_APPROVED.has(license)) return 'low';
  if (normalized.includes('PROPRIETARY') || normalized.includes('UNLICENSED')) return 'high';
  return 'unknown';
}

export function isOsiApproved(license: string | null): boolean {
  if (!license) return false;
  return OSI_APPROVED.has(license);
}

export function isCopyleft(license: string | null): boolean {
  if (!license) return false;
  return COPYLEFT_LICENSES.has(license);
}

export function checkLicense(pkg: PackageInfo): LicenseInfo {
  const license = pkg.license ?? null;
  return {
    packageName: pkg.name,
    version: pkg.version,
    license,
    risk: classifyLicenseRisk(license),
    isOsiApproved: isOsiApproved(license),
    isCopyleft: isCopyleft(license),
  };
}

export function checkLicenses(packages: PackageInfo[]): LicenseInfo[] {
  return packages.map(checkLicense);
}

export function summarizeLicenseRisks(results: LicenseInfo[]): Record<LicenseRisk, number> {
  return results.reduce(
    (acc, r) => { acc[r.risk]++; return acc; },
    { low: 0, medium: 0, high: 0, unknown: 0 } as Record<LicenseRisk, number>
  );
}
