import { ParsedDependency } from '../types';

export type LicenseChange = {
  name: string;
  previousLicense: string;
  currentLicense: string;
  riskLevel: 'low' | 'medium' | 'high';
  isRestrictive: boolean;
  note: string;
};

export type RelicenseReport = {
  changes: LicenseChange[];
  totalChanged: number;
  highRiskCount: number;
};

const RESTRICTIVE_LICENSES = new Set([
  'GPL-2.0',
  'GPL-3.0',
  'AGPL-3.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'SSPL-1.0',
  'Commons-Clause',
]);

const PERMISSIVE_LICENSES = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'Unlicense',
]);

export function classifyRelicenseRisk(
  prev: string,
  curr: string
): 'low' | 'medium' | 'high' {
  const wasPermissive = PERMISSIVE_LICENSES.has(prev);
  const isNowRestrictive = RESTRICTIVE_LICENSES.has(curr);
  if (wasPermissive && isNowRestrictive) return 'high';
  if (!PERMISSIVE_LICENSES.has(curr) && !RESTRICTIVE_LICENSES.has(curr)) return 'medium';
  return 'low';
}

export function buildRelicenseNote(prev: string, curr: string, risk: 'low' | 'medium' | 'high'): string {
  if (risk === 'high') return `License changed from permissive (${prev}) to restrictive (${curr}). Review usage immediately.`;
  if (risk === 'medium') return `License changed from ${prev} to unknown/custom ${curr}. Manual review recommended.`;
  return `License updated from ${prev} to ${curr}. Low risk.`;
}

export function detectRelicensedDependencies(
  deps: ParsedDependency[],
  previousLicenses: Record<string, string>
): RelicenseReport {
  const changes: LicenseChange[] = [];

  for (const dep of deps) {
    const prev = previousLicenses[dep.name];
    const curr = (dep as any).license as string | undefined;
    if (!prev || !curr || prev === curr) continue;

    const riskLevel = classifyRelicenseRisk(prev, curr);
    const isRestrictive = RESTRICTIVE_LICENSES.has(curr);
    const note = buildRelicenseNote(prev, curr, riskLevel);

    changes.push({ name: dep.name, previousLicense: prev, currentLicense: curr, riskLevel, isRestrictive, note });
  }

  return {
    changes,
    totalChanged: changes.length,
    highRiskCount: changes.filter(c => c.riskLevel === 'high').length,
  };
}
