import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { analyzeTrend, TrendSummary } from '../core/trend-analyzer';
import { fetchRegistryData } from '../core/registry-client';

const TREND_ICONS: Record<TrendSummary['trend'], string> = {
  accelerating: '📈',
  steady: '➡️',
  slowing: '📉',
  abandoned: '💀',
};

const FREQ_COLORS: Record<TrendSummary['releaseFrequency'], chalk.Chalk> = {
  high: chalk.green,
  medium: chalk.cyan,
  low: chalk.yellow,
  stale: chalk.red,
};

export function printTrendTable(summaries: TrendSummary[]): void {
  if (summaries.length === 0) {
    console.log(chalk.yellow('No trend data available.'));
    return;
  }
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)} ${'Frequency'.padEnd(10)} ${'Last Release'.padEnd(14)} ${'Releases/90d'.padEnd(14)} Trend`
    )
  );
  console.log('─'.repeat(80));
  for (const s of summaries) {
    const freqColor = FREQ_COLORS[s.releaseFrequency];
    const icon = TREND_ICONS[s.trend];
    console.log(
      `${s.packageName.padEnd(30)} ` +
        `${freqColor(s.releaseFrequency.padEnd(10))} ` +
        `${String(s.daysSinceLastRelease + 'd ago').padEnd(14)} ` +
        `${String(s.releasesLast90Days).padEnd(14)} ` +
        `${icon} ${s.trend}`
    );
  }
  console.log();
}

export function registerTrendCommand(program: Command): void {
  program
    .command('trend')
    .description('Analyze release trend activity for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--filter <trend>', 'Filter by trend: accelerating|steady|slowing|abandoned')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const packages = await parsePackageJson(opts.path);
        const summaries: TrendSummary[] = [];

        for (const dep of packages) {
          const data = await fetchRegistryData(dep.name, config);
          if (!data) continue;
          const history = Object.entries(data.time || {}).map(([version, date]) => ({
            version,
            date: date as string,
          }));
          summaries.push(analyzeTrend(dep, history));
        }

        const filtered = opts.filter
          ? summaries.filter((s) => s.trend === opts.filter)
          : summaries;

        printTrendTable(filtered);
      } catch (err) {
        console.error(chalk.red('Failed to analyze trends:'), (err as Error).message);
        process.exit(1);
      }
    });
}
