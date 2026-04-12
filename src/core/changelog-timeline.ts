import { PackageInfo } from '../types';

export interface TimelineEntry {
  name: string;
  version: string;
  date: string;
  daysAgo: number;
  type: 'major' | 'minor' | 'patch' | 'unknown';
  summary: string;
}

export interface ChangelogTimeline {
  entries: TimelineEntry[];
  totalReleases: number;
  spanDays: number;
  mostActivePackage: string | null;
}

export function classifyVersionType(version: string): TimelineEntry['type'] {
  const parts = version.split('.');
  if (parts.length < 3) return 'unknown';
  const [major, minor] = parts;
  if (major !== '0' && minor === '0') return 'major';
  if (minor !== '0') return 'minor';
  return 'patch';
}

export function calcDaysAgo(dateStr: string): number {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return -1;
  const now = Date.now();
  return Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildTimelineEntry(
  pkg: PackageInfo,
  version: string,
  date: string
): TimelineEntry {
  return {
    name: pkg.name,
    version,
    date,
    daysAgo: calcDaysAgo(date),
    type: classifyVersionType(version),
    summary: `${pkg.name}@${version} released`,
  };
}

export function buildChangelogTimeline(
  packages: PackageInfo[]
): ChangelogTimeline {
  const entries: TimelineEntry[] = [];

  for (const pkg of packages) {
    const time = pkg.time as Record<string, string> | undefined;
    if (!time) continue;
    for (const [version, date] of Object.entries(time)) {
      if (version === 'created' || version === 'modified') continue;
      entries.push(buildTimelineEntry(pkg, version, date));
    }
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const spanDays =
    entries.length >= 2
      ? calcDaysAgo(entries[entries.length - 1].date)
      : 0;

  const countByPackage: Record<string, number> = {};
  for (const e of entries) {
    countByPackage[e.name] = (countByPackage[e.name] ?? 0) + 1;
  }

  const mostActivePackage =
    Object.keys(countByPackage).sort(
      (a, b) => countByPackage[b] - countByPackage[a]
    )[0] ?? null;

  return {
    entries,
    totalReleases: entries.length,
    spanDays,
    mostActivePackage,
  };
}
