import semver from 'semver';
import type { DependencyInfo } from '../types/index.js';

export interface AdoptionEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  adoptionLag: number; // days behind latest
  adoptionRate: 'fast' | 'moderate' | 'slow' | 'stale';
  versionsBehind: number;
  releaseDate: string | null;
  latestReleaseDate: string | null;
}

export interface AdoptionSummary {
  total: number;
  fast: number;
  moderate: number;
  slow: number;
  stale: number;
  averageLagDays: number;
}

export function classifyAdoptionRate(lagDays: number): AdoptionEntry['adoptionRate'] {
  if (lagDays <= 30) return 'fast';
  if (lagDays <= 90) return 'moderate';
  if (lagDays <= 180) return 'slow';
  return 'stale';
}

export function calcVersionsBehind(current: string, latest: string, allVersions: string[]): number {
  const sorted = allVersions
    .filter(v => semver.valid(v))
    .sort((a, b) => semver.compare(b, a));
  const latestIdx = sorted.indexOf(latest);
  const currentIdx = sorted.indexOf(current);
  if (latestIdx === -1 || currentIdx === -1) return 0;
  return currentIdx - latestIdx;
}

export function buildAdoptionEntry(
  dep: DependencyInfo,
  latestVersion: string,
  allVersions: string[],
  releaseDate: string | null,
  latestReleaseDate: string | null
): AdoptionEntry {
  const lagDays =
    releaseDate && latestReleaseDate
      ? Math.max(
          0,
          Math.floor(
            (new Date(latestReleaseDate).getTime() - new Date(releaseDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  return {
    name: dep.name,
    currentVersion: dep.currentVersion,
    latestVersion,
    adoptionLag: lagDays,
    adoptionRate: classifyAdoptionRate(lagDays),
    versionsBehind: calcVersionsBehind(dep.currentVersion, latestVersion, allVersions),
    releaseDate,
    latestReleaseDate,
  };
}

export function trackAdoption(deps: DependencyInfo[], registryData: Map<string, {
  latest: string;
  versions: string[];
  releaseDate: string | null;
  latestReleaseDate: string | null;
}>): AdoptionEntry[] {
  return deps.map(dep => {
    const data = registryData.get(dep.name);
    if (!data) {
      return buildAdoptionEntry(dep, dep.currentVersion, [dep.currentVersion], null, null);
    }
    return buildAdoptionEntry(dep, data.latest, data.versions, data.releaseDate, data.latestReleaseDate);
  });
}

export function summarizeAdoption(entries: AdoptionEntry[]): AdoptionSummary {
  const total = entries.length;
  const counts = { fast: 0, moderate: 0, slow: 0, stale: 0 };
  let totalLag = 0;
  for (const e of entries) {
    counts[e.adoptionRate]++;
    totalLag += e.adoptionLag;
  }
  return { total, ...counts, averageLagDays: total > 0 ? Math.round(totalLag / total) : 0 };
}
