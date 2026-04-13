import semver from 'semver';
import type { ParsedDependency } from '../types/index.js';

export interface FreshnessIndexEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  versionsBehind: number;
  daysSinceRelease: number;
  freshnessScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface FreshnessIndexSummary {
  averageScore: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalPackages: number;
  freshCount: number;
  staleCount: number;
}

export function calcFreshnessScore(versionsBehind: number, daysSinceRelease: number): number {
  const versionPenalty = Math.min(versionsBehind * 8, 50);
  const agePenalty = Math.min(Math.floor(daysSinceRelease / 30) * 3, 50);
  return Math.max(0, 100 - versionPenalty - agePenalty);
}

export function gradeFromFreshnessScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function countVersionsBehind(current: string, available: string[]): number {
  const coerced = semver.coerce(current);
  if (!coerced) return 0;
  return available.filter(v => {
    const c = semver.coerce(v);
    return c && semver.gt(c, coerced);
  }).length;
}

export function buildFreshnessIndexEntry(
  dep: ParsedDependency,
  latestVersion: string,
  availableVersions: string[],
  latestPublishedAt: Date
): FreshnessIndexEntry {
  const daysSinceRelease = Math.floor(
    (Date.now() - latestPublishedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const versionsBehind = countVersionsBehind(dep.version, availableVersions);
  const freshnessScore = calcFreshnessScore(versionsBehind, daysSinceRelease);
  return {
    name: dep.name,
    currentVersion: dep.version,
    latestVersion,
    versionsBehind,
    daysSinceRelease,
    freshnessScore,
    grade: gradeFromFreshnessScore(freshnessScore),
  };
}

export function buildFreshnessIndex(entries: FreshnessIndexEntry[]): FreshnessIndexSummary {
  if (entries.length === 0) {
    return { averageScore: 100, overallGrade: 'A', totalPackages: 0, freshCount: 0, staleCount: 0 };
  }
  const averageScore = Math.round(
    entries.reduce((sum, e) => sum + e.freshnessScore, 0) / entries.length
  );
  return {
    averageScore,
    overallGrade: gradeFromFreshnessScore(averageScore),
    totalPackages: entries.length,
    freshCount: entries.filter(e => e.grade === 'A' || e.grade === 'B').length,
    staleCount: entries.filter(e => e.grade === 'D' || e.grade === 'F').length,
  };
}
