import { PackageInfo } from '../types';

export type ChangelogHealthStatus = 'healthy' | 'stale' | 'missing' | 'sparse';

export interface ChangelogHealthEntry {
  name: string;
  version: string;
  status: ChangelogHealthStatus;
  hasChangelog: boolean;
  lastEntryDaysAgo: number | null;
  entryCount: number;
  score: number;
  flags: string[];
}

export interface ChangelogHealthSummary {
  total: number;
  healthy: number;
  stale: number;
  missing: number;
  sparse: number;
  averageScore: number;
}

export function classifyHealthStatus(
  hasChangelog: boolean,
  lastEntryDaysAgo: number | null,
  entryCount: number
): ChangelogHealthStatus {
  if (!hasChangelog) return 'missing';
  if (entryCount < 3) return 'sparse';
  if (lastEntryDaysAgo !== null && lastEntryDaysAgo > 365) return 'stale';
  return 'healthy';
}

export function calcHealthScore(
  hasChangelog: boolean,
  lastEntryDaysAgo: number | null,
  entryCount: number
): number {
  if (!hasChangelog) return 0;
  let score = 50;
  if (entryCount >= 10) score += 20;
  else if (entryCount >= 3) score += 10;
  if (lastEntryDaysAgo !== null) {
    if (lastEntryDaysAgo <= 90) score += 30;
    else if (lastEntryDaysAgo <= 180) score += 15;
    else if (lastEntryDaysAgo <= 365) score += 5;
  }
  return Math.min(score, 100);
}

export function buildHealthFlags(
  hasChangelog: boolean,
  lastEntryDaysAgo: number | null,
  entryCount: number
): string[] {
  const flags: string[] = [];
  if (!hasChangelog) flags.push('no-changelog');
  if (entryCount < 3) flags.push('sparse-entries');
  if (lastEntryDaysAgo !== null && lastEntryDaysAgo > 365) flags.push('stale-changelog');
  if (lastEntryDaysAgo !== null && lastEntryDaysAgo > 180) flags.push('not-recently-updated');
  return flags;
}

export function buildHealthEntry(
  pkg: PackageInfo,
  lastEntryDaysAgo: number | null,
  entryCount: number
): ChangelogHealthEntry {
  const hasChangelog = entryCount > 0;
  return {
    name: pkg.name,
    version: pkg.version,
    status: classifyHealthStatus(hasChangelog, lastEntryDaysAgo, entryCount),
    hasChangelog,
    lastEntryDaysAgo,
    entryCount,
    score: calcHealthScore(hasChangelog, lastEntryDaysAgo, entryCount),
    flags: buildHealthFlags(hasChangelog, lastEntryDaysAgo, entryCount),
  };
}

export function summarizeChangelogHealth(entries: ChangelogHealthEntry[]): ChangelogHealthSummary {
  const total = entries.length;
  const averageScore = total > 0 ? Math.round(entries.reduce((s, e) => s + e.score, 0) / total) : 0;
  return {
    total,
    healthy: entries.filter(e => e.status === 'healthy').length,
    stale: entries.filter(e => e.status === 'stale').length,
    missing: entries.filter(e => e.status === 'missing').length,
    sparse: entries.filter(e => e.status === 'sparse').length,
    averageScore,
  };
}
