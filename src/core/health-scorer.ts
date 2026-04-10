import { PackageHealth, MaintainerStatus, TrendResult, OutdatedEntry, VulnerabilitySummary } from '../types';

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthScore {
  package: string;
  score: number;
  grade: HealthGrade;
  breakdown: HealthBreakdown;
}

export interface HealthBreakdown {
  maintenance: number;
  security: number;
  freshness: number;
  popularity: number;
}

export function gradeFromScore(score: number): HealthGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function scoreMaintenance(status: MaintainerStatus): number {
  if (status.isAbandoned) return 0;
  if (status.daysSinceLastPublish > 730) return 20;
  if (status.daysSinceLastPublish > 365) return 50;
  if (status.daysSinceLastPublish > 180) return 75;
  return 100;
}

export function scoreSecurity(vulns: VulnerabilitySummary): number {
  if (vulns.critical > 0) return 0;
  if (vulns.high > 0) return 20;
  if (vulns.moderate > 0) return 60;
  if (vulns.low > 0) return 85;
  return 100;
}

export function scoreFreshness(entry: OutdatedEntry | null): number {
  if (!entry) return 100;
  if (entry.updateType === 'major') return 40;
  if (entry.updateType === 'minor') return 70;
  if (entry.updateType === 'patch') return 90;
  return 100;
}

export function scorePopularity(weeklyDownloads: number): number {
  if (weeklyDownloads >= 1_000_000) return 100;
  if (weeklyDownloads >= 100_000) return 85;
  if (weeklyDownloads >= 10_000) return 65;
  if (weeklyDownloads >= 1_000) return 45;
  return 25;
}

export function computeHealthScore(
  packageName: string,
  maintainer: MaintainerStatus,
  vulns: VulnerabilitySummary,
  outdated: OutdatedEntry | null,
  weeklyDownloads: number
): HealthScore {
  const breakdown: HealthBreakdown = {
    maintenance: scoreMaintenance(maintainer),
    security: scoreSecurity(vulns),
    freshness: scoreFreshness(outdated),
    popularity: scorePopularity(weeklyDownloads),
  };

  const score = Math.round(
    breakdown.maintenance * 0.35 +
    breakdown.security * 0.30 +
    breakdown.freshness * 0.20 +
    breakdown.popularity * 0.15
  );

  return {
    package: packageName,
    score,
    grade: gradeFromScore(score),
    breakdown,
  };
}
