import { DependencyInfo } from '../types';

export interface ScorecardEntry {
  name: string;
  version: string;
  healthScore: number;
  securityScore: number;
  freshnessScore: number;
  maintenanceScore: number;
  overallScore: number;
  grade: string;
  flags: string[];
}

export interface ScorecardSummary {
  entries: ScorecardEntry[];
  averageOverall: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
}

export function gradeFromOverall(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function buildFlags(entry: Omit<ScorecardEntry, 'flags' | 'grade' | 'overallScore'>): string[] {
  const flags: string[] = [];
  if (entry.securityScore < 50) flags.push('security-risk');
  if (entry.freshnessScore < 40) flags.push('outdated');
  if (entry.maintenanceScore < 40) flags.push('unmaintained');
  if (entry.healthScore < 50) flags.push('unhealthy');
  return flags;
}

export function calcOverallScore(
  health: number,
  security: number,
  freshness: number,
  maintenance: number
): number {
  return Math.round(health * 0.25 + security * 0.35 + freshness * 0.2 + maintenance * 0.2);
}

export function buildScorecardEntry(
  dep: DependencyInfo,
  healthScore: number,
  securityScore: number,
  freshnessScore: number,
  maintenanceScore: number
): ScorecardEntry {
  const overallScore = calcOverallScore(healthScore, securityScore, freshnessScore, maintenanceScore);
  const base = { name: dep.name, version: dep.version, healthScore, securityScore, freshnessScore, maintenanceScore };
  const flags = buildFlags(base);
  const grade = gradeFromOverall(overallScore);
  return { ...base, overallScore, grade, flags };
}

export function aggregateScorecard(entries: ScorecardEntry[]): ScorecardSummary {
  const averageOverall = entries.length
    ? Math.round(entries.reduce((sum, e) => sum + e.overallScore, 0) / entries.length)
    : 0;
  const criticalCount = entries.filter(e => e.overallScore < 40).length;
  const warningCount = entries.filter(e => e.overallScore >= 40 && e.overallScore < 70).length;
  const healthyCount = entries.filter(e => e.overallScore >= 70).length;
  return { entries, averageOverall, criticalCount, warningCount, healthyCount };
}
