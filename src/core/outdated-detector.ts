import semver from 'semver';
import { DependencyInfo, OutdatedDependency } from '../types/index';
import { diffVersions, isStableVersion } from './semver-utils';

export function isOutdated(
  current: string,
  latest: string
): boolean {
  const currentClean = semver.coerce(current)?.version;
  const latestClean = semver.coerce(latest)?.version;
  if (!currentClean || !latestClean) return false;
  return semver.lt(currentClean, latestClean);
}

export function buildOutdatedEntry(
  dep: DependencyInfo,
  latest: string
): OutdatedDependency {
  const diff = diffVersions(dep.currentVersion, latest);
  return {
    name: dep.name,
    currentVersion: dep.currentVersion,
    latestVersion: latest,
    versionDiff: diff ?? 'unknown',
    isStable: isStableVersion(latest),
    updateAvailable: true,
  };
}

export function detectOutdated(
  dependencies: DependencyInfo[]
): OutdatedDependency[] {
  const outdated: OutdatedDependency[] = [];

  for (const dep of dependencies) {
    if (!dep.latestVersion) continue;
    if (isOutdated(dep.currentVersion, dep.latestVersion)) {
      outdated.push(buildOutdatedEntry(dep, dep.latestVersion));
    }
  }

  return outdated.sort((a, b) => {
    const order = { major: 0, minor: 1, patch: 2, unknown: 3 };
    return (order[a.versionDiff as keyof typeof order] ?? 3) -
           (order[b.versionDiff as keyof typeof order] ?? 3);
  });
}

export function summarizeOutdated(
  outdated: OutdatedDependency[]
): Record<string, number> {
  return outdated.reduce(
    (acc, dep) => {
      const key = dep.versionDiff ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}
