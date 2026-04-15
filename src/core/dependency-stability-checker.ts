import { PackageInfo } from '../types';
import semver from 'semver';

export type StabilityLevel = 'stable' | 'unstable' | 'experimental' | 'unknown';
export type StabilityRisk = 'low' | 'medium' | 'high';

export interface StabilityEntry {
  name: string;
  version: string;
  stabilityLevel: StabilityLevel;
  risk: StabilityRisk;
  isPreRelease: boolean;
  majorVersion: number;
  flags: string[];
}

export interface StabilitySummary {
  total: number;
  stable: number;
  unstable: number;
  experimental: number;
  highRisk: number;
}

export function classifyStability(version: string): StabilityLevel {
  const parsed = semver.parse(version);
  if (!parsed) return 'unknown';
  if (parsed.prerelease.length > 0) {
    const tag = String(parsed.prerelease[0]).toLowerCase();
    if (tag === 'alpha' || tag === 'canary') return 'experimental';
    return 'unstable';
  }
  if (parsed.major === 0) return 'unstable';
  return 'stable';
}

export function calcStabilityRisk(level: StabilityLevel, major: number): StabilityRisk {
  if (level === 'experimental') return 'high';
  if (level === 'unstable') return 'medium';
  if (major === 0) return 'medium';
  return 'low';
}

export function buildStabilityFlags(entry: Pick<StabilityEntry, 'stabilityLevel' | 'isPreRelease' | 'majorVersion'>): string[] {
  const flags: string[] = [];
  if (entry.isPreRelease) flags.push('pre-release');
  if (entry.majorVersion === 0) flags.push('pre-v1');
  if (entry.stabilityLevel === 'experimental') flags.push('experimental-tag');
  return flags;
}

export function buildStabilityEntry(pkg: PackageInfo): StabilityEntry {
  const version = pkg.version ?? '0.0.0';
  const parsed = semver.parse(version);
  const majorVersion = parsed?.major ?? 0;
  const isPreRelease = (parsed?.prerelease.length ?? 0) > 0;
  const stabilityLevel = classifyStability(version);
  const risk = calcStabilityRisk(stabilityLevel, majorVersion);
  const flags = buildStabilityFlags({ stabilityLevel, isPreRelease, majorVersion });
  return { name: pkg.name, version, stabilityLevel, risk, isPreRelease, majorVersion, flags };
}

export function checkDependencyStability(packages: PackageInfo[]): StabilityEntry[] {
  return packages.map(buildStabilityEntry);
}

export function summarizeStability(entries: StabilityEntry[]): StabilitySummary {
  return {
    total: entries.length,
    stable: entries.filter(e => e.stabilityLevel === 'stable').length,
    unstable: entries.filter(e => e.stabilityLevel === 'unstable').length,
    experimental: entries.filter(e => e.stabilityLevel === 'experimental').length,
    highRisk: entries.filter(e => e.risk === 'high').length,
  };
}
