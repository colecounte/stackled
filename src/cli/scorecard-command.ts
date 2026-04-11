import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { buildScorecardEntry, aggregateScorecard, ScorecardEntry, ScorecardSummary } from '../core/scorecard-aggregator';
import { DependencyInfo } from '../types';

const gradeColor = (grade: string): string => {
  if (grade === 'A') return chalk.green(grade);
  if (grade === 'B') return chalk.cyan(grade);
  if (grade === 'C') return chalk.yellow(grade);
  if (grade === 'D') return chalk.red(grade);
  return chalk.bgRed.white(grade);
};

export function printScorecardTable(summary: ScorecardSummary): void {
  console.log(chalk.bold('\nDependency Scorecard\n'));
  console.log(
    chalk.dim('Package'.padEnd(30)) +
    chalk.dim('Overall'.padEnd(10)) +
    chalk.dim('Grade'.padEnd(8)) +
    chalk.dim('Security'.padEnd(12)) +
    chalk.dim('Freshness'.padEnd(12)) +
    chalk.dim('Flags')
  );
  console.log('─'.repeat(80));

  for (const entry of summary.entries) {
    const flags = entry.flags.length ? chalk.yellow(entry.flags.join(', ')) : chalk.green('✓ clean');
    console.log(
      entry.name.padEnd(30) +
      String(entry.overallScore).padEnd(10) +
      gradeColor(entry.grade).padEnd(8) +
      String(entry.securityScore).padEnd(12) +
      String(entry.freshnessScore).padEnd(12) +
      flags
    );
  }

  console.log('─'.repeat(80));
  console.log(chalk.bold(`\nAverage Score: ${summary.averageOverall}`));
  console.log(chalk.green(`Healthy: ${summary.healthyCount}`) + '  ' +
    chalk.yellow(`Warning: ${summary.warningCount}`) + '  ' +
    chalk.red(`Critical: ${summary.criticalCount}`));
  console.log();
}

export function registerScorecardCommand(program: Command): void {
  program
    .command('scorecard')
    .description('Show an aggregated health scorecard for all dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--min-score <number>', 'Exit with error if average score is below threshold', '0')
    .action(async (opts) => {
      const deps: DependencyInfo[] = parsePackageJson(opts.path);
      const entries = deps.map(dep =>
        buildScorecardEntry(dep, 75, 80, 70, 65)
      );
      const summary = aggregateScorecard(entries);
      printScorecardTable(summary);

      const minScore = parseInt(opts.minScore, 10);
      if (summary.averageOverall < minScore) {
        console.error(chalk.red(`Average score ${summary.averageOverall} is below threshold ${minScore}`));
        process.exit(1);
      }
    });
}
