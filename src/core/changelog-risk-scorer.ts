import { ChangelogSummary } from '../types';

export interface ChangelogRiskScore {
  package: string;
  version: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: string[];
}

export function gradeFromRiskScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score <= 10) return 'A';
  if (score <= 25) return 'B';
  if (score <= 45) return 'C';
  if (score <= 65) return 'D';
  return 'F';
}

export function calcRiskScore(summary: ChangelogSummary): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (summary.hasBreakingChanges) {
    score += 40;
    factors.push('Breaking changes detected');
  }

  if (summary.hasSecurityFixes) {
    score += 30;
    factors.push('Security fixes present');
  }

  if (summary.hasDeprecationNotices) {
    score += 15;
    factors.push('Deprecation notices found');
  }

  const totalChanges = summary.totalChanges ?? 0;
  if (totalChanges > 50) {
    score += 15;
    factors.push('High volume of changes (>50)');
  } else if (totalChanges > 20) {
    score += 8;
    factors.push('Moderate volume of changes (>20)');
  }

  if (summary.highlights && summary.highlights.length > 5) {
    score += 5;
    factors.push('Many highlighted changes');
  }

  return { score: Math.min(score, 100), factors };
}

export function scoreChangelogRisks(
  entries: Array<{ package: string; version: string; summary: ChangelogSummary }>
): ChangelogRiskScore[] {
  return entries
    .map(({ package: pkg, version, summary }) => {
      const { score, factors } = calcRiskScore(summary);
      return {
        package: pkg,
        version,
        score,
        grade: gradeFromRiskScore(score),
        factors,
      };
    })
    .sort((a, b) => b.score - a.score);
}
