import { PackageInfo } from '../types';

export type VelocityBand = 'rapid' | 'active' | 'moderate' | 'slow' | 'stagnant';

export interface ChangelogVelocityEntry {
  name: string;
  currentVersion: string;
  releasesLast90Days: number;
  releasesLast365Days: number;
  avgDaysBetweenReleases: number;
  velocityBand: VelocityBand;
  trend: 'accelerating' | 'stable' | 'decelerating';
  flags: string[];
}

export interface ChangelogVelocitySummary {
  total: number;
  rapid: number;
  active: number;
  moderate: number;
  slow: number;
  stagnant: number;
}

export function classifyVelocityBand(avgDays: number): VelocityBand {
  if (avgDays <= 7) return 'rapid';
  if (avgDays <= 30) return 'active';
  if (avgDays <= 90) return 'moderate';
  if (avgDays <= 180) return 'slow';
  return 'stagnant';
}

export function calcAvgDaysBetween(dates: Date[]): number {
  if (dates.length < 2) return Infinity;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].getTime() - sorted[i - 1].getTime()) / 86_400_000);
  }
  return gaps.reduce((s, g) => s + g, 0) / gaps.length;
}

export function detectTrend(
  releasesLast90: number,
  releasesLast365: number
): 'accelerating' | 'stable' | 'decelerating' {
  const expectedQuarter = releasesLast365 / 4;
  if (releasesLast90 > expectedQuarter * 1.3) return 'accelerating';
  if (releasesLast90 < expectedQuarter * 0.7) return 'decelerating';
  return 'stable';
}

export function buildVelocityEntry(
  pkg: PackageInfo,
  releaseDates: Date[]
): ChangelogVelocityEntry {
  const now = Date.now();
  const ms90 = 90 * 86_400_000;
  const ms365 = 365 * 86_400_000;

  const releasesLast90Days = releaseDates.filter(
    (d) => now - d.getTime() <= ms90
  ).length;
  const releasesLast365Days = releaseDates.filter(
    (d) => now - d.getTime() <= ms365
  ).length;

  const avgDaysBetweenReleases = calcAvgDaysBetween(releaseDates);
  const velocityBand = classifyVelocityBand(
    isFinite(avgDaysBetweenReleases) ? avgDaysBetweenReleases : 999
  );
  const trend = detectTrend(releasesLast90Days, releasesLast365Days);

  const flags: string[] = [];
  if (velocityBand === 'rapid') flags.push('very frequent releases — review changelog carefully');
  if (velocityBand === 'stagnant') flags.push('no recent releases detected');
  if (trend === 'decelerating') flags.push('release pace is slowing down');
  if (trend === 'accelerating') flags.push('release pace is accelerating');

  return {
    name: pkg.name,
    currentVersion: pkg.version,
    releasesLast90Days,
    releasesLast365Days,
    avgDaysBetweenReleases: isFinite(avgDaysBetweenReleases)
      ? Math.round(avgDaysBetweenReleases)
      : -1,
    velocityBand,
    trend,
    flags,
  };
}

export function analyzeChangelogVelocity(
  packages: Array<{ pkg: PackageInfo; releaseDates: Date[] }>
): ChangelogVelocityEntry[] {
  return packages.map(({ pkg, releaseDates }) =>
    buildVelocityEntry(pkg, releaseDates)
  );
}

export function summarizeVelocity(
  entries: ChangelogVelocityEntry[]
): ChangelogVelocitySummary {
  return entries.reduce<ChangelogVelocitySummary>(
    (acc, e) => {
      acc.total++;
      acc[e.velocityBand]++;
      return acc;
    },
    { total: 0, rapid: 0, active: 0, moderate: 0, slow: 0, stagnant: 0 }
  );
}
