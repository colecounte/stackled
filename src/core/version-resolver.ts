import semver from 'semver';
import { Dependency } from '../types/index';

export interface ResolvedVersion {
  dependency: string;
  currentVersion: string;
  resolvedVersion: string | null;
  isValid: boolean;
  isRange: boolean;
}

export function resolveVersion(version: string): string | null {
  const cleaned = semver.clean(version);
  if (cleaned) return cleaned;

  const coerced = semver.coerce(version);
  return coerced ? coerced.version : null;
}

export function isVersionRange(version: string): boolean {
  return /[\^~><=*x]/.test(version) || version.includes(' ');
}

export function satisfiesRange(version: string, range: string): boolean {
  const resolved = resolveVersion(version);
  if (!resolved) return false;
  try {
    return semver.satisfies(resolved, range);
  } catch {
    return false;
  }
}

export function resolveDependencyVersions(
  dependencies: Dependency[]
): ResolvedVersion[] {
  return dependencies.map((dep) => {
    const isRange = isVersionRange(dep.currentVersion);
    const resolvedVersion = resolveVersion(dep.currentVersion);
    return {
      dependency: dep.name,
      currentVersion: dep.currentVersion,
      resolvedVersion,
      isValid: resolvedVersion !== null,
      isRange,
    };
  });
}

export function getLatestSatisfying(
  versions: string[],
  range: string
): string | null {
  const valid = versions
    .map((v) => semver.clean(v))
    .filter((v): v is string => v !== null);
  const result = semver.maxSatisfying(valid, range);
  return result ?? null;
}
