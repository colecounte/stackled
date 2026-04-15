import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import {
  analyzeCoOccurrences,
  CoOccurrenceEntry,
} from '../core/dependency-co-occurrence-analyzer';

function riskColor(flag: boolean): string {
  return flag ? chalk.red('⚠ risky') : chalk.green('ok');
}

export function printCoOccurrenceTable(
  entries: CoOccurrenceEntry[]
): void {
  if (entries.length === 0) {
    console.log(chalk.gray('No co-occurrence pairs found.'));
    return;
  }

  const flagged = entries.filter((e) => e.riskFlag);

  console.log(
    chalk.bold(
      `\nDependency Co-occurrence Analysis — ${entries.length} pairs, ${flagged.length} flagged\n`
    )
  );

  const header = [
    'Package A'.padEnd(25),
    'Package B'.padEnd(25),
    'Common Version'.padEnd(16),
    'Status',
  ].join('  ');

  console.log(chalk.underline(header));

  for (const entry of entries) {
    const row = [
      entry.name.padEnd(25),
      entry.pairedWith.padEnd(25),
      (entry.commonVersionPattern ?? '—').padEnd(16),
      riskColor(entry.riskFlag),
    ].join('  ');
    console.log(row);
  }

  if (flagged.length > 0) {
    console.log(
      chalk.yellow(
        `\n${flagged.length} risky pair(s) detected. Consider consolidating duplicate functionality.`
      )
    );
  }
}

export function registerCoOccurrenceCommand(program: Command): void {
  program
    .command('co-occurrence')
    .description('Analyze dependency co-occurrence patterns and flag risky combinations')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--flagged-only', 'Show only flagged pairs', false)
    .action(async (opts) => {
      try {
        const parsed = await parsePackageJson(opts.path);
        const { entries, summary } = analyzeCoOccurrences(parsed.dependencies);

        const toShow = opts.flaggedOnly
          ? entries.filter((e) => e.riskFlag)
          : entries;

        printCoOccurrenceTable(toShow);

        if (summary.flagged > 0) {
          process.exitCode = 1;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });
}
