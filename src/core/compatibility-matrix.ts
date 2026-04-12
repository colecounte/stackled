import semver from 'semver';
import { ParsedDependency } from '../types/index.js';

export interface CompatibilityEntry {
  name: string;
  currentVersion: string;
  targetVersion: string;
  nodeRange: string | null;
  compatible: boolean;
  breakingChange: boolean;
  risk: 'low' | 'medium' | 'high';
  notes: string[];
}

export interface CompatibilityMatrix {
  entries: CompatibilityEntry[];
  totalChecked: number;
  incompatibleCount: number;
  breakingCount: number;
}

export function assessCompatibility(
  current: string,
  target: string,
  nodeRange: string | null
): { compatible: boolean; breakingChange: boolean; risk: 'low' | 'medium' | 'high' } {
  const diff = semver.diff(semver.coerce(current)?.version ?? current, semver.coerce(target)?.version ?? target);
  const breakingChange = diff === 'major';
  const currentNode = process.version;
  const nodeOk = nodeRange ? semver.satisfies(currentNode, nodeRange) : true;
  const compatible = nodeOk && !breakingChange;
  const risk = breakingChange ? 'high' : diff === 'minor' ? 'medium' : 'low';
  return { compatible, breakingChange, risk };
}

export function buildCompatibilityEntry(
  dep: ParsedDependency,
  targetVersion: string,
  nodeRange: string | null
): CompatibilityEntry {
  const { compatible, breakingChange, risk } = assessCompatibility(
    dep.currentVersion,
    targetVersion,
    nodeRange
  );
  const notes: string[] = [];
  if (breakingChange) notes.push(`Major version bump from ${dep.currentVersion} to ${targetVersion}`);
  if (nodeRange && !semver.satisfies(process.version, nodeRange))
    notes.push(`Requires Node ${nodeRange}, current is ${process.version}`);
  return {
    name: dep.name,
    currentVersion: dep.currentVersion,
    targetVersion,
    nodeRange,
    compatible,
    breakingChange,
    risk,
    notes,
  };
}

export function buildCompatibilityMatrix(
  entries: CompatibilityEntry[]
): CompatibilityMatrix {
  return {
    entries,
    totalChecked: entries.length,
    incompatibleCount: entries.filter((e) => !e.compatible).length,
    breakingCount: entries.filter((e) => e.breakingChange).length,
  };
}
