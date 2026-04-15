import { PackageInfo } from '../types';

export type FrequencyBand = 'very-active' | 'active' | 'moderate' | 'slow' | 'stale';

export interface PublishFrequencyEntry {
  name: string;
  currentVersion: string;
  totalReleases: number;
  releasesPerYear: number;
  avgDaysBetweenReleases: number;
  band: FrequencyBand;
  lastPublished: string | null;
}

export interface PublishFrequencySummary {
  total: number;
  veryActive: number;
  active: number;
  moderate: number;
  slow: number;
  stale: number;
}

export function classifyFrequencyBand(releasesPerYear: number): FrequencyBand {
  if (releasesPerYear >= 24) return 'very-active';
  if (releasesPerYear >= 12) return 'active';
  if (releasesPerYear >= 4) return 'moderate';
  if (releasesPerYear >= 1) return 'slow';
  return 'stale';
}

export function calcAvgDaysBetween(totalReleases: number, ageInDays: number): number {
  if (totalReleases <= 1 || ageInDays <= 0) return ageInDays;
  return Math.round(ageInDays / (totalReleases - 1));
}

export function buildPublishFrequencyEntry(
  pkg: PackageInfo,
  versions: string[],
): PublishFrequencyEntry {
  const now = Date.now();
  const times = pkg.time ?? {};
  const publishedDates = versions
    .map((v) => (times[v] ? new Date(times[v]).getTime() : null))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);

  const totalReleases = publishedDates.length;
  const firstMs = publishedDates[0] ?? now;
  const lastMs = publishedDates[publishedDates.length - 1] ?? now;
  const ageInDays = Math.max(1, Math.round((now - firstMs) / 86_400_000));
  const releasesPerYear = totalReleases > 0 ? parseFloat(((totalReleases / ageInDays) * 365).toFixed(1)) : 0;
  const avgDaysBetweenReleases = calcAvgDaysBetween(totalReleases, ageInDays);
  const lastPublished = lastMs ? new Date(lastMs).toISOString().split('T')[0] : null;

  return {
    name: pkg.name,
    currentVersion: pkg.version,
    totalReleases,
    releasesPerYear,
    avgDaysBetweenReleases,
    band: classifyFrequencyBand(releasesPerYear),
    lastPublished,
  };
}

export function analyzePublishFrequency(
  packages: PackageInfo[],
  versionsMap: Record<string, string[]>,
): PublishFrequencyEntry[] {
  return packages.map((pkg) => buildPublishFrequencyEntry(pkg, versionsMap[pkg.name] ?? []));
}

export function summarizePublishFrequency(entries: PublishFrequencyEntry[]): PublishFrequencySummary {
  return entries.reduce<PublishFrequencySummary>(
    (acc, e) => {
      acc.total++;
      if (e.band === 'very-active') acc.veryActive++;
      else if (e.band === 'active') acc.active++;
      else if (e.band === 'moderate') acc.moderate++;
      else if (e.band === 'slow') acc.slow++;
      else acc.stale++;
      return acc;
    },
    { total: 0, veryActive: 0, active: 0, moderate: 0, slow: 0, stale: 0 },
  );
}
