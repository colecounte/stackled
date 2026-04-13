import type { Command } from 'commander';
import chalk from 'chalk';
import { createRegistryClient } from '../core/registry-client.js';
import { parsePackageJson } from '../core/package-parser.js';
import { analyzeChurn, summarizeChurn } from '../core/dependency-churn-analyzer.js';
import type { ChurnEntry } from '../core/dependency-churn-analyzer.js';

function churnColor(level: ChurnEntry['churnLevel']): string {
  switch (level) {
    case 'extreme': return chalk.red(level);
    case 'high': return chalk.yellow(level);
    case 'moderate': return chalk.cyan(level);
    default: return chalk.green(level);
  }
}

export function printChurnTable(entries: ChurnEntry[]): void {
  const sorted = [...entries].sort((a, b) => b.churnScore - a.churnScore);
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)}${'Releases'.padEnd(10)}${'Major'.padEnd(8)}${'Avg Days'.padEnd(10)}${'Score'.padEnd(8)}Level`
    )
  );
  console.log('─'.repeat(76));
  for (const e of sorted) {
    console.log(
      `${e.name.padEnd(30)}${String(e.releaseCount).padEnd(10)}${String(e.majorCount).padEnd(8)}${String(e.avgDaysBetweenReleases).padEnd(10)}${String(e.churnScore).padEnd(8)}${churnColor(e.churnLevel)}`
    );
  }
}

export function registerChurnCommand(program: Command): void {
  program
    .command('churn')
    .description('Analyze release churn rate for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--min-score <n>', 'Only show entries at or above this churn score', '0')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const pkg = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const minScore = parseInt(opts.minScore, 10);

      const versionsMap: Record<string, string[]> = {};
      const publishDatesMap: Record<string, Record<string, string>> = {};

      await Promise.all(
        pkg.dependencies.map(async (dep) => {
          try {
            const info = await client.fetchPackageInfo(dep.name);
            versionsMap[dep.name] = Object.keys(info.versions ?? {});
            publishDatesMap[dep.name] = (info.time as Record<string, string>) ?? {};
          } catch {
            versionsMap[dep.name] = [];
            publishDatesMap[dep.name] = {};
          }
        })
      );

      const entries = analyzeChurn(pkg.dependencies, versionsMap, publishDatesMap)
        .filter((e) => e.churnScore >= minScore);

      if (opts.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }

      printChurnTable(entries);

      const summary = summarizeChurn(entries);
      console.log(`\nTotal: ${summary.total} | High churn: ${chalk.yellow(summary.highChurn)} | Avg score: ${summary.avgChurnScore}`);
      if (summary.mostChurned) {
        console.log(`Most churned: ${chalk.red(summary.mostChurned)}`);
      }
    });
}
