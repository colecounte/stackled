import { ParsedDependency } from '../types';

export interface DuplicateGroup {
  name: string;
  versions: string[];
  installedPaths: string[];
  wastedBytes?: number;
}

export interface DuplicateSummary {
  totalDuplicates: number;
  affectedPackages: string[];
  estimatedWaste: number;
}

export function groupByName(
  deps: ParsedDependency[]
): Map<string, ParsedDependency[]> {
  const map = new Map<string, ParsedDependency[]>();
  for (const dep of deps) {
    const existing = map.get(dep.name) ?? [];
    existing.push(dep);
    map.set(dep.name, existing);
  }
  return map;
}

export function isDuplicate(group: ParsedDependency[]): boolean {
  const versions = new Set(group.map((d) => d.currentVersion));
  return versions.size > 1;
}

export function buildDuplicateGroup(
  name: string,
  group: ParsedDependency[]
): DuplicateGroup {
  const versions = [...new Set(group.map((d) => d.currentVersion))];
  const installedPaths = group.map(
    (d) => d.resolvedPath ?? `node_modules/${name}`
  );
  return { name, versions, installedPaths };
}

export function detectDuplicates(
  deps: ParsedDependency[]
): DuplicateGroup[] {
  const grouped = groupByName(deps);
  const duplicates: DuplicateGroup[] = [];
  for (const [name, group] of grouped.entries()) {
    if (isDuplicate(group)) {
      duplicates.push(buildDuplicateGroup(name, group));
    }
  }
  return duplicates;
}

export function summarizeDuplicates(
  duplicates: DuplicateGroup[]
): DuplicateSummary {
  return {
    totalDuplicates: duplicates.length,
    affectedPackages: duplicates.map((d) => d.name),
    estimatedWaste: duplicates.reduce(
      (sum, d) => sum + (d.wastedBytes ?? 0),
      0
    ),
  };
}
