import { BreakingChange, ImpactScore } from '../types/index.js';

/**
 * Calculates impact scores for breaking changes
 */
export class ImpactScorer {
  /**
   * Calculate impact score for a breaking change
   */
  calculateScore(breakingChange: BreakingChange, usageCount: number = 0): ImpactScore {
    let score = 0;
    const factors: string[] = [];

    // Severity factor (0-40 points)
    const severityScore = this.getSeverityScore(breakingChange.severity);
    score += severityScore;
    factors.push(`severity:${breakingChange.severity}(${severityScore})`);

    // Type factor (0-30 points)
    const typeScore = this.getTypeScore(breakingChange.type);
    score += typeScore;
    factors.push(`type:${breakingChange.type}(${typeScore})`);

    // Usage factor (0-20 points)
    const usageScore = Math.min(usageCount * 2, 20);
    score += usageScore;
    factors.push(`usage:${usageCount}(${usageScore})`);

    // Affected APIs factor (0-10 points)
    const apiScore = Math.min(breakingChange.affectedAPIs.length * 2, 10);
    score += apiScore;
    factors.push(`apis:${breakingChange.affectedAPIs.length}(${apiScore})`);

    return {
      packageName: breakingChange.packageName,
      score,
      level: this.getScoreLevel(score),
      factors,
      recommendation: this.getRecommendation(score, breakingChange)
    };
  }

  /**
   * Get score based on severity
   */
  private getSeverityScore(severity: 'low' | 'medium' | 'high'): number {
    const scores = {
      low: 10,
      medium: 25,
      high: 40
    };
    return scores[severity];
  }

  /**
   * Get score based on breaking change type
   */
  private getTypeScore(type: string): number {
    const scores: Record<string, number> = {
      'major-version': 30,
      'changelog-indicated': 25,
      'api-removal': 30,
      'behavior-change': 20,
      'deprecation': 10
    };
    return scores[type] || 15;
  }

  /**
   * Determine impact level from score
   */
  private getScoreLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendation based on score and breaking change
   */
  private getRecommendation(score: number, breakingChange: BreakingChange): string {
    if (score >= 80) {
      return `Critical: Immediate action required for ${breakingChange.packageName}. Review migration guide before updating.`;
    }
    if (score >= 60) {
      return `High priority: Schedule time to review and test ${breakingChange.packageName} update.`;
    }
    if (score >= 40) {
      return `Medium priority: Monitor ${breakingChange.packageName} and plan update in next sprint.`;
    }
    return `Low priority: ${breakingChange.packageName} update is relatively safe. Review changelog and update when convenient.`;
  }
}
