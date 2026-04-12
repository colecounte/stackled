import * as fs from 'fs';
import * as path from 'path';
import { ScorecardEntry } from '../types';

export type ExportFormat = 'json' | 'csv' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  title?: string;
}

export function formatAsJson(entries: ScorecardEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function formatAsCsv(entries: ScorecardEntry[]): string {
  if (entries.length === 0) return '';
  const headers = ['name', 'version', 'grade', 'score', 'flags'];
  const rows = entries.map((e) => [
    e.name,
    e.version,
    e.grade,
    e.score.toFixed(2),
    e.flags.join(';'),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function formatAsMarkdown(entries: ScorecardEntry[], title = 'Dependency Scorecard'): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push('| Package | Version | Grade | Score | Flags |');
  lines.push('|---------|---------|-------|-------|-------|');
  for (const e of entries) {
    const flags = e.flags.length > 0 ? e.flags.join(', ') : '—';
    lines.push(`| ${e.name} | ${e.version} | ${e.grade} | ${e.score.toFixed(2)} | ${flags} |`);
  }
  return lines.join('\n');
}

export function exportReport(entries: ScorecardEntry[], options: ExportOptions): void {
  let content: string;
  switch (options.format) {
    case 'json':
      content = formatAsJson(entries);
      break;
    case 'csv':
      content = formatAsCsv(entries);
      break;
    case 'markdown':
      content = formatAsMarkdown(entries, options.title);
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
  const dir = path.dirname(options.outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(options.outputPath, content, 'utf-8');
}
