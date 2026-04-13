import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { scoreDependencyComplexity } from '../core/dependency-complexity-scorer';
import { buildComplexityReport, formatComplexityReportAsJson, formatComplexityReportAsText } from '../core/dependency-complexity-reporter';
import { ComplexityEntry } from '../types';

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return chalk.green(grade);
    case 'B': return chalk.cyan(grade);
    case 'C': return chalk.yellow(grade);
    case 'D': return chalk.red(grade);
    default:  return chalk.bgRed.white(grade);
  }
}

export function printComplexityTable(entries: ComplexityEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('No dependencies found.'));
    return;
  }
  console.log(
    chalk.bold('Package'.padEnd(32)),
    chalk.bold('Version'.padEnd(12)),
    chalk.bold('Score'.padEnd(8)),
    chalk.bold('Grade'.padEnd(7)),
    chalk.bold('Depth'.padEnd(7)),
    chalk.bold('Transitive'),
  );
  for (const e of entries) {
    console.log(
      e.name.padEnd(32),
      e.version.padEnd(12),
      String(e.score).padEnd(8),
      gradeColor(e.grade).padEnd(7),
      String(e.depth).padEnd(7),
      String(e.transitiveDeps),
    );
  }
}

export function registerComplexityCommand(program: Command): void {
  program
    .command('complexity')
    .description('Score dependency complexity based on depth and version spread')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('-f, --format <format>', 'Output format: table | json | text', 'table')
    .option('--min-grade <grade>', 'Only show entries at or below this grade')
    .action(async (opts) => {
      const deps = parsePackageJson(opts.path);
      const entries = scoreDependencyComplexity(deps);
      const report = buildComplexityReport(entries);

      const filtered = opts.minGrade
        ? entries.filter(e => e.grade >= opts.minGrade)
        : entries;

      if (opts.format === 'json') {
        console.log(formatComplexityReportAsJson({ ...report, entries: filtered }));
      } else if (opts.format === 'text') {
        console.log(formatComplexityReportAsText({ ...report, entries: filtered }));
      } else {
        printComplexityTable(filtered);
        console.log();
        console.log(chalk.bold(`Overall Grade: ${gradeColor(report.overallGrade)}  Avg Score: ${report.averageScore}`));
        console.log(report.summary);
      }
    });
}
