import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { fetchRegistryData } from '../core/registry-client';
import { detectStaleness, summarizeStaleness, StalenessEntry } from '../core/staleness-detector';

const LABEL_COLOR: Record<StalenessEntry['label'], chalk.Chalk> = {
  current: chalk.green,
  stale: chalk.yellow,
  'very-stale': chalk.red,
  ancient: chalk.bgRed.white,
};

export function printStalenessTable(entries: StalenessEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('All dependencies are up-to-date!'));
    return;
  }
  const header = ['Package', 'Current', 'Latest', 'Days Since Release', 'Majors Behind', 'Score', 'Status'];
  console.log(chalk.bold(header.join('\t')));
  for (const e of entries) {
    const color = LABEL_COLOR[e.label];
    console.log(
      [
        e.name,
        e.currentVersion,
        e.latestVersion,
        e.daysSinceRelease,
        e.majorsBehind,
        e.stalenessScore,
        color(e.label),
      ].join('\t')
    );
  }
}

export function registerStalenessCommand(program: Command): void {
  program
    .command('staleness')
    .description('Detect stale dependencies based on version and release age')
    .option('--filter <label>', 'Filter by label: current | stale | very-stale | ancient')
    .option('--json', 'Output results as JSON')
    .action(async (opts) => {
      const pkgJson = parsePackageJson(process.cwd());
      const deps = pkgJson.dependencies ?? [];

      const latestMap: Record<string, { version: string; publishedAt: string }> = {};
      for (const dep of deps) {
        try {
          const data = await fetchRegistryData(dep.name);
          if (data?.version && data?.time?.[data.version]) {
            latestMap[dep.name] = { version: data.version, publishedAt: data.time[data.version] };
          }
        } catch {
          // skip unavailable packages
        }
      }

      let entries = detectStaleness(deps, latestMap);
      if (opts.filter) {
        entries = entries.filter((e) => e.label === opts.filter);
      }

      if (opts.json) {
        console.log(JSON.stringify({ entries, summary: summarizeStaleness(entries) }, null, 2));
        return;
      }

      printStalenessTable(entries);
      const summary = summarizeStaleness(entries);
      console.log();
      console.log(
        chalk.bold(
          `Summary: ${summary.total} total — ` +
          `${chalk.green(summary.current + ' current')}, ` +
          `${chalk.yellow(summary.stale + ' stale')}, ` +
          `${chalk.red(summary.verystale + ' very-stale')}, ` +
          `${chalk.bgRed.white(summary.ancient + ' ancient')}`
        )
      );
    });
}
