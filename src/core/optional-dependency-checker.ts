import { Dependency } from '../types';
import semver from 'semver';

export interface OptionalDepEntry {
  name: string;
  version: string;
  isOptional: boolean;
  isInstalled: boolean;
  compatibleVersion: string | null;
  note: string;
}

export interface OptionalDepSummary {
  total: number;
  installed: number;
  missing: number;
  incompatible: number;
}

export function isOptionalDep(dep: Dependency): boolean {
  return dep.metadata?.optional === true;
}

export function checkVersionCompatibility(
  declaredRange: string,
  installedVersion: string | null
): string | null {
  if (!installedVersion) return null;
  try {
    return semver.satisfies(installedVersion, declaredRange) ? installedVersion : null;
  } catch {
    return null;
  }
}

export function buildOptionalEntry(
  dep: Dependency,
  installedVersion: string | null
): OptionalDepEntry {
  const optional = isOptionalDep(dep);
  const compatible = checkVersionCompatibility(dep.version, installedVersion);
  const isInstalled = installedVersion !== null;

  let note = '';
  if (!optional) {
    note = 'Not marked optional';
  } else if (!isInstalled) {
    note = 'Not installed — skipped';
  } else if (!compatible) {
    note = `Installed ${installedVersion} does not satisfy ${dep.version}`;
  } else {
    note = 'OK';
  }

  return {
    name: dep.name,
    version: dep.version,
    isOptional: optional,
    isInstalled,
    compatibleVersion: compatible,
    note,
  };
}

export function checkOptionalDependencies(
  deps: Dependency[],
  installedMap: Record<string, string | null>
): OptionalDepEntry[] {
  return deps
    .filter(isOptionalDep)
    .map((dep) => buildOptionalEntry(dep, installedMap[dep.name] ?? null));
}

export function summarizeOptional(entries: OptionalDepEntry[]): OptionalDepSummary {
  return {
    total: entries.length,
    installed: entries.filter((e) => e.isInstalled).length,
    missing: entries.filter((e) => !e.isInstalled).length,
    incompatible: entries.filter((e) => e.isInstalled && !e.compatibleVersion).length,
  };
}
