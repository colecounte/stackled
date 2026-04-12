import { ChangelogSummary } from '../types';

export interface RankedChangelogEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  impactScore: number;
  impactLabel: 'critical' | 'high' | 'medium' | 'low';
  reasons: string[];
  summary: ChangelogSummary;
}

export function calcImpactScore(summary: ChangelogSummary): number {
  let score = 0;
  if (summary.hasSecurityFixes) score += 40;
  if (summary.hasDeprecationNotices) score += 20;
  const breaking = summary.highlights.filter(h =>
    /breaking/i.test(h)
  ).length;
  score += breaking * 15;
  score += Math.min(summary.totalChanges * 2, 20);
  return Math.min(score, 100);
}

export function classifyImpact(
  score: number
): RankedChangelogEntry['impactLabel'] {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

export function buildReasons(summary: ChangelogSummary): string[] {
  const reasons: string[] = [];
  if (summary.hasSecurityFixes) reasons.push('Contains security fixes');
  if (summary.hasDeprecationNotices) reasons.push('Includes deprecation notices');
  const breaking = summary.highlights.filter(h => /breaking/i.test(h));
  if (breaking.length > 0)
    reasons.push(`${breaking.length} breaking change(s) detected`);
  if (summary.totalChanges > 10)
    reasons.push(`High change volume (${summary.totalChanges} changes)`);
  return reasons;
}

export function rankChangelogImpacts(
  entries: Array<{
    name: string;
    currentVersion: string;
    latestVersion: string;
    summary: ChangelogSummary;
  }>
): RankedChangelogEntry[] {
  return entries
    .map(entry => {
      const impactScore = calcImpactScore(entry.summary);
      return {
        ...entry,
        impactScore,
        impactLabel: classifyImpact(impactScore),
        reasons: buildReasons(entry.summary),
      };
    })
    .sort((a, b) => b.impactScore - a.impactScore);
}
