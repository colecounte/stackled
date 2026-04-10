import { BreakingChange } from '../types';

export interface ChangelogSummary {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  breakingChanges: BreakingChange[];
  highlights: string[];
  totalChanges: number;
  hasDeprecations: boolean;
  hasSecurity: boolean;
}

export function extractHighlights(lines: string[]): string[] {
  const keywords = /feat|fix|perf|security|deprecat/i;
  return lines
    .filter((l) => keywords.test(l))
    .map((l) => l.replace(/^[-*#\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function hasSecurityFixes(lines: string[]): boolean {
  return lines.some((l) => /security|cve|vulnerability/i.test(l));
}

export function hasDeprecationNotices(lines: string[]): boolean {
  return lines.some((l) => /deprecat/i.test(l));
}

export function countChanges(lines: string[]): number {
  return lines.filter((l) => /^[-*]\s/.test(l.trim())).length;
}

export function summarizeChangelog(
  packageName: string,
  fromVersion: string,
  toVersion: string,
  rawChangelog: string,
  breakingChanges: BreakingChange[]
): ChangelogSummary {
  const lines = rawChangelog.split('\n');
  return {
    packageName,
    fromVersion,
    toVersion,
    breakingChanges,
    highlights: extractHighlights(lines),
    totalChanges: countChanges(lines),
    hasDeprecations: hasDeprecationNotices(lines),
    hasSecurity: hasSecurityFixes(lines),
  };
}
