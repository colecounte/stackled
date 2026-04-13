import { PackageInfo } from '../types';

export interface UpdateHistoryEntry {
  name: string;
  currentVersion: string;
  previousVersion: string;
  updatedAt: string;
  daysSinceUpdate: number;
  updateType: 'major' | 'minor' | 'patch' | 'unknown';
  isFrequentlyUpdated: boolean;
}

export interface UpdateHistorySummary {
  total: number;
  frequentlyUpdated: number;
  majorUpdates: number;
  averageDaysSinceUpdate: number;
}

export function classifyUpdateType(
  current: string,
  previous: string
): UpdateHistoryEntry['updateType'] {
  const [curMajor, curMinor] = current.replace(/^[^\d]*/, '').split('.').map(Number);
  const [prevMajor, prevMinor] = previous.replace(/^[^\d]*/, '').split('.').map(Number);
  if (isNaN(curMajor) || isNaN(prevMajor)) return 'unknown';
  if (curMajor !== prevMajor) return 'major';
  if (curMinor !== prevMinor) return 'minor';
  return 'patch';
}

export function calcDaysSinceUpdate(updatedAt: string): number {
  const updated = new Date(updatedAt);
  if (isNaN(updated.getTime())) return -1;
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildUpdateHistoryEntry(
  pkg: PackageInfo,
  previousVersion: string
): UpdateHistoryEntry {
  const updatedAt = pkg.time?.modified ?? '';
  const daysSinceUpdate = calcDaysSinceUpdate(updatedAt);
  const updateType = classifyUpdateType(pkg.version, previousVersion);
  return {
    name: pkg.name,
    currentVersion: pkg.version,
    previousVersion,
    updatedAt,
    daysSinceUpdate,
    updateType,
    isFrequentlyUpdated: daysSinceUpdate >= 0 && daysSinceUpdate <= 30,
  };
}

export function analyzeUpdateHistory(
  packages: PackageInfo[],
  previousVersionMap: Record<string, string>
): UpdateHistoryEntry[] {
  return packages
    .filter((pkg) => previousVersionMap[pkg.name] !== undefined)
    .map((pkg) => buildUpdateHistoryEntry(pkg, previousVersionMap[pkg.name]));
}

export function summarizeUpdateHistory(
  entries: UpdateHistoryEntry[]
): UpdateHistorySummary {
  const total = entries.length;
  const frequentlyUpdated = entries.filter((e) => e.isFrequentlyUpdated).length;
  const majorUpdates = entries.filter((e) => e.updateType === 'major').length;
  const validDays = entries.filter((e) => e.daysSinceUpdate >= 0);
  const averageDaysSinceUpdate =
    validDays.length > 0
      ? Math.round(
          validDays.reduce((sum, e) => sum + e.daysSinceUpdate, 0) / validDays.length
        )
      : 0;
  return { total, frequentlyUpdated, majorUpdates, averageDaysSinceUpdate };
}
