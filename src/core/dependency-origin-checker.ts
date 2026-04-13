import { PackageInfo } from '../types';

export type OriginType = 'npm' | 'github' | 'gitlab' | 'bitbucket' | 'local' | 'unknown';
export type OriginRisk = 'low' | 'medium' | 'high';

export interface OriginEntry {
  name: string;
  version: string;
  origin: OriginType;
  risk: OriginRisk;
  sourceUrl: string | null;
  flags: string[];
}

export interface OriginSummary {
  total: number;
  byOrigin: Record<OriginType, number>;
  highRisk: number;
}

export function detectOrigin(version: string): OriginType {
  if (version.startsWith('github:') || /^[\w-]+\/[\w-]+(#.*)?$/.test(version)) return 'github';
  if (version.startsWith('gitlab:')) return 'gitlab';
  if (version.startsWith('bitbucket:')) return 'bitbucket';
  if (version.startsWith('file:') || version.startsWith('.') || version.startsWith('/')) return 'local';
  if (/^[\^~><=*]?\d/.test(version) || version === 'latest' || version === '*') return 'npm';
  return 'unknown';
}

export function classifyOriginRisk(origin: OriginType): OriginRisk {
  if (origin === 'npm') return 'low';
  if (origin === 'github' || origin === 'gitlab' || origin === 'bitbucket') return 'medium';
  return 'high';
}

export function buildOriginFlags(origin: OriginType): string[] {
  const flags: string[] = [];
  if (origin === 'local') flags.push('local-path dependency — not reproducible in CI');
  if (origin === 'github') flags.push('git dependency — may lack semantic versioning');
  if (origin === 'gitlab') flags.push('git dependency — may lack semantic versioning');
  if (origin === 'bitbucket') flags.push('git dependency — may lack semantic versioning');
  if (origin === 'unknown') flags.push('unrecognised version specifier');
  return flags;
}

export function buildOriginEntry(pkg: PackageInfo): OriginEntry {
  const origin = detectOrigin(pkg.version);
  const risk = classifyOriginRisk(origin);
  const flags = buildOriginFlags(origin);
  const sourceUrl = pkg.repositoryUrl ?? null;
  return { name: pkg.name, version: pkg.version, origin, risk, sourceUrl, flags };
}

export function checkDependencyOrigins(packages: PackageInfo[]): OriginEntry[] {
  return packages.map(buildOriginEntry);
}

export function summarizeOrigins(entries: OriginEntry[]): OriginSummary {
  const byOrigin: Record<OriginType, number> = { npm: 0, github: 0, gitlab: 0, bitbucket: 0, local: 0, unknown: 0 };
  let highRisk = 0;
  for (const e of entries) {
    byOrigin[e.origin]++;
    if (e.risk === 'high') highRisk++;
  }
  return { total: entries.length, byOrigin, highRisk };
}
