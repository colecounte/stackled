import { PackageInfo } from '../types';

export interface ActivityEntry {
  name: string;
  version: string;
  lastCommitDaysAgo: number | null;
  openIssues: number | null;
  closedIssues: number | null;
  issueResolutionRate: number | null;
  stars: number | null;
  activityScore: number;
  activityGrade: string;
  flags: string[];
}

export interface ActivitySummary {
  total: number;
  inactive: number;
  healthy: number;
  averageScore: number;
}

export function gradeFromActivityScore(score: number): string {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function calcActivityScore(
  lastCommitDaysAgo: number | null,
  openIssues: number | null,
  closedIssues: number | null,
  stars: number | null
): number {
  let score = 100;

  if (lastCommitDaysAgo === null) {
    score -= 40;
  } else if (lastCommitDaysAgo > 730) {
    score -= 40;
  } else if (lastCommitDaysAgo > 365) {
    score -= 25;
  } else if (lastCommitDaysAgo > 180) {
    score -= 10;
  }

  if (openIssues !== null && closedIssues !== null) {
    const total = openIssues + closedIssues;
    const rate = total > 0 ? closedIssues / total : 0;
    if (rate < 0.3) score -= 20;
    else if (rate < 0.6) score -= 10;
  } else {
    score -= 10;
  }

  if (stars === null || stars < 10) score -= 15;
  else if (stars < 100) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export function buildActivityFlags(
  lastCommitDaysAgo: number | null,
  issueResolutionRate: number | null,
  stars: number | null
): string[] {
  const flags: string[] = [];
  if (lastCommitDaysAgo !== null && lastCommitDaysAgo > 365) flags.push('no-recent-commits');
  if (issueResolutionRate !== null && issueResolutionRate < 0.3) flags.push('low-issue-resolution');
  if (stars !== null && stars < 10) flags.push('low-stars');
  return flags;
}

export function buildActivityEntry(pkg: PackageInfo): ActivityEntry {
  const lastCommitDaysAgo = pkg.lastPublish
    ? Math.floor((Date.now() - new Date(pkg.lastPublish).getTime()) / 86_400_000)
    : null;
  const openIssues = (pkg as any).openIssues ?? null;
  const closedIssues = (pkg as any).closedIssues ?? null;
  const stars = (pkg as any).stars ?? null;
  const total = openIssues !== null && closedIssues !== null ? openIssues + closedIssues : null;
  const issueResolutionRate = total !== null && total > 0 ? (closedIssues! / total) : null;
  const activityScore = calcActivityScore(lastCommitDaysAgo, openIssues, closedIssues, stars);
  return {
    name: pkg.name,
    version: pkg.version,
    lastCommitDaysAgo,
    openIssues,
    closedIssues,
    issueResolutionRate,
    stars,
    activityScore,
    activityGrade: gradeFromActivityScore(activityScore),
    flags: buildActivityFlags(lastCommitDaysAgo, issueResolutionRate, stars),
  };
}

export function checkDependencyActivity(packages: PackageInfo[]): ActivityEntry[] {
  return packages.map(buildActivityEntry);
}

export function summarizeActivity(entries: ActivityEntry[]): ActivitySummary {
  const inactive = entries.filter(e => e.activityGrade === 'D' || e.activityGrade === 'F').length;
  const healthy = entries.filter(e => e.activityGrade === 'A' || e.activityGrade === 'B').length;
  const averageScore = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + e.activityScore, 0) / entries.length)
    : 0;
  return { total: entries.length, inactive, healthy, averageScore };
}
