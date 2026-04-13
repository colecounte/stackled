import { PackageInfo } from '../types';

export interface ReputationEntry {
  name: string;
  version: string;
  weeklyDownloads: number;
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  flags: string[];
}

export interface ReputationSummary {
  total: number;
  highReputation: number;
  lowReputation: number;
  unknown: number;
}

export function gradeFromReputationScore(score: number): ReputationEntry['grade'] {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

export function calcReputationScore(
  weeklyDownloads: number,
  stars: number | null,
  openIssues: number | null
): number {
  let score = 0;

  if (weeklyDownloads >= 1_000_000) score += 40;
  else if (weeklyDownloads >= 100_000) score += 30;
  else if (weeklyDownloads >= 10_000) score += 20;
  else if (weeklyDownloads >= 1_000) score += 10;

  if (stars !== null) {
    if (stars >= 10_000) score += 40;
    else if (stars >= 1_000) score += 30;
    else if (stars >= 100) score += 20;
    else if (stars >= 10) score += 10;
  }

  if (openIssues !== null && openIssues > 500) score = Math.max(0, score - 10);

  return Math.min(100, score);
}

export function buildReputationFlags(
  weeklyDownloads: number,
  stars: number | null
): string[] {
  const flags: string[] = [];
  if (weeklyDownloads < 1_000) flags.push('low-downloads');
  if (stars !== null && stars < 10) flags.push('low-stars');
  if (stars === null) flags.push('no-repo-data');
  return flags;
}

export function buildReputationEntry(
  pkg: PackageInfo,
  weeklyDownloads: number,
  stars: number | null,
  forks: number | null,
  openIssues: number | null
): ReputationEntry {
  const score = calcReputationScore(weeklyDownloads, stars, openIssues);
  return {
    name: pkg.name,
    version: pkg.version,
    weeklyDownloads,
    stars,
    forks,
    openIssues,
    score,
    grade: gradeFromReputationScore(score),
    flags: buildReputationFlags(weeklyDownloads, stars),
  };
}

export function summarizeReputation(entries: ReputationEntry[]): ReputationSummary {
  return {
    total: entries.length,
    highReputation: entries.filter((e) => e.grade === 'A' || e.grade === 'B').length,
    lowReputation: entries.filter((e) => e.grade === 'D' || e.grade === 'F').length,
    unknown: entries.filter((e) => e.flags.includes('no-repo-data')).length,
  };
}
