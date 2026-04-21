import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeChangelogVelocity, summarizeVelocity, ChangelogVelocityEntry, VelocityBand } from '../core/dependency-changelog-velocity';
import { loadConfig } from '../core/config-manager';
import { createRegistryClient } from '../core/registry-client';
import { parsePackageJson } from '../core/package-parser';

function bandColor(band: VelocityBand): string {
  switch (band) {
    case 'rapid': return chalk.magenta(band);
    case 'active': return chalk.green(band);
    case 'moderate': return chalk.cyan(band);
    case 'slow': return chalk.yellow(band);
    case 'stagnant': return chalk.red(band);
  }
}

function trendSymbol(trend: ChangelogVelocityEntry['trend']): string {
  if (trend === 'accelerating') return chalk.green('↑');
  if (trend === 'decelerating') return chalk.red('↓');
  return chalk.gray('→');
}

export function printVelocityTable(entries: ChangelogVelocityEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.gray('No packages to display.'));
    return;
  }

  const header = [
    'Package'.padEnd(30),
    'Version'.padEnd(12),
    '90d'.padStart(5),
    '365d'.padStart(6),
    'Avg Days'.padStart(9),
    'Band'.padEnd(12),
    'Trend'.padEnd(8),
  ].join('  ');

  console.log(chalk.bold(header));
  console.log('─'.repeat(header.length));

  for (const e of entries) {
    const avgLabel = e.avgDaysBetweenReleases === -1 ? 'N/A' : String(e.avgDaysBetweenReleases);
    const row = [
      e.name.padEnd(30),
      e.currentVersion.padEnd(12),
      String(e.releasesLast90Days).padStart(5),
      String(e.releasesLast365Days).padStart(6),
      avgLabel.padStart(9),
      bandColor(e.velocityBand).padEnd(12),
      trendSymbol(e.trend).padEnd(8),
    ].join('  ');
    console.log(row);
    for (const flag of e.flags) {
      console.log(chalk.gray(`  ⚑ ${flag}`));
    }
  }

  const summary = summarizeVelocity(entries);
  console.log();
  console.log(
    `Total: ${summary.total}  ` +
    `Rapid: ${chalk.magenta(summary.rapid)}  ` +
    `Active: ${chalk.green(summary.active)}  ` +
    `Moderate: ${chalk.cyan(summary.moderate)}  ` +
    `Slow: ${chalk.yellow(summary.slow)}  ` +
    `Stagnant: ${chalk.red(summary.stagnant)}`
  );
}

export function registerChangelogVelocityCommand(program: Command): void {
  program
    .command('velocity')
    .description('Analyse changelog release velocity for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .action(async (opts) => {
      const config = await loadConfig();
      const client = createRegistryClient(config);
      const { dependencies } = await parsePackageJson(opts.path);

      const input = await Promise.all(
        dependencies.map(async (dep) => {
          try {
            const meta = await client.getPackageMetadata(dep.name);
            const releaseDates = Object.values(meta.time ?? {})
              .filter((t): t is string => typeof t === 'string' && t !== '')
              .map((t) => new Date(t))
              .filter((d) => !isNaN(d.getTime()));
            return { pkg: dep, releaseDates };
          } catch {
            return { pkg: dep, releaseDates: [] };
          }
        })
      );

      const entries = analyzeChangelogVelocity(input);
      printVelocityTable(entries);
    });
}
