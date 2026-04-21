import { ParsedDependency } from '../types';

export type LicenseCompatibilityRisk = 'none' | 'low' | 'medium' | 'high';

export interface LicenseCompatibilityEntry {
  name: string;
  version: string;
  licenseA: string;
  licenseB: string;
  compatible: boolean;
  risk: LicenseCompatibilityRisk;
  reason: string;
}

export interface LicenseCompatibilitySummary {
  total: number;
  incompatible: number;
  highRisk: number;
  entries: LicenseCompatibilityEntry[];
}

const COPYLEFT_LICENSES = new Set(['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0']);
const PERMISSIVE_LICENSES = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0']);

export function areLicensesCompatible(
  licenseA: string,
  licenseB: string
): { compatible: boolean; risk: LicenseCompatibilityRisk; reason: string } {
  const aIsCopyleft = COPYLEFT_LICENSES.has(licenseA);
  const bIsCopyleft = COPYLEFT_LICENSES.has(licenseB);
  const aIsPermissive = PERMISSIVE_LICENSES.has(licenseA);
  const bIsPermissive = PERMISSIVE_LICENSES.has(licenseB);

  if (licenseA === licenseB) {
    return { compatible: true, risk: 'none', reason: 'Same license' };
  }

  if (aIsCopyleft && bIsCopyleft) {
    const bothGpl = licenseA.startsWith('GPL') && licenseB.startsWith('GPL');
    return bothGpl
      ? { compatible: false, risk: 'high', reason: 'Incompatible copyleft licenses' }
      : { compatible: false, risk: 'high', reason: 'Mixing copyleft licenses is risky' };
  }

  if (aIsCopyleft && bIsPermissive) {
    return { compatible: true, risk: 'medium', reason: 'Copyleft may impose redistribution requirements' };
  }

  if (aIsPermissive && bIsCopyleft) {
    return { compatible: true, risk: 'medium', reason: 'Copyleft dependency may affect your distribution terms' };
  }

  if (aIsPermissive && bIsPermissive) {
    return { compatible: true, risk: 'none', reason: 'Both permissive licenses are compatible' };
  }

  return { compatible: false, risk: 'high', reason: 'Unknown or proprietary license combination' };
}

export function buildCompatibilityEntry(
  dep: ParsedDependency,
  projectLicense: string,
  depLicense: string
): LicenseCompatibilityEntry {
  const { compatible, risk, reason } = areLicensesCompatible(projectLicense, depLicense);
  return {
    name: dep.name,
    version: dep.version,
    licenseA: projectLicense,
    licenseB: depLicense,
    compatible,
    risk,
    reason,
  };
}

export function checkLicenseCompatibility(
  deps: ParsedDependency[],
  projectLicense: string,
  depLicenseMap: Record<string, string>
): LicenseCompatibilitySummary {
  const entries = deps.map((dep) => {
    const depLicense = depLicenseMap[dep.name] ?? 'UNKNOWN';
    return buildCompatibilityEntry(dep, projectLicense, depLicense);
  });

  return {
    total: entries.length,
    incompatible: entries.filter((e) => !e.compatible).length,
    highRisk: entries.filter((e) => e.risk === 'high').length,
    entries,
  };
}
