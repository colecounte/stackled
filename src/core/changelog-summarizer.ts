import { ChangelogEntry } from '../types';

export interface ChangelogSummary {
  highlights: string[];
  hasSecurityFix: boolean;
  hasDeprecation: boolean;
  totalChanges: number;
  breakingCount: number;
}

export function extractHighlights(entries: ChangelogEntry[]): string[] {
  const highlights: string[] = [];
  for (const entry of entries.slice(0, 3)) {
    const top = entry.changes?.slice(0, 2) ?? [];
    highlights.push(...top);
  }
  return highlights.slice(0, 5);
}

export function hasSecurityFixes(entries: ChangelogEntry[]): boolean {
  return entries.some((e) =>
    e.changes?.some((c) => /security|vuln|cve|patch/i.test(c))
  );
}

export function hasDeprecationNotices(entries: ChangelogEntry[]): boolean {
  return entries.some((e) =>
    e.changes?.some((c) => /deprecat/i.test(c))
  );
}

export function countChanges(entries: ChangelogEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.changes?.length ?? 0), 0);
}

export function summarizeChangelog(changelog: {
  latestVersion?: string;
  entries: ChangelogEntry[];
}): ChangelogSummary {
  const { entries } = changelog;
  const breakingCount = entries.filter((e) => e.breaking).length;

  return {
    highlights: extractHighlights(entries),
    hasSecurityFix: hasSecurityFixes(entries),
    hasDeprecation: hasDeprecationNotices(entries),
    totalChanges: countChanges(entries),
    breakingCount,
  };
}
