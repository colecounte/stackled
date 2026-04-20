import { PackageInfo } from '../types';

export type CadenceBand = 'rapid' | 'regular' | 'slow' | 'stagnant';

export interface ReleaseCadenceEntry {
  name: string;
  version: string;
  totalReleases: number;
  avgDaysBetweenReleases: number;
  daysSinceLastRelease: number;
  cadenceBand: CadenceBand;
  isHealthy: boolean;
  flags: string[];
}

export interface ReleaseCadenceSummary {
  total: number;
  rapid: number;
  regular: number;
  slow: number;
  stagnant: number;
  avgDaysBetweenReleases: number;
}

export function classifyCadenceBand(avgDays: number): CadenceBand {
  if (avgDays < 14) return 'rapid';
  if (avgDays < 60) return 'regular';
  if (avgDays < 180) return 'slow';
  return 'stagnant';
}

export function calcAvgDaysBetweenReleases(dates: Date[]): number {
  if (dates.length < 2) return 0;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += (sorted[i].getTime() - sorted[i - 1].getTime()) / 86_400_000;
  }
  return Math.round(total / (sorted.length - 1));
}

export function buildCadenceFlags(band: CadenceBand, daysSinceLast: number): string[] {
  const flags: string[] = [];
  if (band === 'stagnant') flags.push('no recent releases');
  if (band === 'rapid') flags.push('very frequent releases — may be unstable');
  if (daysSinceLast > 365) flags.push('no release in over a year');
  if (daysSinceLast > 180 && band !== 'stagnant') flags.push('release cadence slowing');
  return flags;
}

export function buildReleaseCadenceEntry(pkg: PackageInfo): ReleaseCadenceEntry {
  const releaseDates = Object.values(pkg.time ?? {}
  ).filter((v): v is string => typeof v === 'string' && !['created', 'modified'].includes(v as string))
    .map(d => new Date(d));

  const now = Date.now();
  const lastDate = releaseDates.length
    ? Math.max(...releaseDates.map(d => d.getTime()))
    : now;
  const daysSinceLast = Math.round((now - lastDate) / 86_400_000);
  const avgDays = calcAvgDaysBetweenReleases(releaseDates);
  const band = classifyCadenceBand(avgDays);
  const flags = buildCadenceFlags(band, daysSinceLast);

  return {
    name: pkg.name,
    version: pkg.version,
    totalReleases: releaseDates.length,
    avgDaysBetweenReleases: avgDays,
    daysSinceLastRelease: daysSinceLast,
    cadenceBand: band,
    isHealthy: flags.length === 0,
    flags,
  };
}

export function analyzeReleaseCadence(packages: PackageInfo[]): ReleaseCadenceEntry[] {
  return packages.map(buildReleaseCadenceEntry);
}

export function summarizeReleaseCadence(entries: ReleaseCadenceEntry[]): ReleaseCadenceSummary {
  const total = entries.length;
  const avgAll = total
    ? Math.round(entries.reduce((s, e) => s + e.avgDaysBetweenReleases, 0) / total)
    : 0;
  return {
    total,
    rapid: entries.filter(e => e.cadenceBand === 'rapid').length,
    regular: entries.filter(e => e.cadenceBand === 'regular').length,
    slow: entries.filter(e => e.cadenceBand === 'slow').length,
    stagnant: entries.filter(e => e.cadenceBand === 'stagnant').length,
    avgDaysBetweenReleases: avgAll,
  };
}
