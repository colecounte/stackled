import { HealthScore } from '../types';

export type CiExitCode = 0 | 1;

export interface CiReport {
  passed: boolean;
  exitCode: CiExitCode;
  summary: string;
  failureReasons: string[];
}

export interface CiThresholds {
  minHealthScore?: number;
  maxCriticalVulnerabilities?: number;
  maxHighVulnerabilities?: number;
  allowDeprecated?: boolean;
  maxOutdatedDirect?: number;
}

const DEFAULT_THRESHOLDS: Required<CiThresholds> = {
  minHealthScore: 50,
  maxCriticalVulnerabilities: 0,
  maxHighVulnerabilities: 5,
  allowDeprecated: false,
  maxOutdatedDirect: 10,
};

export function evaluateThresholds(
  scores: HealthScore[],
  criticalVulns: number,
  highVulns: number,
  deprecatedCount: number,
  outdatedDirectCount: number,
  thresholds: CiThresholds = {}
): CiReport {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const failureReasons: string[] = [];

  const avgHealth =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s.overall, 0) / scores.length
      : 100;

  if (avgHealth < t.minHealthScore) {
    failureReasons.push(
      `Average health score ${avgHealth.toFixed(1)} is below threshold ${t.minHealthScore}`
    );
  }

  if (criticalVulns > t.maxCriticalVulnerabilities) {
    failureReasons.push(
      `${criticalVulns} critical vulnerabilities exceed threshold ${t.maxCriticalVulnerabilities}`
    );
  }

  if (highVulns > t.maxHighVulnerabilities) {
    failureReasons.push(
      `${highVulns} high vulnerabilities exceed threshold ${t.maxHighVulnerabilities}`
    );
  }

  if (!t.allowDeprecated && deprecatedCount > 0) {
    failureReasons.push(
      `${deprecatedCount} deprecated package(s) found (deprecated packages not allowed)`
    );
  }

  if (outdatedDirectCount > t.maxOutdatedDirect) {
    failureReasons.push(
      `${outdatedDirectCount} outdated direct dependencies exceed threshold ${t.maxOutdatedDirect}`
    );
  }

  const passed = failureReasons.length === 0;

  return {
    passed,
    exitCode: passed ? 0 : 1,
    summary: passed
      ? `All CI checks passed (avg health: ${avgHealth.toFixed(1)})`
      : `CI checks failed: ${failureReasons.length} issue(s) found`,
    failureReasons,
  };
}

export function formatCiOutput(report: CiReport): string {
  const lines: string[] = [];
  lines.push(report.passed ? '✅ ' + report.summary : '❌ ' + report.summary);
  if (!report.passed) {
    report.failureReasons.forEach((r) => lines.push(`  • ${r}`));
  }
  return lines.join('\n');
}
