import { Dependency } from '../types';

export interface DependencyAgeEntry {
  name: string;
  currentVersion: string;
  publishedAt: Date | null;
  ageInDays: number | null;
  ageLabel: string;
  risk: 'low' | 'medium' | 'high';
}

export interface AgeSummary {
  total: number;
  ancient: number;   // > 2 years
  stale: number;     // 1–2 years
  fresh: number;     // < 1 year
}

export function calcAgeInDays(publishedAt: Date | null): number | null {
  if (!publishedAt) return null;
  return Math.floor((Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
}

export function classifyAgeRisk(ageInDays: number | null): 'low' | 'medium' | 'high' {
  if (ageInDays === null) return 'medium';
  if (ageInDays > 730) return 'high';
  if (ageInDays > 365) return 'medium';
  return 'low';
}

export function formatAgeLabel(ageInDays: number | null): string {
  if (ageInDays === null) return 'unknown';
  if (ageInDays < 30) return `${ageInDays}d`;
  if (ageInDays < 365) return `${Math.floor(ageInDays / 30)}mo`;
  const years = Math.floor(ageInDays / 365);
  const months = Math.floor((ageInDays % 365) / 30);
  return months > 0 ? `${years}y ${months}mo` : `${years}y`;
}

export function buildAgeEntry(
  dep: Dependency,
  publishedAt: Date | null
): DependencyAgeEntry {
  const ageInDays = calcAgeInDays(publishedAt);
  return {
    name: dep.name,
    currentVersion: dep.currentVersion,
    publishedAt,
    ageInDays,
    ageLabel: formatAgeLabel(ageInDays),
    risk: classifyAgeRisk(ageInDays),
  };
}

export function analyzeDependencyAges(
  deps: Dependency[],
  publishDates: Record<string, Date | null>
): DependencyAgeEntry[] {
  return deps.map((dep) => buildAgeEntry(dep, publishDates[dep.name] ?? null));
}

export function summarizeAges(entries: DependencyAgeEntry[]): AgeSummary {
  return {
    total: entries.length,
    ancient: entries.filter((e) => e.risk === 'high').length,
    stale: entries.filter((e) => e.risk === 'medium').length,
    fresh: entries.filter((e) => e.risk === 'low').length,
  };
}
