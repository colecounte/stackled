import { CompatibilityMatrix, CompatibilityEntry } from './compatibility-matrix.js';

export interface CompatibilityReport {
  generatedAt: string;
  summary: {
    total: number;
    compatible: number;
    incompatible: number;
    breaking: number;
  };
  breaking: CompatibilityEntry[];
  incompatible: CompatibilityEntry[];
  safe: CompatibilityEntry[];
}

export function buildCompatibilityReport(matrix: CompatibilityMatrix): CompatibilityReport {
  const breaking = matrix.entries.filter((e) => e.breakingChange);
  const incompatible = matrix.entries.filter((e) => !e.compatible && !e.breakingChange);
  const safe = matrix.entries.filter((e) => e.compatible);
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: matrix.totalChecked,
      compatible: safe.length,
      incompatible: matrix.incompatibleCount,
      breaking: matrix.breakingCount,
    },
    breaking,
    incompatible,
    safe,
  };
}

export function formatCompatibilityReportAsJson(report: CompatibilityReport): string {
  return JSON.stringify(report, null, 2);
}

export function formatCompatibilityReportAsText(report: CompatibilityReport): string {
  const lines: string[] = [
    `Compatibility Report — ${report.generatedAt}`,
    `Total: ${report.summary.total} | Compatible: ${report.summary.compatible} | Breaking: ${report.summary.breaking} | Incompatible: ${report.summary.incompatible}`,
  ];
  if (report.breaking.length) {
    lines.push('\nBreaking Changes:');
    for (const e of report.breaking) {
      lines.push(`  ${e.name}: ${e.currentVersion} → ${e.targetVersion}`);
      for (const note of e.notes) lines.push(`    * ${note}`);
    }
  }
  if (report.incompatible.length) {
    lines.push('\nIncompatible (non-breaking):');
    for (const e of report.incompatible) {
      lines.push(`  ${e.name}: ${e.currentVersion} → ${e.targetVersion}`);
    }
  }
  return lines.join('\n');
}
