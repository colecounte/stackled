import { ComplexityEntry } from '../types';

export interface ComplexityReport {
  entries: ComplexityEntry[];
  averageScore: number;
  overallGrade: string;
  highComplexityCount: number;
  summary: string;
}

export function calcAverageScore(entries: ComplexityEntry[]): number {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, e) => sum + e.score, 0);
  return Math.round(total / entries.length);
}

export function countHighComplexity(entries: ComplexityEntry[]): number {
  return entries.filter(e => e.score >= 70).length;
}

export function overallGrade(averageScore: number): string {
  if (averageScore < 25) return 'A';
  if (averageScore < 45) return 'B';
  if (averageScore < 65) return 'C';
  if (averageScore < 80) return 'D';
  return 'F';
}

export function buildComplexityReport(entries: ComplexityEntry[]): ComplexityReport {
  const averageScore = calcAverageScore(entries);
  const grade = overallGrade(averageScore);
  const highComplexityCount = countHighComplexity(entries);
  const summary =
    highComplexityCount === 0
      ? `All ${entries.length} dependencies have acceptable complexity.`
      : `${highComplexityCount} of ${entries.length} dependencies have high complexity (grade D or F).`;

  return {
    entries,
    averageScore,
    overallGrade: grade,
    highComplexityCount,
    summary,
  };
}

export function formatComplexityReportAsText(report: ComplexityReport): string {
  const lines: string[] = [
    `Overall Grade: ${report.overallGrade} (avg score: ${report.averageScore})`,
    report.summary,
    '',
  ];
  for (const entry of report.entries) {
    lines.push(`  ${entry.name}@${entry.version}  score=${entry.score}  grade=${entry.grade}  depth=${entry.depth}`);
  }
  return lines.join('\n');
}

export function formatComplexityReportAsJson(report: ComplexityReport): string {
  return JSON.stringify(report, null, 2);
}
