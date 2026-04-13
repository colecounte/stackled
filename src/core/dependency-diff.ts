import { ParsedDependency } from '../types';

export type DiffChangeType = 'added' | 'removed' | 'upgraded' | 'downgraded' | 'unchanged';

export interface DependencyDiffEntry {
  name: string;
  changeType: DiffChangeType;
  fromVersion: string | null;
  toVersion: string | null;
}

export interface DependencyDiffSummary {
  added: number;
  removed: number;
  upgraded: number;
  downgraded: number;
  unchanged: number;
  total: number;
}

export function classifyChange(
  fromVersion: string | null,
  toVersion: string | null
): DiffChangeType {
  if (!fromVersion) return 'added';
  if (!toVersion) return 'removed';
  if (fromVersion === toVersion) return 'unchanged';

  const [fMaj, fMin, fPat] = fromVersion.replace(/^[^\d]*/, '').split('.').map(Number);
  const [tMaj, tMin, tPat] = toVersion.replace(/^[^\d]*/, '').split('.').map(Number);

  if (tMaj > fMaj || tMin > fMin || tPat > fPat) return 'upgraded';
  return 'downgraded';
}

export function diffDependencies(
  baseline: ParsedDependency[],
  current: ParsedDependency[]
): DependencyDiffEntry[] {
  const baselineMap = new Map(baseline.map(d => [d.name, d.version]));
  const currentMap = new Map(current.map(d => [d.name, d.version]));
  const allNames = new Set([...baselineMap.keys(), ...currentMap.keys()]);

  const entries: DependencyDiffEntry[] = [];
  for (const name of allNames) {
    const fromVersion = baselineMap.get(name) ?? null;
    const toVersion = currentMap.get(name) ?? null;
    entries.push({
      name,
      changeType: classifyChange(fromVersion, toVersion),
      fromVersion,
      toVersion,
    });
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export function summarizeDiff(entries: DependencyDiffEntry[]): DependencyDiffSummary {
  const summary: DependencyDiffSummary = {
    added: 0, removed: 0, upgraded: 0, downgraded: 0, unchanged: 0, total: entries.length,
  };
  for (const e of entries) summary[e.changeType]++;
  return summary;
}
