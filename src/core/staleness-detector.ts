import semver from 'semver';
import { Dependency } from '../types';

export interface StalenessEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  daysSinceRelease: number;
  majorsBehind: number;
  minorsBehind: number;
  patchesBehind: number;
  stalenessScore: number;
  label: 'current' | 'stale' | 'very-stale' | 'ancient';
}

export interface StalenessSummary {
  total: number;
  current: number;
  stale: number;
  verystale: number;
  ancient: number;
}

export function classifyStaleness(
  daysSince: number,
  majorsBehind: number
): StalenessEntry['label'] {
  if (majorsBehind >= 3 || daysSince > 730) return 'ancient';
  if (majorsBehind >= 1 || daysSince > 365) return 'very-stale';
  if (daysSince > 90) return 'stale';
  return 'current';
}

export function calcStalenessScore(
  daysSince: number,
  majorsBehind: number,
  minorsBehind: number
): number {
  const dayScore = Math.min(daysSince / 730, 1) * 50;
  const majorScore = Math.min(majorsBehind * 15, 40);
  const minorScore = Math.min(minorsBehind * 2, 10);
  return Math.round(dayScore + majorScore + minorScore);
}

export function buildStalenessEntry(
  dep: Dependency,
  latestVersion: string,
  publishedAt: string
): StalenessEntry {
  const current = semver.coerce(dep.version)?.version ?? dep.version;
  const latest = semver.coerce(latestVersion)?.version ?? latestVersion;
  const published = new Date(publishedAt);
  const daysSinceRelease = Math.floor(
    (Date.now() - published.getTime()) / 86_400_000
  );
  const majorsBehind = Math.max(
    (semver.major(latest) || 0) - (semver.major(current) || 0),
    0
  );
  const minorsBehind = Math.max(
    (semver.minor(latest) || 0) - (semver.minor(current) || 0),
    0
  );
  const patchesBehind = Math.max(
    (semver.patch(latest) || 0) - (semver.patch(current) || 0),
    0
  );
  const stalenessScore = calcStalenessScore(daysSinceRelease, majorsBehind, minorsBehind);
  const label = classifyStaleness(daysSinceRelease, majorsBehind);
  return {
    name: dep.name,
    currentVersion: current,
    latestVersion: latest,
    daysSinceRelease,
    majorsBehind,
    minorsBehind,
    patchesBehind,
    stalenessScore,
    label,
  };
}

export function detectStaleness(
  deps: Dependency[],
  latestMap: Record<string, { version: string; publishedAt: string }>
): StalenessEntry[] {
  return deps
    .filter((d) => latestMap[d.name])
    .map((d) => buildStalenessEntry(d, latestMap[d.name].version, latestMap[d.name].publishedAt))
    .sort((a, b) => b.stalenessScore - a.stalenessScore);
}

export function summarizeStaleness(entries: StalenessEntry[]): StalenessSummary {
  const summary: StalenessSummary = { total: entries.length, current: 0, stale: 0, verystale: 0, ancient: 0 };
  for (const e of entries) {
    if (e.label === 'current') summary.current++;
    else if (e.label === 'stale') summary.stale++;
    else if (e.label === 'very-stale') summary.verystale++;
    else summary.ancient++;
  }
  return summary;
}
