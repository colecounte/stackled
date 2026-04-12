import { PackageInfo } from '../types';

export interface FreshnessEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  daysSinceRelease: number;
  changelogUpdated: boolean;
  freshnessScore: number;
  status: 'fresh' | 'stale' | 'outdated' | 'unknown';
}

export interface FreshnessSummary {
  total: number;
  fresh: number;
  stale: number;
  outdated: number;
  unknown: number;
  averageScore: number;
}

export function classifyFreshness(
  daysSinceRelease: number,
  changelogUpdated: boolean
): FreshnessEntry['status'] {
  if (daysSinceRelease < 0) return 'unknown';
  if (daysSinceRelease <= 7 && changelogUpdated) return 'fresh';
  if (daysSinceRelease <= 30) return 'stale';
  return 'outdated';
}

export function calcFreshnessScore(
  daysSinceRelease: number,
  changelogUpdated: boolean
): number {
  if (daysSinceRelease < 0) return 0;
  const recencyScore = Math.max(0, 100 - Math.floor(daysSinceRelease / 3));
  const changelogBonus = changelogUpdated ? 10 : 0;
  return Math.min(100, recencyScore + changelogBonus);
}

export function buildFreshnessEntry(
  pkg: PackageInfo,
  latestVersion: string,
  releaseDate: string | undefined,
  changelogUpdated: boolean
): FreshnessEntry {
  const daysSinceRelease = releaseDate
    ? Math.floor((Date.now() - new Date(releaseDate).getTime()) / 86_400_000)
    : -1;
  const freshnessScore = calcFreshnessScore(daysSinceRelease, changelogUpdated);
  const status = classifyFreshness(daysSinceRelease, changelogUpdated);
  return {
    name: pkg.name,
    currentVersion: pkg.version,
    latestVersion,
    daysSinceRelease,
    changelogUpdated,
    freshnessScore,
    status,
  };
}

export function checkChangelogFreshness(entries: FreshnessEntry[]): FreshnessSummary {
  const total = entries.length;
  const fresh = entries.filter(e => e.status === 'fresh').length;
  const stale = entries.filter(e => e.status === 'stale').length;
  const outdated = entries.filter(e => e.status === 'outdated').length;
  const unknown = entries.filter(e => e.status === 'unknown').length;
  const averageScore =
    total > 0
      ? Math.round(entries.reduce((s, e) => s + e.freshnessScore, 0) / total)
      : 0;
  return { total, fresh, stale, outdated, unknown, averageScore };
}
