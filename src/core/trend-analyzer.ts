import { DependencyInfo } from '../types';

export interface TrendPoint {
  date: string;
  version: string;
  downloads?: number;
}

export interface TrendSummary {
  packageName: string;
  releaseFrequency: 'high' | 'medium' | 'low' | 'stale';
  daysSinceLastRelease: number;
  releasesLast90Days: number;
  trend: 'accelerating' | 'steady' | 'slowing' | 'abandoned';
  averageDaysBetweenReleases: number;
}

export function classifyReleaseFrequency(
  releasesLast90Days: number
): TrendSummary['releaseFrequency'] {
  if (releasesLast90Days >= 10) return 'high';
  if (releasesLast90Days >= 4) return 'medium';
  if (releasesLast90Days >= 1) return 'low';
  return 'stale';
}

export function calcAverageDaysBetweenReleases(points: TrendPoint[]): number {
  if (points.length < 2) return 0;
  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const first = new Date(sorted[0].date).getTime();
  const last = new Date(sorted[sorted.length - 1].date).getTime();
  const daySpan = (last - first) / (1000 * 60 * 60 * 24);
  return Math.round(daySpan / (sorted.length - 1));
}

export function determineTrend(
  recentReleases: number,
  olderReleases: number
): TrendSummary['trend'] {
  if (recentReleases === 0 && olderReleases === 0) return 'abandoned';
  if (recentReleases > olderReleases * 1.5) return 'accelerating';
  if (recentReleases < olderReleases * 0.5) return 'slowing';
  return 'steady';
}

export function analyzeTrend(
  dep: DependencyInfo,
  history: TrendPoint[]
): TrendSummary {
  const now = Date.now();
  const ms90 = 90 * 24 * 60 * 60 * 1000;
  const ms180 = 180 * 24 * 60 * 60 * 1000;

  const recent = history.filter(
    (p) => now - new Date(p.date).getTime() <= ms90
  );
  const older = history.filter((p) => {
    const age = now - new Date(p.date).getTime();
    return age > ms90 && age <= ms180;
  });

  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const daysSinceLastRelease = sorted.length
    ? Math.floor(
        (now - new Date(sorted[0].date).getTime()) / (1000 * 60 * 60 * 24)
      )
    : Infinity;

  return {
    packageName: dep.name,
    releaseFrequency: classifyReleaseFrequency(recent.length),
    daysSinceLastRelease,
    releasesLast90Days: recent.length,
    trend: determineTrend(recent.length, older.length),
    averageDaysBetweenReleases: calcAverageDaysBetweenReleases(history),
  };
}
