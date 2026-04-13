import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';
import { analyzeDownloadTrends, summarizeDownloadTrends, DownloadTrendEntry, TrendDirection } from '../core/dependency-download-trends';
import { PackageInfo } from '../types';

function trendColor(direction: TrendDirection): string {
  switch (direction) {
    case 'rising': return chalk.green('↑ rising');
    case 'stable': return chalk.blue('→ stable');
    case 'declining': return chalk.red('↓ declining');
    default: return chalk.gray('? unknown');
  }
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function printDownloadTrendsTable(entries: DownloadTrendEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)}${'Weekly'.padStart(10)}${'Monthly'.padStart(12)}${'Trend'.padStart(16)}${'Grade'.padStart(8)}`
    )
  );
  console.log('─'.repeat(78));
  for (const e of entries) {
    const grade =
      e.grade === 'A' ? chalk.green(e.grade) :
      e.grade === 'B' ? chalk.cyan(e.grade) :
      e.grade === 'C' ? chalk.yellow(e.grade) :
      e.grade === 'D' ? chalk.magenta(e.grade) :
      chalk.red(e.grade);
    console.log(
      `${e.name.padEnd(30)}${formatDownloads(e.weeklyDownloads).padStart(10)}${formatDownloads(e.monthlyDownloads).padStart(12)}${trendColor(e.trend).padStart(16)}${grade.padStart(8)}`
    );
  }
}

export function registerDownloadTrendsCommand(program: Command): void {
  program
    .command('download-trends')
    .description('Analyze npm download trends for your dependencies')
    .option('--path <path>', 'Path to package.json', 'package.json')
    .option('--min-grade <grade>', 'Filter to packages at or below grade (A-F)')
    .action(async (opts) => {
      const parsed = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const stats = new Map<string, { weekly: number; monthly: number }>();

      for (const pkg of parsed.dependencies as PackageInfo[]) {
        try {
          const info = await client.getPackageInfo(pkg.name);
          const weekly: number = (info as any).downloads?.weekly ?? 0;
          const monthly: number = (info as any).downloads?.monthly ?? 0;
          stats.set(pkg.name, { weekly, monthly });
        } catch {
          stats.set(pkg.name, { weekly: 0, monthly: 0 });
        }
      }

      let entries = analyzeDownloadTrends(parsed.dependencies as PackageInfo[], stats);

      if (opts.minGrade) {
        const order = ['A', 'B', 'C', 'D', 'F'];
        const threshold = order.indexOf(opts.minGrade.toUpperCase());
        if (threshold !== -1) {
          entries = entries.filter((e) => order.indexOf(e.grade) >= threshold);
        }
      }

      printDownloadTrendsTable(entries);

      const summary = summarizeDownloadTrends(entries);
      console.log(`\nTotal: ${summary.total}  Rising: ${chalk.green(summary.rising)}  Stable: ${chalk.blue(summary.stable)}  Declining: ${chalk.red(summary.declining)}  Unknown: ${chalk.gray(summary.unknown)}`);
    });
}
