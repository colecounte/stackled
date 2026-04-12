import { Command } from 'commander';
import chalk from 'chalk';
import { buildFreshnessEntry, checkChangelogFreshness, FreshnessEntry } from '../core/changelog-freshness-checker';
import { loadConfig } from '../core/config-manager';
import { createRegistryClient } from '../core/registry-client';
import { parsePackageJson } from '../core/package-parser';

function statusColor(status: FreshnessEntry['status']): string {
  switch (status) {
    case 'fresh': return chalk.green(status);
    case 'stale': return chalk.yellow(status);
    case 'outdated': return chalk.red(status);
    default: return chalk.gray(status);
  }
}

export function printFreshnessTable(entries: FreshnessEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.gray('No packages to display.'));
    return;
  }
  const header = `${'Package'.padEnd(30)} ${'Current'.padEnd(12)} ${'Latest'.padEnd(12)} ${'Days'.padEnd(6)} ${'Score'.padEnd(6)} Status`;
  console.log(chalk.bold(header));
  console.log('─'.repeat(header.length));
  for (const e of entries) {
    const days = e.daysSinceRelease >= 0 ? String(e.daysSinceRelease) : 'n/a';
    console.log(
      `${e.name.padEnd(30)} ${e.currentVersion.padEnd(12)} ${e.latestVersion.padEnd(12)} ${days.padEnd(6)} ${String(e.freshnessScore).padEnd(6)} ${statusColor(e.status)}`
    );
  }
}

export function registerFreshnessCommand(program: Command): void {
  program
    .command('freshness')
    .description('Check how recently dependencies have published changelog updates')
    .option('--min-score <number>', 'Fail if average freshness score is below threshold', '50')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const config = await loadConfig();
      const packages = await parsePackageJson(config.packageJsonPath ?? 'package.json');
      const client = createRegistryClient();
      const entries: FreshnessEntry[] = [];

      for (const pkg of packages) {
        try {
          const info = await client.getPackageInfo(pkg.name);
          const latest = info['dist-tags']?.latest ?? pkg.version;
          const releaseDate = info.time?.[latest];
          const hasChangelog = Boolean(info.repository?.url);
          entries.push(buildFreshnessEntry(pkg, latest, releaseDate, hasChangelog));
        } catch {
          entries.push(buildFreshnessEntry(pkg, pkg.version, undefined, false));
        }
      }

      const summary = checkChangelogFreshness(entries);

      if (opts.json) {
        console.log(JSON.stringify({ entries, summary }, null, 2));
        return;
      }

      printFreshnessTable(entries);
      console.log();
      console.log(`Average freshness score: ${chalk.bold(summary.averageScore)}`);
      console.log(`Fresh: ${summary.fresh}  Stale: ${summary.stale}  Outdated: ${summary.outdated}  Unknown: ${summary.unknown}`);

      const minScore = parseInt(opts.minScore, 10);
      if (summary.averageScore < minScore) {
        console.error(chalk.red(`\nAverage score ${summary.averageScore} is below threshold ${minScore}.`));
        process.exit(1);
      }
    });
}
