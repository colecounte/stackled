import semver from 'semver';
import type { PackageInfo, BreakingChange } from '../types';

export interface BreakingChangeEntry {
  name: string;
  fromVersion: string;
  toVersion: string;
  breakingChanges: BreakingChange[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedApis: string[];
  migrationNotes: string | null;
}

export interface BreakingChangeSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  packagesAffected: number;
}

export function classifyBreakingRisk(
  changes: BreakingChange[]
): BreakingChangeEntry['riskLevel'] {
  if (changes.some((c) => c.severity === 'critical')) return 'critical';
  if (changes.some((c) => c.severity === 'high')) return 'high';
  if (changes.length > 3) return 'medium';
  if (changes.length > 0) return 'low';
  return 'low';
}

export function extractAffectedApis(changes: BreakingChange[]): string[] {
  return changes
    .flatMap((c) => c.affectedSymbols ?? [])
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 10);
}

export function buildBreakingChangeEntry(
  pkg: PackageInfo,
  fromVersion: string,
  changes: BreakingChange[]
): BreakingChangeEntry {
  return {
    name: pkg.name,
    fromVersion,
    toVersion: pkg.version,
    breakingChanges: changes,
    riskLevel: classifyBreakingRisk(changes),
    affectedApis: extractAffectedApis(changes),
    migrationNotes: changes.find((c) => c.migrationNote)?.migrationNote ?? null,
  };
}

export function trackBreakingChanges(
  packages: PackageInfo[],
  previousVersions: Record<string, string>,
  changeMap: Record<string, BreakingChange[]>
): BreakingChangeEntry[] {
  return packages
    .filter((pkg) => {
      const prev = previousVersions[pkg.name];
      return prev && semver.gt(pkg.version, prev);
    })
    .map((pkg) => {
      const changes = changeMap[pkg.name] ?? [];
      return buildBreakingChangeEntry(pkg, previousVersions[pkg.name], changes);
    });
}

export function summarizeBreakingChanges(
  entries: BreakingChangeEntry[]
): BreakingChangeSummary {
  return {
    total: entries.reduce((s, e) => s + e.breakingChanges.length, 0),
    critical: entries.filter((e) => e.riskLevel === 'critical').length,
    high: entries.filter((e) => e.riskLevel === 'high').length,
    medium: entries.filter((e) => e.riskLevel === 'medium').length,
    low: entries.filter((e) => e.riskLevel === 'low').length,
    packagesAffected: entries.length,
  };
}
