import { Command } from 'commander';
import chalk from 'chalk';
import { PackageInfo } from '../types';
import {
  checkTestCoverage,
  summarizeTestCoverage,
  TestCoverageEntry,
  CoverageBand,
} from '../core/dependency-test-coverage-checker';

function bandColor(band: CoverageBand): string {
  switch (band) {
    case 'high': return chalk.green(band);
    case 'medium': return chalk.yellow(band);
    case 'low': return chalk.red(band);
    default: return chalk.gray(band);
  }
}

export function printTestCoverageTable(entries: TestCoverageEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.gray('No packages to display.'));
    return;
  }

  console.log(
    chalk.bold(
      `${'Package'.padEnd(30)} ${'Version'.padEnd(12)} ${'Tests'.padEnd(8)} ${'Band'.padEnd(10)} Flags`
    )
  );
  console.log('─'.repeat(80));

  for (const entry of entries) {
    const tests = entry.hasTests ? chalk.green('yes') : chalk.red('no');
    const flags = entry.flags.length > 0 ? chalk.yellow(entry.flags.join(', ')) : chalk.gray('none');
    console.log(
      `${entry.name.padEnd(30)} ${entry.version.padEnd(12)} ${tests.padEnd(8)} ${bandColor(entry.coverageBand).padEnd(10)} ${flags}`
    );
  }

  const summary = summarizeTestCoverage(entries);
  console.log('─'.repeat(80));
  console.log(
    `Total: ${summary.total} | With tests: ${chalk.green(summary.withTests)} | Without: ${chalk.red(summary.withoutTests)} | High: ${chalk.green(summary.highCoverage)} | Unknown: ${chalk.gray(summary.unknownCoverage)}`
  );
}

export function registerTestCoverageCommand(program: Command, getPackages: () => Promise<PackageInfo[]>): void {
  program
    .command('test-coverage')
    .description('Check test coverage signals for your dependencies')
    .option('--no-tests-only', 'Show only packages without detected tests')
    .action(async (opts) => {
      const packages = await getPackages();
      let entries = checkTestCoverage(packages);

      if (opts.noTestsOnly) {
        entries = entries.filter((e) => !e.hasTests);
      }

      printTestCoverageTable(entries);
    });
}
