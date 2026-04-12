import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';
import { analyzeDependencyAges, summarizeAges, DependencyAgeEntry } from '../core/dependency-age-analyzer';
import { loadConfig } from '../core/config-manager';

function riskColor(risk: DependencyAgeEntry['risk']): string {
  if (risk === 'high') return chalk.red(risk);
  if (risk === 'medium') return chalk.yellow(risk);
  return chalk.green(risk);
}

export function printAgeTable(entries: DependencyAgeEntry[]): void {
  const sorted = [...entries].sort((a, b) => (b.ageInDays ?? 0) - (a.ageInDays ?? 0));
  console.log(
    chalk.bold(
      `${'Package'.padEnd(30)} ${'Version'.padEnd(12)} ${'Age'.padEnd(10)} Risk`
    )
  );
  console.log('─'.repeat(60));
  for (const e of sorted) {
    console.log(
      `${e.name.padEnd(30)} ${e.currentVersion.padEnd(12)} ${e.ageLabel.padEnd(10)} ${riskColor(e.risk)}`
    );
  }
}

export function registerAgeCommand(program: Command): void {
  program
    .command('age')
    .description('Show how old each dependency version is based on its publish date')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--high-only', 'Show only high-risk (ancient) dependencies')
    .action(async (opts) => {
      const config = await loadConfig();
      const pkgJson = await parsePackageJson(opts.path);
      const client = createRegistryClient(config);

      const deps = pkgJson.dependencies;
      const publishDates: Record<string, Date | null> = {};

      for (const dep of deps) {
        try {
          const info = await client.getPackageInfo(dep.name);
          const versionTime = info.time?.[dep.currentVersion];
          publishDates[dep.name] = versionTime ? new Date(versionTime) : null;
        } catch {
          publishDates[dep.name] = null;
        }
      }

      let entries = analyzeDependencyAges(deps, publishDates);

      if (opts.highOnly) {
        entries = entries.filter((e) => e.risk === 'high');
      }

      if (entries.length === 0) {
        console.log(chalk.green('No dependencies matched the filter.'));
        return;
      }

      printAgeTable(entries);

      const summary = summarizeAges(entries);
      console.log('');
      console.log(
        `Summary: ${chalk.green(summary.fresh + ' fresh')}  ${chalk.yellow(summary.stale + ' stale')}  ${chalk.red(summary.ancient + ' ancient')}  (${summary.total} total)`
      );
    });
}
