import { DependencyReport, BreakingChange, ImpactScore } from '../types';

export interface FormattedNotification {
  title: string;
  summary: string;
  details: string[];
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

export function formatNotification(
  report: DependencyReport,
  impactScore: ImpactScore
): FormattedNotification {
  const severity = determineSeverity(impactScore.score);
  const breakingChanges = report.breakingChanges ?? [];

  return {
    title: buildTitle(report.packageName, report.latestVersion, severity),
    summary: buildSummary(report.packageName, breakingChanges.length, impactScore.score),
    details: buildDetails(breakingChanges),
    severity,
    timestamp: new Date().toISOString(),
  };
}

export function determineSeverity(
  score: number
): 'critical' | 'warning' | 'info' {
  if (score >= 8) return 'critical';
  if (score >= 5) return 'warning';
  return 'info';
}

function buildTitle(
  packageName: string,
  version: string,
  severity: string
): string {
  const emoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
  return `${emoji} [${severity.toUpperCase()}] ${packageName}@${version} — Breaking changes detected`;
}

function buildSummary(
  packageName: string,
  breakingCount: number,
  score: number
): string {
  return `${packageName} has ${breakingCount} breaking change(s) with an impact score of ${score.toFixed(1)}/10.`;
}

function buildDetails(breakingChanges: BreakingChange[]): string[] {
  if (breakingChanges.length === 0) {
    return ['No breaking changes detected.'];
  }
  return breakingChanges.map(
    (change) => `• [${change.type}] ${change.description}`
  );
}

export function formatAsText(notification: FormattedNotification): string {
  const lines = [
    notification.title,
    '',
    notification.summary,
    '',
    'Details:',
    ...notification.details,
    '',
    `Reported at: ${notification.timestamp}`,
  ];
  return lines.join('\n');
}
