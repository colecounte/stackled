import { ParsedDependency } from '../types';

export interface LicenseCompatibilityEntry {
  name: string;
  version: string;
  licenseA: string;
  licenseB: string;
  compatible: boolean;
  reason: string;
}

export interface LicenseCompatibilityReport {
  entries: LicenseCompatibilityEntry[];
  incompatibleCount: number;
  checkedCount: number;
}

// Simplified SPDX compatibility matrix
const INCOMPATIBLE_PAIRS: Array<[string, string]> = [
  ['GPL-2.0', 'MIT'],
  ['GPL-2.0', 'Apache-2.0'],
  ['GPL-3.0', 'Apache-2.0'],
  ['AGPL-3.0', 'MIT'],
  ['AGPL-3.0', 'Apache-2.0'],
  ['LGPL-2.1', 'Apache-2.0'],
];

const COPYLEFT_LICENSES = new Set([
  'GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0',
]);

export function areLicensesCompatible(licenseA: string, licenseB: string): { compatible: boolean; reason: string } {
  if (!licenseA || !licenseB) {
    return { compatible: true, reason: 'One or both licenses are unknown; skipping check' };
  }

  const normalA = licenseA.trim().toUpperCase();
  const normalB = licenseB.trim().toUpperCase();

  if (normalA === normalB) {
    return { compatible: true, reason: 'Same license' };
  }

  for (const [a, b] of INCOMPATIBLE_PAIRS) {
    if (
      (a.toUpperCase() === normalA && b.toUpperCase() === normalB) ||
      (a.toUpperCase() === normalB && b.toUpperCase() === normalA)
    ) {
      return { compatible: false, reason: `${licenseA} is incompatible with ${licenseB}` };
    }
  }

  if (COPYLEFT_LICENSES.has(licenseA) && !COPYLEFT_LICENSES.has(licenseB)) {
    return { compatible: false, reason: `Copyleft license ${licenseA} may be incompatible with ${licenseB}` };
  }

  return { compatible: true, reason: 'No known incompatibility detected' };
}

export function buildCompatibilityEntry(
  dep: ParsedDependency,
  licenseA: string,
  licenseB: string
): LicenseCompatibilityEntry {
  const { compatible, reason } = areLicensesCompatible(licenseA, licenseB);
  return {
    name: dep.name,
    version: dep.version,
    licenseA,
    licenseB,
    compatible,
    reason,
  };
}

export function checkLicenseCompatibility(
  deps: ParsedDependency[],
  projectLicense: string
): LicenseCompatibilityReport {
  const entries: LicenseCompatibilityEntry[] = deps.map((dep) => {
    const depLicense = (dep as any).license ?? 'UNKNOWN';
    return buildCompatibilityEntry(dep, projectLicense, depLicense);
  });

  return {
    entries,
    incompatibleCount: entries.filter((e) => !e.compatible).length,
    checkedCount: entries.length,
  };
}
