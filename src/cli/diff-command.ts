import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import { parsePackage } from '../core/package-parser';
import { diffDependencies, summarizeDiff, DependencyDiffEntry } from '../core/dependency-diff';

const changeColor = (type: DependencyDiffEntry['changeType']): chalk.Chalk => ({
  added: chalk.green,
  removed: chalk.red,
  upgraded: chalk.cyan,
  downgraded: chalk.yellow,
  unchanged: chalk.gray,
}[type]);

const changeSymbol = (type: DependencyDiffEntry['changeType']): string => ({
  added: '+',
  removed: '-',
  upgraded: '↑',
  downgraded: '↓',
  unchanged: '=',
}[type]);

export function printDiffTable(entries: DependencyDiffEntry[]): void {
  const visible = entries.filter(e => e.changeType !== 'unchanged');
  if (visible.length === 0) {
    console.log(chalk.gray('No dependency changes detected.'));
    return;
  }

  console.log(chalk.bold(`\n  ${'Symbol'.padEnd(8)}${'Package'.padEnd(32)}${'From'.padEnd(20)}To`));
  console.log('  ' + '─'.repeat(72));

  for (const entry of visible) {
    const color = changeColor(entry.changeType);
    const sym = changeSymbol(entry.changeType);
    const from = entry.fromVersion ?? '—';
    const to = entry.toVersion ?? '—';
    console.log(color(`  [${sym}]     ${entry.name.padEnd(32)}${from.padEnd(20)}${to}`));
  }

  const summary = summarizeDiff(entries);
  console.log('\n  ' + chalk.bold('Summary:'),
    chalk.green(`+${summary.added} added`),
    chalk.red(`-${summary.removed} removed`),
    chalk.cyan(`↑${summary.upgraded} upgraded`),
    chalk.yellow(`↓${summary.downgraded} downgraded`)
  );
}

export function registerDiffCommand(program: Command): void {
  program
    .command('diff <baseline> <current>')
    .description('Diff dependencies between two package.json files')
    .option('--show-unchanged', 'Include unchanged dependencies in output')
    .action((baselinePath: string, currentPath: string, opts: { showUnchanged?: boolean }) => {
      if (!fs.existsSync(baselinePath)) {
        console.error(chalk.red(`Baseline file not found: ${baselinePath}`));
        process.exit(1);
      }
      if (!fs.existsSync(currentPath)) {
        console.error(chalk.red(`Current file not found: ${currentPath}`));
        process.exit(1);
      }

      const baseline = parsePackage(baselinePath);
      const current = parsePackage(currentPath);
      let entries = diffDependencies(baseline.dependencies, current.dependencies);

      if (!opts.showUnchanged) {
        entries = entries.filter(e => e.changeType !== 'unchanged');
      }

      printDiffTable(entries);
    });
}
