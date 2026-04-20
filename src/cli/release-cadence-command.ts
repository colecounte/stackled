import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeReleaseCadence, summarizeReleaseCadence, ReleaseCadenceEntry, CadenceBand } from '../core/dependency-release-cadence';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';

export function bandColor(band: CadenceBand): string {
  switch (band) {
    case 'rapid': return chalk.yellow(band);
    case 'regular': return chalk.green(band);
    case 'slow': return chalk.magenta(band);
    case 'stagnant': return chalk.red(band);
  }
}

export function printReleaseCadenceTable(entries: ReleaseCadenceEntry[]): void {
  const header = [
    'Package'.padEnd(30),
    'Releases'.padStart(9),
    'Avg Days'.padStart(10),
    'Last Release'.padStart(14),
    'Cadence'.padEnd(10),
    'Flags',
  ].join('  ');
  console.log(chalk.bold(header));
  console.log('─'.repeat(90));

  for (const e of entries) {
    const line = [
      e.name.slice(0, 30).padEnd(30),
      String(e.totalReleases).padStart(9),
      String(e.avgDaysBetweenReleases).padStart(10),
      `${e.daysSinceLastRelease}d ago`.padStart(14),
      bandColor(e.cadenceBand).padEnd(10),
      e.flags.length ? chalk.dim(e.flags.join('; ')) : chalk.green('✓'),
    ].join('  ');
    console.log(line);
  }
}

export function registerReleaseCadenceCommand(program: Command): void {
  program
    .command('cadence')
    .description('Analyse the release cadence of your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--band <band>', 'Filter by cadence band (rapid|regular|slow|stagnant)')
    .option('--unhealthy', 'Show only unhealthy packages', false)
    .action(async (opts) => {
      const config = await loadConfig();
      const deps = await parsePackageJson(opts.path);
      const client = createRegistryClient(config);

      const packages = await Promise.all(
        deps.map(d => client.fetchPackageInfo(d.name).catch(() => null))
      );
      const valid = packages.filter((p): p is NonNullable<typeof p> => p !== null);
      let entries = analyzeReleaseCadence(valid);

      if (opts.band) {
        entries = entries.filter(e => e.cadenceBand === opts.band);
      }
      if (opts.unhealthy) {
        entries = entries.filter(e => !e.isHealthy);
      }

      if (entries.length === 0) {
        console.log(chalk.green('No matching dependencies found.'));
        return;
      }

      printReleaseCadenceTable(entries);

      const summary = summarizeReleaseCadence(entries);
      console.log();
      console.log(chalk.bold('Summary'));
      console.log(`  Total: ${summary.total}  Rapid: ${summary.rapid}  Regular: ${summary.regular}  Slow: ${summary.slow}  Stagnant: ${summary.stagnant}`);
      console.log(`  Avg days between releases (across all): ${summary.avgDaysBetweenReleases}`);
    });
}
