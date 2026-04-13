import semver from 'semver';
import type { DependencyInfo } from '../types/index.js';

export interface ChurnEntry {
  name: string;
  currentVersion: string;
  releaseCount: number;
  majorCount: number;
  minorCount: number;
  patchCount: number;
  churnScore: number;
  churnLevel: 'low' | 'moderate' | 'high' | 'extreme';
  avgDaysBetweenReleases: number;
}

export interface ChurnSummary {
  total: number;
  highChurn: number;
  avgChurnScore: number;
  mostChurned: string | null;
}

export function classifyChurnLevel(score: number): ChurnEntry['churnLevel'] {
  if (score >= 80) return 'extreme';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

export function calcChurnScore(
  releaseCount: number,
  majorCount: number,
  avgDaysBetweenReleases: number
): number {
  const frequencyScore = Math.min(40, (365 / Math.max(avgDaysBetweenReleases, 1)) * 4);
  const volumeScore = Math.min(40, releaseCount * 1.5);
  const breakingScore = Math.min(20, majorCount * 5);
  return Math.round(frequencyScore + volumeScore + breakingScore);
}

export function buildChurnEntry(
  dep: DependencyInfo,
  versions: string[],
  publishDates: Record<string, string>
): ChurnEntry {
  const sorted = versions
    .filter((v) => semver.valid(v))
    .sort((a, b) => semver.compare(a, b));

  let majorCount = 0;
  let minorCount = 0;
  let patchCount = 0;

  for (let i = 1; i < sorted.length; i++) {
    const diff = semver.diff(sorted[i - 1], sorted[i]);
    if (diff === 'major') majorCount++;
    else if (diff === 'minor') minorCount++;
    else patchCount++;
  }

  const dates = sorted
    .map((v) => publishDates[v])
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);

  let avgDays = 30;
  if (dates.length > 1) {
    const spans = dates.slice(1).map((d, i) => (d - dates[i]) / 86400000);
    avgDays = Math.round(spans.reduce((s, x) => s + x, 0) / spans.length);
  }

  const churnScore = calcChurnScore(sorted.length, majorCount, avgDays);

  return {
    name: dep.name,
    currentVersion: dep.currentVersion,
    releaseCount: sorted.length,
    majorCount,
    minorCount,
    patchCount,
    churnScore,
    churnLevel: classifyChurnLevel(churnScore),
    avgDaysBetweenReleases: avgDays,
  };
}

export function analyzeChurn(
  deps: DependencyInfo[],
  versionsMap: Record<string, string[]>,
  publishDatesMap: Record<string, Record<string, string>>
): ChurnEntry[] {
  return deps.map((dep) =>
    buildChurnEntry(dep, versionsMap[dep.name] ?? [], publishDatesMap[dep.name] ?? {})
  );
}

export function summarizeChurn(entries: ChurnEntry[]): ChurnSummary {
  const highChurn = entries.filter((e) => e.churnLevel === 'high' || e.churnLevel === 'extreme').length;
  const avgChurnScore =
    entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + e.churnScore, 0) / entries.length)
      : 0;
  const mostChurned = entries.length > 0
    ? entries.reduce((a, b) => (b.churnScore > a.churnScore ? b : a)).name
    : null;
  return { total: entries.length, highChurn, avgChurnScore, mostChurned };
}
