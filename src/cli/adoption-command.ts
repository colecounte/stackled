import type { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser.js';
import { trackAdoption, summarizeAdoption, type AdoptionEntry } from '../core/dependency-adoption-tracker.js';
import { createRegistryClient } from '../core/registry-client.js';

function rateColor(rate: AdoptionEntry['adoptionRate']): string {
  switch (rate) {
    case 'fast': return chalk.green(rate);
    case 'moderate': return chalk.yellow(rate);
    case 'slow': return chalk.magenta(rate);
    case 'stale': return chalk.red(rate);
  }
}

export function printAdoptionTable(entries: AdoptionEntry[]): void {
  const header = ['Package', 'Current', 'Latest', 'Lag (days)', 'Behind', 'Rate'];
  const widths = [30, 12, 12, 12, 8, 10];
  const row = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join('  ');

  console.log(chalk.bold(row(header)));
  console.log('-'.repeat(widths.reduce((a, b) => a + b + 2, 0)));

  for (const e of entries) {
    console.log(row([
      e.name,
      e.currentVersion,
      e.latestVersion,
      String(e.adoptionLag),
      String(e.versionsBehind),
      rateColor(e.adoptionRate),
    ]));
  }
}

export function registerAdoptionCommand(program: Command): void {
  program
    .command('adoption')
    .description('Track how quickly your project adopts new dependency versions')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--stale-only', 'Show only stale dependencies')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const parsed = await parsePackageJson(opts.path);
      const client = createRegistryClient();

      const registryData = new Map<string, { latest: string; versions: string[]; releaseDate: string | null; latestReleaseDate: string | null }>();

      for (const dep of parsed.dependencies) {
        try {
          const info = await client.getPackageInfo(dep.name);
          const versions = Object.keys(info['versions'] ?? {});
          const latest = info['dist-tags']?.latest ?? dep.currentVersion;
          const latestReleaseDate = info.time?.[latest] ?? null;
          const releaseDate = info.time?.[dep.currentVersion] ?? null;
          registryData.set(dep.name, { latest, versions, releaseDate, latestReleaseDate });
        } catch {
          // skip unavailable packages
        }
      }

      let entries = trackAdoption(parsed.dependencies, registryData);

      if (opts.staleOnly) {
        entries = entries.filter(e => e.adoptionRate === 'stale');
      }

      if (opts.json) {
        console.log(JSON.stringify({ entries, summary: summarizeAdoption(entries) }, null, 2));
        return;
      }

      printAdoptionTable(entries);

      const summary = summarizeAdoption(entries);
      console.log();
      console.log(chalk.bold('Summary:'));
      console.log(`  Total: ${summary.total}  Fast: ${chalk.green(summary.fast)}  Moderate: ${chalk.yellow(summary.moderate)}  Slow: ${chalk.magenta(summary.slow)}  Stale: ${chalk.red(summary.stale)}`);
      console.log(`  Average adoption lag: ${summary.averageLagDays} days`);
    });
}
