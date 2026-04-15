import semver from 'semver';
import type { ParsedDependency } from '../types/index.js';

export type PinDriftLevel = 'none' | 'minor' | 'moderate' | 'severe';

export interface PinDriftEntry {
  name: string;
  currentVersion: string;
  resolvedVersion: string;
  specifier: string;
  driftLevel: PinDriftLevel;
  versionsBehind: number;
  isPinned: boolean;
}

export interface PinDriftSummary {
  total: number;
  pinned: number;
  drifted: number;
  severeCount: number;
}

export function isPinned(specifier: string): boolean {
  return /^\d/.test(specifier) || specifier.startsWith('=');
}

export function classifyDriftLevel(
  specifier: string,
  resolvedVersion: string,
  availableVersions: string[]
): PinDriftLevel {
  if (!semver.valid(resolvedVersion)) return 'none';
  const newer = availableVersions.filter(
    (v) => semver.valid(v) && semver.gt(v, resolvedVersion)
  );
  const behind = newer.length;
  if (behind === 0) return 'none';
  if (behind <= 2) return 'minor';
  if (behind <= 5) return 'moderate';
  return 'severe';
}

export function buildPinDriftEntry(
  dep: ParsedDependency,
  resolvedVersion: string,
  availableVersions: string[]
): PinDriftEntry {
  const specifier = dep.version;
  const pinned = isPinned(specifier);
  const newer = availableVersions.filter(
    (v) => semver.valid(v) && semver.gt(v, resolvedVersion)
  );
  return {
    name: dep.name,
    currentVersion: specifier,
    resolvedVersion,
    specifier,
    driftLevel: classifyDriftLevel(specifier, resolvedVersion, availableVersions),
    versionsBehind: newer.length,
    isPinned: pinned,
  };
}

export function detectPinDrift(
  deps: ParsedDependency[],
  resolvedMap: Record<string, string>,
  availableMap: Record<string, string[]>
): PinDriftEntry[] {
  return deps.map((dep) => {
    const resolved = resolvedMap[dep.name] ?? dep.version;
    const available = availableMap[dep.name] ?? [];
    return buildPinDriftEntry(dep, resolved, available);
  });
}

export function summarizePinDrift(entries: PinDriftEntry[]): PinDriftSummary {
  return {
    total: entries.length,
    pinned: entries.filter((e) => e.isPinned).length,
    drifted: entries.filter((e) => e.driftLevel !== 'none').length,
    severeCount: entries.filter((e) => e.driftLevel === 'severe').length,
  };
}
