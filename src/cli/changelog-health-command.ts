import { Command } from 'commander';
import chalk from 'chalk';
import { PackageInfo } from '../types';
import { buildHealthEntry, summarizeChangelogHealth, ChangelogHealthEntry } from '../core/dependency-changelog-health';
import { parsePackageJson } from '../core/package-parser';

function statusColor(status: string): string {
  switch (status) {
    case 'healthy': return chalk.green(status);
    case 'stale': return chalk.yellow(status);
    case 'sparse': return chalk.blue(status);
    case 'missing': return chalk.red(status);
    default: return status;
  }
}

export function printHealthTable(entries: ChangelogHealthEntry[]): void {
  console.log(
    chalk.bold('Package'.padEnd(30)) +
    chalk.bold('Status'.padEnd(12)) +
    chalk.bold('Score'.padEnd(8)) +
    chalk.bold('Entries'.padEnd(10)) +
    chalk.bold('Last Entry')
  );
  console.log('─'.repeat(72));
  for (const e of entries) {
    const lastEntry = e.lastEntryDaysAgo !== null ? `${e.lastEntryDaysAgo}d ago` : 'n/a';
    console.log(
      e.name.padEnd(30) +
      statusColor(e.status).padEnd(20) +
      String(e.score).padEnd(8) +
      String(e.entryCount).padEnd(10) +
      lastEntry
    );
  }
  const summary = summarizeChangelogHealth(entries);
  console.log();
  console.log(chalk.bold('Summary:'));
  console.log(`  Total: ${summary.total}  Healthy: ${chalk.green(summary.healthy)}  Stale: ${chalk.yellow(summary.stale)}  Sparse: ${chalk.blue(summary.sparse)}  Missing: ${chalk.red(summary.missing)}`);
  console.log(`  Average Score: ${summary.averageScore}`);
}

export function registerChangelogHealthCommand(program: Command): void {
  program
    .command('changelog-health')
    .description('Assess the changelog health of your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--missing-only', 'Show only packages with missing changelogs')
    .action(async (opts) => {
      const packages: PackageInfo[] = await parsePackageJson(opts.path);
      const entries = packages.map(pkg => {
        // Simulate metadata — in production this would call a registry client
        const entryCount = Math.floor(Math.random() * 20);
        const lastEntryDaysAgo = entryCount > 0 ? Math.floor(Math.random() * 500) : null;
        return buildHealthEntry(pkg, lastEntryDaysAgo, entryCount);
      });
      const filtered = opts.missingOnly ? entries.filter(e => e.status === 'missing') : entries;
      printHealthTable(filtered);
    });
}
