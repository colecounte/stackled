import semver from 'semver';

export interface VersionDiff {
  from: string;
  to: string;
  type: 'major' | 'minor' | 'patch' | 'prerelease' | 'unknown';
  distance: number;
}

export function diffVersions(from: string, to: string): VersionDiff {
  const cleanFrom = semver.clean(from) ?? from;
  const cleanTo = semver.clean(to) ?? to;

  const releaseType = semver.diff(cleanFrom, cleanTo);

  let type: VersionDiff['type'] = 'unknown';
  if (releaseType === 'major' || releaseType === 'premajor') {
    type = 'major';
  } else if (releaseType === 'minor' || releaseType === 'preminor') {
    type = 'minor';
  } else if (releaseType === 'patch' || releaseType === 'prepatch') {
    type = 'patch';
  } else if (releaseType === 'prerelease') {
    type = 'prerelease';
  }

  const fromMajor = semver.major(cleanFrom);
  const toMajor = semver.major(cleanTo);
  const distance = Math.abs(toMajor - fromMajor);

  return { from: cleanFrom, to: cleanTo, type, distance };
}

export function isStableVersion(version: string): boolean {
  const clean = semver.clean(version);
  if (!clean) return false;
  return semver.prerelease(clean) === null;
}

export function isNewerVersion(current: string, candidate: string): boolean {
  const cleanCurrent = semver.clean(current);
  const cleanCandidate = semver.clean(candidate);
  if (!cleanCurrent || !cleanCandidate) return false;
  return semver.gt(cleanCandidate, cleanCurrent);
}

export function coerceVersion(raw: string): string | null {
  const coerced = semver.coerce(raw);
  return coerced ? coerced.version : null;
}

export function sortVersionsDesc(versions: string[]): string[] {
  return versions
    .map((v) => semver.clean(v) ?? v)
    .filter((v) => semver.valid(v))
    .sort((a, b) => semver.rcompare(a, b));
}
