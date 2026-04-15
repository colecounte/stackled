import type { PublishFrequencyEntry } from '../types';

export interface PublishFrequencyReport {
  entries: PublishFrequencyEntry[];
  totalPackages: number;
  highFrequencyCount: number;
  lowFrequencyCount: number;
  dormantCount: number;
  averageAvgDaysBetween: number;
  overallBand: string;
}

export function calcAverageDaysBetweenAll(entries: PublishFrequencyEntry[]): number {
  if (entries.length === 0) return 0;
  const sum = entries.reduce((acc, e) => acc + e.avgDaysBetweenReleases, 0);
  return Math.round(sum / entries.length);
}

export function countByBand(entries: PublishFrequencyEntry[], band: string): number {
  return entries.filter((e) => e.frequencyBand === band).length;
}

export function deriveOverallBand(entries: PublishFrequencyEntry[]): string {
  const dormant = countByBand(entries, 'dormant');
  const low = countByBand(entries, 'low');
  const high = countByBand(entries, 'high');
  if (dormant / entries.length > 0.4) return 'dormant';
  if (high / entries.length > 0.5) return 'high';
  if (low / entries.length > 0.4) return 'low';
  return 'moderate';
}

export function buildPublishFrequencyReport(
  entries: PublishFrequencyEntry[]
): PublishFrequencyReport {
  return {
    entries,
    totalPackages: entries.length,
    highFrequencyCount: countByBand(entries, 'high'),
    lowFrequencyCount: countByBand(entries, 'low'),
    dormantCount: countByBand(entries, 'dormant'),
    averageAvgDaysBetween: calcAverageDaysBetweenAll(entries),
    overallBand: deriveOverallBand(entries),
  };
}

export function formatPublishFrequencyReportAsText(report: PublishFrequencyReport): string {
  const lines: string[] = [
    `Publish Frequency Report`,
    `========================`,
    `Total packages : ${report.totalPackages}`,
    `High frequency : ${report.highFrequencyCount}`,
    `Low frequency  : ${report.lowFrequencyCount}`,
    `Dormant        : ${report.dormantCount}`,
    `Avg days/release: ${report.averageAvgDaysBetween}`,
    `Overall band   : ${report.overallBand}`,
  ];
  return lines.join('\n');
}

export function formatPublishFrequencyReportAsJson(report: PublishFrequencyReport): string {
  return JSON.stringify(report, null, 2);
}
