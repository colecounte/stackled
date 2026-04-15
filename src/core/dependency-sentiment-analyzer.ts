import { PackageInfo } from '../types';

export type SentimentLevel = 'positive' | 'neutral' | 'negative' | 'critical';

export interface SentimentEntry {
  name: string;
  version: string;
  score: number;
  level: SentimentLevel;
  signals: string[];
}

export interface SentimentSummary {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  critical: number;
  averageScore: number;
}

export function classifySentiment(score: number): SentimentLevel {
  if (score >= 70) return 'positive';
  if (score >= 40) return 'neutral';
  if (score >= 15) return 'negative';
  return 'critical';
}

export function buildSentimentSignals(pkg: PackageInfo): string[] {
  const signals: string[] = [];
  if ((pkg.weeklyDownloads ?? 0) > 500_000) signals.push('high download volume');
  if ((pkg.openIssues ?? 0) > 200) signals.push('many open issues');
  if (pkg.deprecated) signals.push('package is deprecated');
  if ((pkg.daysSinceLastPublish ?? 0) > 365) signals.push('not updated in over a year');
  if ((pkg.stars ?? 0) > 1000) signals.push('strong community interest');
  if ((pkg.contributors ?? 0) < 2) signals.push('single maintainer risk');
  return signals;
}

export function calcSentimentScore(pkg: PackageInfo): number {
  let score = 50;
  const downloads = pkg.weeklyDownloads ?? 0;
  if (downloads > 1_000_000) score += 20;
  else if (downloads > 100_000) score += 10;
  else if (downloads < 1_000) score -= 15;
  if (pkg.deprecated) score -= 40;
  if ((pkg.daysSinceLastPublish ?? 0) > 365) score -= 20;
  if ((pkg.openIssues ?? 0) > 200) score -= 10;
  if ((pkg.stars ?? 0) > 1000) score += 10;
  if ((pkg.contributors ?? 0) < 2) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export function buildSentimentEntry(pkg: PackageInfo): SentimentEntry {
  const score = calcSentimentScore(pkg);
  return {
    name: pkg.name,
    version: pkg.version,
    score,
    level: classifySentiment(score),
    signals: buildSentimentSignals(pkg),
  };
}

export function analyzeSentiment(packages: PackageInfo[]): SentimentEntry[] {
  return packages.map(buildSentimentEntry);
}

export function summarizeSentiment(entries: SentimentEntry[]): SentimentSummary {
  const total = entries.length;
  const averageScore = total === 0 ? 0 : Math.round(entries.reduce((s, e) => s + e.score, 0) / total);
  return {
    total,
    positive: entries.filter(e => e.level === 'positive').length,
    neutral: entries.filter(e => e.level === 'neutral').length,
    negative: entries.filter(e => e.level === 'negative').length,
    critical: entries.filter(e => e.level === 'critical').length,
    averageScore,
  };
}
