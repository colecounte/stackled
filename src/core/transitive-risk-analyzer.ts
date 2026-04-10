import { DependencyInfo } from '../types';

export type TransitiveRiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface TransitiveRiskEntry {
  name: string;
  version: string;
  depth: number;
  riskLevel: TransitiveRiskLevel;
  reasons: string[];
  affectedBy: string[];
}

export interface TransitiveRiskSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  mostImpacted: string[];
}

export function calcRiskLevel(
  hasVuln: boolean,
  isDeprecated: boolean,
  isOutdated: boolean,
  depth: number
): TransitiveRiskLevel {
  if (hasVuln && depth <= 2) return 'critical';
  if (hasVuln) return 'high';
  if (isDeprecated && depth <= 1) return 'high';
  if (isDeprecated) return 'medium';
  if (isOutdated && depth <= 1) return 'medium';
  if (isOutdated) return 'low';
  return 'none';
}

export function buildTransitiveRiskEntry(
  dep: DependencyInfo,
  depth: number,
  affectedBy: string[]
): TransitiveRiskEntry {
  const reasons: string[] = [];
  const hasVuln = (dep.vulnerabilities?.length ?? 0) > 0;
  const isDeprecated = dep.deprecated ?? false;
  const isOutdated = dep.updateAvailable ?? false;

  if (hasVuln) reasons.push(`${dep.vulnerabilities!.length} vulnerabilit${dep.vulnerabilities!.length === 1 ? 'y' : 'ies'} found`);
  if (isDeprecated) reasons.push('package is deprecated');
  if (isOutdated) reasons.push('newer version available');

  return {
    name: dep.name,
    version: dep.version,
    depth,
    riskLevel: calcRiskLevel(hasVuln, isDeprecated, isOutdated, depth),
    reasons,
    affectedBy,
  };
}

export function analyzeTransitiveRisks(
  deps: DependencyInfo[],
  depthMap: Record<string, number>,
  dependentsMap: Record<string, string[]>
): TransitiveRiskEntry[] {
  return deps
    .map((dep) => {
      const depth = depthMap[dep.name] ?? 0;
      const affectedBy = dependentsMap[dep.name] ?? [];
      return buildTransitiveRiskEntry(dep, depth, affectedBy);
    })
    .filter((entry) => entry.riskLevel !== 'none');
}

export function summarizeTransitiveRisks(
  entries: TransitiveRiskEntry[]
): TransitiveRiskSummary {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const e of entries) {
    if (e.riskLevel in counts) counts[e.riskLevel as keyof typeof counts]++;
  }
  const mostImpacted = entries
    .filter((e) => e.affectedBy.length > 0)
    .sort((a, b) => b.affectedBy.length - a.affectedBy.length)
    .slice(0, 3)
    .map((e) => e.name);
  return { total: entries.length, ...counts, mostImpacted };
}
