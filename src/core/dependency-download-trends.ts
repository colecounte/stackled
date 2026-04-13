import { PackageInfo } from '../types';

export type TrendDirection = 'rising' | 'stable' | 'declining' | 'unknown';

export interface DownloadTrendEntry {
  name: string;
  currentVersion: string;
  weeklyDownloads: number;
  monthlyDownloads: number;
  trend: TrendDirection;
  trendPercent: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface DownloadTrendSummary {
  total: number;
  rising: number;
  stable: number;
  declining: number;
  unknown: number;
}

export function classifyTrend(weeklyDownloads: number, monthlyDownloads: number): TrendDirection {
  if (weeklyDownloads === 0 || monthlyDownloads === 0) return 'unknown';
  const weeklyRate = weeklyDownloads * 4;
  const diff = (weeklyRate - monthlyDownloads) / monthlyDownloads;
  if (diff > 0.1) return 'rising';
  if (diff < -0.1) return 'declining';
  return 'stable';
}

export function calcTrendPercent(weeklyDownloads: number, monthlyDownloads: number): number {
  if (monthlyDownloads === 0) return 0;
  const weeklyRate = weeklyDownloads * 4;
  return Math.round(((weeklyRate - monthlyDownloads) / monthlyDownloads) * 100);
}

export function gradeFromDownloads(weeklyDownloads: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (weeklyDownloads >= 1_000_000) return 'A';
  if (weeklyDownloads >= 100_000) return 'B';
  if (weeklyDownloads >= 10_000) return 'C';
  if (weeklyDownloads >= 1_000) return 'D';
  return 'F';
}

export function buildDownloadTrendEntry(
  pkg: PackageInfo,
  weeklyDownloads: number,
  monthlyDownloads: number
): DownloadTrendEntry {
  const trend = classifyTrend(weeklyDownloads, monthlyDownloads);
  return {
    name: pkg.name,
    currentVersion: pkg.currentVersion,
    weeklyDownloads,
    monthlyDownloads,
    trend,
    trendPercent: calcTrendPercent(weeklyDownloads, monthlyDownloads),
    grade: gradeFromDownloads(weeklyDownloads),
  };
}

export function analyzeDownloadTrends(
  packages: PackageInfo[],
  stats: Map<string, { weekly: number; monthly: number }>
): DownloadTrendEntry[] {
  return packages.map((pkg) => {
    const s = stats.get(pkg.name) ?? { weekly: 0, monthly: 0 };
    return buildDownloadTrendEntry(pkg, s.weekly, s.monthly);
  });
}

export function summarizeDownloadTrends(entries: DownloadTrendEntry[]): DownloadTrendSummary {
  const summary: DownloadTrendSummary = { total: entries.length, rising: 0, stable: 0, declining: 0, unknown: 0 };
  for (const e of entries) summary[e.trend]++;
  return summary;
}
