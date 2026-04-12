import { Dependency } from '../types';

export interface PrivatePackageEntry {
  name: string;
  version: string;
  isPrivate: boolean;
  registryScope: string | null;
  risk: 'none' | 'low' | 'high';
  reason: string;
}

export interface PrivatePackageSummary {
  total: number;
  privateCount: number;
  scopedCount: number;
  highRiskCount: number;
}

export function extractScope(name: string): string | null {
  return name.startsWith('@') ? name.split('/')[0] : null;
}

export function classifyPrivateRisk(
  isPrivate: boolean,
  scope: string | null
): 'none' | 'low' | 'high' {
  if (isPrivate) return 'high';
  if (scope && !isPublicScope(scope)) return 'low';
  return 'none';
}

const KNOWN_PUBLIC_SCOPES = new Set([
  '@types',
  '@babel',
  '@jest',
  '@angular',
  '@vue',
  '@react',
  '@mui',
  '@aws-sdk',
  '@google-cloud',
]);

export function isPublicScope(scope: string): boolean {
  return KNOWN_PUBLIC_SCOPES.has(scope);
}

export function buildPrivatePackageEntry(
  dep: Dependency,
  registryMeta: { private?: boolean } = {}
): PrivatePackageEntry {
  const scope = extractScope(dep.name);
  const isPrivate = registryMeta.private === true;
  const risk = classifyPrivateRisk(isPrivate, scope);

  let reason = 'Public package on npm registry';
  if (isPrivate) reason = 'Package is marked private in registry metadata';
  else if (scope && !isPublicScope(scope))
    reason = `Unrecognized scope "${scope}" — may be a private registry package`;

  return {
    name: dep.name,
    version: dep.version,
    isPrivate,
    registryScope: scope,
    risk,
    reason,
  };
}

export function detectPrivatePackages(
  deps: Dependency[],
  metaMap: Record<string, { private?: boolean }> = {}
): PrivatePackageEntry[] {
  return deps.map((dep) => buildPrivatePackageEntry(dep, metaMap[dep.name] ?? {}));
}

export function summarizePrivatePackages(
  entries: PrivatePackageEntry[]
): PrivatePackageSummary {
  return {
    total: entries.length,
    privateCount: entries.filter((e) => e.isPrivate).length,
    scopedCount: entries.filter((e) => e.registryScope !== null).length,
    highRiskCount: entries.filter((e) => e.risk === 'high').length,
  };
}
