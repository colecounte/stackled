import { ParsedDependency } from '../types';

export interface InsightEntry {
  name: string;
  version: string;
  insights: string[];
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface InsightsSummary {
  total: number;
  healthy: number;
  warnings: number;
  critical: number;
}

export function gradeFromInsightScore(score: number): InsightEntry['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function buildInsights(dep: ParsedDependency, registryMeta: Record<string, unknown>): string[] {
  const insights: string[] = [];
  const version = String(registryMeta.version ?? dep.version);
  const deprecated = Boolean(registryMeta.deprecated);
  const weeklyDownloads = Number(registryMeta.weeklyDownloads ?? 0);
  const lastPublish = registryMeta.lastPublish ? new Date(String(registryMeta.lastPublish)) : null;

  if (deprecated) insights.push('Package is deprecated');
  if (weeklyDownloads < 1000) insights.push('Low download count (<1k/week)');
  if (weeklyDownloads > 1_000_000) insights.push('Highly popular (>1M downloads/week)');
  if (lastPublish) {
    const daysSince = Math.floor((Date.now() - lastPublish.getTime()) / 86_400_000);
    if (daysSince > 365) insights.push(`No release in ${daysSince} days`);
    else if (daysSince < 30) insights.push('Recently updated');
  }
  if (version.startsWith('0.')) insights.push('Pre-1.0 — API may be unstable');

  return insights;
}

export function calcInsightScore(insights: string[], meta: Record<string, unknown>): number {
  let score = 100;
  if (insights.some(i => i.includes('deprecated'))) score -= 40;
  if (insights.some(i => i.includes('No release'))) score -= 25;
  if (insights.some(i => i.includes('Low download'))) score -= 15;
  if (insights.some(i => i.includes('Pre-1.0'))) score -= 10;
  if (Boolean(meta.hasTypes)) score += 5;
  return Math.max(0, Math.min(100, score));
}

export function buildInsightEntry(
  dep: ParsedDependency,
  meta: Record<string, unknown>
): InsightEntry {
  const insights = buildInsights(dep, meta);
  const score = calcInsightScore(insights, meta);
  return {
    name: dep.name,
    version: dep.version,
    insights,
    score,
    grade: gradeFromInsightScore(score),
  };
}

export function summarizeInsights(entries: InsightEntry[]): InsightsSummary {
  return {
    total: entries.length,
    healthy: entries.filter(e => e.grade === 'A' || e.grade === 'B').length,
    warnings: entries.filter(e => e.grade === 'C' || e.grade === 'D').length,
    critical: entries.filter(e => e.grade === 'F').length,
  };
}
