import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { buildInsightEntry, summarizeInsights, InsightEntry } from '../core/dependency-insights';
import { createRegistryClient } from '../core/registry-client';

function gradeColor(grade: InsightEntry['grade']): string {
  switch (grade) {
    case 'A': return chalk.green(grade);
    case 'B': return chalk.cyan(grade);
    case 'C': return chalk.yellow(grade);
    case 'D': return chalk.magenta(grade);
    case 'F': return chalk.red(grade);
  }
}

export function printInsightsTable(entries: InsightEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)}${'Version'.padEnd(12)}${'Grade'.padEnd(8)}Insights`
    )
  );
  console.log('─'.repeat(80));
  for (const entry of entries) {
    const insights = entry.insights.length > 0 ? entry.insights.join('; ') : chalk.gray('No issues');
    console.log(
      `${entry.name.padEnd(30)}${entry.version.padEnd(12)}${gradeColor(entry.grade).padEnd(8)}${insights}`
    );
  }
}

export function registerInsightsCommand(program: Command): void {
  program
    .command('insights')
    .description('Show enriched insights for each dependency')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const parsed = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const entries: InsightEntry[] = [];

      for (const dep of parsed.dependencies) {
        try {
          const meta = await client.fetchPackageInfo(dep.name);
          entries.push(buildInsightEntry(dep, meta as Record<string, unknown>));
        } catch {
          entries.push(buildInsightEntry(dep, {}));
        }
      }

      if (opts.json) {
        console.log(JSON.stringify({ entries, summary: summarizeInsights(entries) }, null, 2));
        return;
      }

      printInsightsTable(entries);
      const summary = summarizeInsights(entries);
      console.log(
        `\n${chalk.bold('Summary:')} ${summary.total} packages — ` +
        `${chalk.green(summary.healthy + ' healthy')}, ` +
        `${chalk.yellow(summary.warnings + ' warnings')}, ` +
        `${chalk.red(summary.critical + ' critical')}`
      );
    });
}
