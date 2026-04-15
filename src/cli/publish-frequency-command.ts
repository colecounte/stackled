import chalk from 'chalk';
import type { Command } from 'commander';
import { analyzePublishFrequency } from '../core/dependency-publish-frequency';
import {
  buildPublishFrequencyReport,
  formatPublishFrequencyReportAsJson,
  formatPublishFrequencyReportAsText,
} from '../core/dependency-publish-frequency-reporter';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';
import type { PublishFrequencyEntry } from '../types';

function bandColor(band: string): string {
  switch (band) {
    case 'high': return chalk.green(band);
    case 'moderate': return chalk.yellow(band);
    case 'low': return chalk.red(band);
    case 'dormant': return chalk.gray(band);
    default: return band;
  }
}

export function printPublishFrequencyTable(entries: PublishFrequencyEntry[]): void {
  const header = `${'Package'.padEnd(30)} ${'Band'.padEnd(10)} ${'Avg Days'.padEnd(10)} ${'Releases'.padEnd(10)} Summary`;
  console.log(chalk.bold(header));
  console.log('─'.repeat(80));
  for (const e of entries) {
    const line = [
      e.name.padEnd(30),
      bandColor(e.frequencyBand).padEnd(20),
      String(e.avgDaysBetweenReleases).padEnd(10),
      String(e.releaseCount).padEnd(10),
      e.summary,
    ].join(' ');
    console.log(line);
  }
}

export function registerPublishFrequencyCommand(program: Command): void {
  program
    .command('publish-frequency')
    .description('Analyze how frequently each dependency publishes new releases')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('-f, --format <format>', 'Output format: table | json | text', 'table')
    .option('--dormant-only', 'Show only dormant packages', false)
    .action(async (opts) => {
      const pkg = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const deps = Object.entries(pkg.dependencies ?? {}).map(([name, version]) => ({
        name,
        currentVersion: String(version),
        specifiedVersion: String(version),
      }));

      const entries = await analyzePublishFrequency(deps as any, client);
      const filtered = opts.dormantOnly
        ? entries.filter((e) => e.frequencyBand === 'dormant')
        : entries;

      const report = buildPublishFrequencyReport(filtered);

      if (opts.format === 'json') {
        console.log(formatPublishFrequencyReportAsJson(report));
      } else if (opts.format === 'text') {
        console.log(formatPublishFrequencyReportAsText(report));
      } else {
        printPublishFrequencyTable(filtered);
        console.log();
        console.log(formatPublishFrequencyReportAsText(report));
      }
    });
}
