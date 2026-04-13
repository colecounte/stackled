import { DependencyInfo } from '../types';

export interface RiskSummaryEntry {
  name: string;
  version: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
  riskScore: number;
  flags: string[];
}

export interface RiskSummaryReport {
  entries: RiskSummaryEntry[];
  totalDependencies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  overallRiskScore: number;
}

export function classifyRiskLevel(
  score: number
): RiskSummaryEntry['riskLevel'] {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'none';
}

export function buildRiskFlags(dep: DependencyInfo): string[] {
  const flags: string[] = [];
  if (!dep.latestVersion) flags.push('no-registry-data');
  if (dep.isDeprecated) flags.push('deprecated');
  if (!dep.repositoryUrl) flags.push('no-repository');
  if (!dep.license) flags.push('no-license');
  return flags;
}

export function calcDependencyRiskScore(dep: DependencyInfo): number {
  let score = 0;
  if (dep.isDeprecated) score += 40;
  if (!dep.repositoryUrl) score += 20;
  if (!dep.license) score += 15;
  if (!dep.latestVersion) score += 10;
  const downloads = (dep as any).weeklyDownloads ?? 0;
  if (downloads < 1000) score += 15;
  return Math.min(score, 100);
}

export function buildRiskSummaryEntry(
  dep: DependencyInfo
): RiskSummaryEntry {
  const riskScore = calcDependencyRiskScore(dep);
  return {
    name: dep.name,
    version: dep.version,
    riskScore,
    riskLevel: classifyRiskLevel(riskScore),
    flags: buildRiskFlags(dep),
  };
}

export function summarizeDependencyRisks(
  deps: DependencyInfo[]
): RiskSummaryReport {
  const entries = deps.map(buildRiskSummaryEntry);
  const criticalCount = entries.filter((e) => e.riskLevel === 'critical').length;
  const highCount = entries.filter((e) => e.riskLevel === 'high').length;
  const mediumCount = entries.filter((e) => e.riskLevel === 'medium').length;
  const lowCount = entries.filter((e) => e.riskLevel === 'low').length;
  const overallRiskScore =
    entries.length > 0
      ? Math.round(
          entries.reduce((sum, e) => sum + e.riskScore, 0) / entries.length
        )
      : 0;
  return {
    entries,
    totalDependencies: deps.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    overallRiskScore,
  };
}
