import { PackageInfo } from '../types';

export type MaintainerRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface MaintainerRiskEntry {
  name: string;
  version: string;
  maintainerCount: number;
  daysSinceLastPublish: number;
  riskLevel: MaintainerRiskLevel;
  riskScore: number;
  flags: string[];
}

export interface MaintainerRiskSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  averageScore: number;
}

export function calcMaintainerRiskScore(
  maintainerCount: number,
  daysSinceLastPublish: number
): number {
  let score = 0;
  if (maintainerCount === 0) score += 50;
  else if (maintainerCount === 1) score += 30;
  else if (maintainerCount <= 2) score += 15;
  if (daysSinceLastPublish > 730) score += 40;
  else if (daysSinceLastPublish > 365) score += 25;
  else if (daysSinceLastPublish > 180) score += 10;
  return Math.min(score, 100);
}

export function classifyMaintainerRisk(score: number): MaintainerRiskLevel {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

export function buildMaintainerRiskFlags(
  maintainerCount: number,
  daysSinceLastPublish: number
): string[] {
  const flags: string[] = [];
  if (maintainerCount === 0) flags.push('no-maintainers');
  if (maintainerCount === 1) flags.push('single-maintainer');
  if (daysSinceLastPublish > 730) flags.push('inactive-2yr');
  else if (daysSinceLastPublish > 365) flags.push('inactive-1yr');
  return flags;
}

export function buildMaintainerRiskEntry(
  pkg: PackageInfo,
  maintainerCount: number,
  daysSinceLastPublish: number
): MaintainerRiskEntry {
  const riskScore = calcMaintainerRiskScore(maintainerCount, daysSinceLastPublish);
  return {
    name: pkg.name,
    version: pkg.version,
    maintainerCount,
    daysSinceLastPublish,
    riskLevel: classifyMaintainerRisk(riskScore),
    riskScore,
    flags: buildMaintainerRiskFlags(maintainerCount, daysSinceLastPublish),
  };
}

export function summarizeMaintainerRisks(
  entries: MaintainerRiskEntry[]
): MaintainerRiskSummary {
  const total = entries.length;
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  let scoreSum = 0;
  for (const e of entries) {
    counts[e.riskLevel]++;
    scoreSum += e.riskScore;
  }
  return { total, ...counts, averageScore: total ? Math.round(scoreSum / total) : 0 };
}
