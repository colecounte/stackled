import { DependencyAnalysis, BreakingChange, ImpactScore } from '../types';

export interface DependencyReport {
  generatedAt: string;
  totalDependencies: number;
  outdatedCount: number;
  breakingChangesCount: number;
  highImpactCount: number;
  dependencies: ReportEntry[];
}

export interface ReportEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  isOutdated: boolean;
  breakingChanges: BreakingChange[];
  impactScore: ImpactScore | null;
  recommendation: string;
}

export function generateReport(
  analyses: DependencyAnalysis[],
  breakingChangesMap: Map<string, BreakingChange[]>,
  impactScoresMap: Map<string, ImpactScore>
): DependencyReport {
  const entries: ReportEntry[] = analyses.map((analysis) => {
    const breakingChanges = breakingChangesMap.get(analysis.name) ?? [];
    const impactScore = impactScoresMap.get(analysis.name) ?? null;

    return {
      name: analysis.name,
      currentVersion: analysis.currentVersion,
      latestVersion: analysis.latestVersion,
      isOutdated: analysis.isOutdated,
      breakingChanges,
      impactScore,
      recommendation: buildRecommendation(analysis, breakingChanges, impactScore),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalDependencies: entries.length,
    outdatedCount: entries.filter((e) => e.isOutdated).length,
    breakingChangesCount: entries.reduce((sum, e) => sum + e.breakingChanges.length, 0),
    highImpactCount: entries.filter((e) => e.impactScore && e.impactScore.score >= 7).length,
    dependencies: entries,
  };
}

function buildRecommendation(
  analysis: DependencyAnalysis,
  breakingChanges: BreakingChange[],
  impactScore: ImpactScore | null
): string {
  if (!analysis.isOutdated) return 'Up to date';

  if (breakingChanges.length > 0 && impactScore && impactScore.score >= 7) {
    return `Hold — ${breakingChanges.length} breaking change(s) detected with high impact (score: ${impactScore.score})`;
  }

  if (breakingChanges.length > 0) {
    return `Review — ${breakingChanges.length} breaking change(s) detected before upgrading`;
  }

  return `Safe to upgrade to ${analysis.latestVersion}`;
}
