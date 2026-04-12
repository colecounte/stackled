import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { parsePackageJson } from '../core/package-parser';
import { detectUnusedDependencies, UnusedDependencyEntry } from '../core/unused-dependency-detector';

const confidenceColor = (c: UnusedDependencyEntry['confidence']): string => {
  if (c === 'high') return chalk.red(c);
  if (c === 'medium') return chalk.yellow(c);
  return chalk.green(c);
};

export function printUnusedTable(entries: UnusedDependencyEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('✔ No unused dependencies detected.'));
    return;
  }

  const col = [30, 14, 14, 10];
  const header = [
    'Package'.padEnd(col[0]),
    'Version'.padEnd(col[1]),
    'Type'.padEnd(col[2]),
    'Confidence'.padEnd(col[3]),
  ].join(' ');

  console.log(chalk.bold(header));
  console.log('─'.repeat(col.reduce((a, b) => a + b + 1, 0)));

  for (const e of entries) {
    const row = [
      e.name.padEnd(col[0]),
      e.version.padEnd(col[1]),
      e.type.padEnd(col[2]),
      confidenceColor(e.confidence).padEnd(col[3]),
    ].join(' ');
    console.log(row);
    console.log(chalk.dim(`  ${e.reason}`));
  }
}

export function registerUnusedCommand(program: Command): void {
  program
    .command('unused')
    .description('Detect potentially unused dependencies in your project')
    .option('-p, --path <path>', 'Path to project root', process.cwd())
    .option('--high-only', 'Show only high-confidence unused dependencies')
    .option('--json', 'Output results as JSON')
    .action(async (opts) => {
      const projectRoot = path.resolve(opts.path);
      const pkgPath = path.join(projectRoot, 'package.json');

      let deps;
      try {
        deps = parsePackageJson(pkgPath);
      } catch (err) {
        console.error(chalk.red(`Failed to parse package.json: ${(err as Error).message}`));
        process.exit(1);
      }

      const { entries, summary } = detectUnusedDependencies(deps, projectRoot);
      const filtered = opts.highOnly ? entries.filter((e) => e.confidence === 'high') : entries;

      if (opts.json) {
        console.log(JSON.stringify({ entries: filtered, summary }, null, 2));
        return;
      }

      printUnusedTable(filtered);
      console.log();
      console.log(
        `Found ${chalk.bold(summary.total)} potentially unused dependencies ` +
          `(${chalk.red(summary.high + ' high')}, ` +
          `${chalk.yellow(summary.medium + ' medium')})`
      );
    });
}
