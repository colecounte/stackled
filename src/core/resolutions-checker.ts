import semver from 'semver';
import { ParsedDependency } from '../types/index.js';

export interface ResolutionEntry {
  name: string;
  resolvedVersion: string;
  requiredBy: string[];
  isCompatible: boolean;
  conflicts: string[];
}

export interface ResolutionSummary {
  total: number;
  compatible: number;
  incompatible: number;
  entries: ResolutionEntry[];
}

export function checkResolutionCompatibility(
  resolvedVersion: string,
  requiredRanges: string[]
): string[] {
  return requiredRanges.filter(
    (range) => !semver.satisfies(resolvedVersion, range, { includePrerelease: false })
  );
}

export function buildResolutionEntry(
  name: string,
  resolvedVersion: string,
  dependents: ParsedDependency[]
): ResolutionEntry {
  const requiredBy = dependents.map((d) => `${d.name}@${d.version}`);
  const requiredRanges = dependents.map((d) => d.version);
  const conflicts = checkResolutionCompatibility(resolvedVersion, requiredRanges);

  return {
    name,
    resolvedVersion,
    requiredBy,
    isCompatible: conflicts.length === 0,
    conflicts,
  };
}

export function checkResolutions(
  resolutions: Record<string, string>,
  dependencies: ParsedDependency[]
): ResolutionSummary {
  const entries: ResolutionEntry[] = Object.entries(resolutions).map(([name, resolvedVersion]) => {
    const dependents = dependencies.filter((d) => d.name === name);
    return buildResolutionEntry(name, resolvedVersion, dependents);
  });

  const compatible = entries.filter((e) => e.isCompatible).length;

  return {
    total: entries.length,
    compatible,
    incompatible: entries.length - compatible,
    entries,
  };
}

export function summarizeResolutions(summary: ResolutionSummary): string {
  if (summary.total === 0) return 'No resolutions defined.';
  if (summary.incompatible === 0) return `All ${summary.total} resolution(s) are compatible.`;
  return `${summary.incompatible} of ${summary.total} resolution(s) have conflicts.`;
}
