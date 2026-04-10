import { ChangelogSummary } from '../types';

export interface ChangelogDiff {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  addedHighlights: string[];
  removedHighlights: string[];
  securityDelta: number;
  breakingDelta: number;
  totalChangeDelta: number;
}

export function diffChangelogs(
  packageName: string,
  fromVersion: string,
  toVersion: string,
  before: ChangelogSummary,
  after: ChangelogSummary
): ChangelogDiff {
  const addedHighlights = after.highlights.filter(
    (h) => !before.highlights.includes(h)
  );
  const removedHighlights = before.highlights.filter(
    (h) => !after.highlights.includes(h)
  );

  const securityDelta = (after.hasSecurityFixes ? 1 : 0) - (before.hasSecurityFixes ? 1 : 0);
  const breakingDelta = after.breakingChanges - before.breakingChanges;
  const totalChangeDelta = after.totalChanges - before.totalChanges;

  return {
    packageName,
    fromVersion,
    toVersion,
    addedHighlights,
    removedHighlights,
    securityDelta,
    breakingDelta,
    totalChangeDelta,
  };
}

export function classifyDiffSeverity(diff: ChangelogDiff): 'low' | 'medium' | 'high' | 'critical' {
  if (diff.securityDelta > 0) return 'critical';
  if (diff.breakingDelta > 0) return 'high';
  if (diff.totalChangeDelta > 10) return 'medium';
  return 'low';
}

export function formatDiffSummary(diff: ChangelogDiff): string {
  const parts: string[] = [];
  if (diff.securityDelta > 0) parts.push('security fixes added');
  if (diff.breakingDelta > 0) parts.push(`${diff.breakingDelta} new breaking change(s)`);
  if (diff.addedHighlights.length > 0)
    parts.push(`${diff.addedHighlights.length} new highlight(s)`);
  if (diff.totalChangeDelta !== 0)
    parts.push(`${diff.totalChangeDelta > 0 ? '+' : ''}${diff.totalChangeDelta} total changes`);
  return parts.length > 0 ? parts.join(', ') : 'no significant changes';
}
