import semver from 'semver';
import { Dependency, UpdateInfo } from '../types/index';

export interface UpdateCheckResult {
  dependency: Dependency;
  currentVersion: string;
  latestVersion: string;
  updateType: 'major' | 'minor' | 'patch' | 'none';
  updateInfo: UpdateInfo;
}

export function determineUpdateType(
  current: string,
  latest: string
): 'major' | 'minor' | 'patch' | 'none' {
  const cleanCurrent = semver.coerce(current)?.version;
  const cleanLatest = semver.coerce(latest)?.version;

  if (!cleanCurrent || !cleanLatest) return 'none';
  if (semver.eq(cleanCurrent, cleanLatest)) return 'none';
  if (semver.major(cleanLatest) > semver.major(cleanCurrent)) return 'major';
  if (semver.minor(cleanLatest) > semver.minor(cleanCurrent)) return 'minor';
  return 'patch';
}

export function checkForUpdates(
  dependencies: Dependency[],
  latestVersionsMap: Record<string, string>
): UpdateCheckResult[] {
  return dependencies
    .filter((dep) => latestVersionsMap[dep.name])
    .map((dep) => {
      const latestVersion = latestVersionsMap[dep.name];
      const updateType = determineUpdateType(dep.version, latestVersion);
      const isOutdated = updateType !== 'none';

      return {
        dependency: dep,
        currentVersion: dep.version,
        latestVersion,
        updateType,
        updateInfo: {
          isOutdated,
          latestVersion,
          updateType: isOutdated ? updateType : undefined,
        },
      };
    });
}

export function filterByUpdateType(
  results: UpdateCheckResult[],
  type: 'major' | 'minor' | 'patch'
): UpdateCheckResult[] {
  return results.filter((r) => r.updateType === type);
}
