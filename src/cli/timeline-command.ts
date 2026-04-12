import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { createRegistryClient } from '../core/registry-client';
import { parsePackageJson } from '../core/package-parser';
import { buildChangelogTimeline, TimelineEntry } from '../core/changelog-timeline';

function typeColor(type: TimelineEntry['type']): string {
  switch (type) {
    case 'major': return chalk.red(type);
    case 'minor': return chalk.yellow(type);
    case 'patch': return chalk.green(type);
    default: return chalk.gray(type);
  }
}

function printTimelineTable(entries: TimelineEntry[], limit: number): void {
  const rows = entries.slice(0, limit);
  if (rows.length === 0) {
    console.log(chalk.gray('No timeline entries found.'));
    return;
  }
  console.log(
    chalk.bold(
      `${'Package'.padEnd(30)} ${'Version'.padEnd(12)} ${'Type'.padEnd(8)} ${'Date'.padEnd(12)} Days Ago`
    )
  );
  console.log('─'.repeat(78));
  for (const e of rows) {
    console.log(
      `${e.name.padEnd(30)} ${e.version.padEnd(12)} ${typeColor(e.type).padEnd(8)} ${e.date.slice(0, 10).padEnd(12)} ${e.daysAgo >= 0 ? e.daysAgo : 'N/A'}`
    );
  }
}

export function registerTimelineCommand(program: Command): void {
  program
    .command('timeline')
    .description('Show a chronological release timeline for all dependencies')
    .option('--limit <n>', 'Max number of entries to display', '50')
    .option('--type <type>', 'Filter by release type: major, minor, patch')
    .option('--package-json <path>', 'Path to package.json', 'package.json')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = createRegistryClient(config);
        const { dependencies } = await parsePackageJson(opts.packageJson);
        const limit = parseInt(opts.limit, 10);

        const packages = await Promise.all(
          dependencies.map((d) => client.getPackageInfo(d.name).catch(() => null))
        );
        const valid = packages.filter(Boolean) as Awaited<ReturnType<typeof client.getPackageInfo>>[];

        const timeline = buildChangelogTimeline(valid);
        let entries = timeline.entries;

        if (opts.type) {
          entries = entries.filter((e) => e.type === opts.type);
        }

        console.log(chalk.bold.cyan(`\n📅 Dependency Release Timeline\n`));
        printTimelineTable(entries, limit);
        console.log(
          `\n${chalk.bold('Total releases:')} ${timeline.totalReleases}  ` +
          `${chalk.bold('Span:')} ${timeline.spanDays} days  ` +
          `${chalk.bold('Most active:')} ${timeline.mostActivePackage ?? 'N/A'}\n`
        );
      } catch (err: unknown) {
        console.error(chalk.red('Error:'), (err as Error).message);
        process.exit(1);
      }
    });
}
