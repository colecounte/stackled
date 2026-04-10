import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeTransitiveRisks, summarizeTransitiveRisks } from '../core/transitive-risk-analyzer';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import type { TransitiveRiskEntry } from '../types';

function riskColor(level: string): string {
  switch (level) {
    case 'critical': return chalk.red(level);
    case 'high':     return chalk.yellow(level);
    case 'medium':   return chalk.cyan(level);
    default:         return chalk.green(level);
  }
}

export function printTransitiveTable(entries: TransitiveRiskEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('✔  No transitive risks detected.'));
    return;
  }

  const col = [28, 10, 8, 40];
  const header = [
    'Package'.padEnd(col[0]),
    'Risk'.padEnd(col[1]),
    'Depth'.padEnd(col[2]),
    'Reason',
  ].join('  ');

  console.log(chalk.bold(header));
  console.log('─'.repeat(col.reduce((a, b) => a + b, 0) + col.length * 2));

  for (const e of entries) {
    const row = [
      e.name.padEnd(col[0]),
      riskColor(e.riskLevel).padEnd(col[1] + 10),
      String(e.depth).padEnd(col[2]),
      e.reason,
    ].join('  ');
    console.log(row);
  }
}

export function registerTransitiveCommand(program: Command): void {
  program
    .command('transitive')
    .description('Analyze transitive (indirect) dependency risks')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--min-risk <level>', 'Minimum risk level to display (low|medium|high|critical)', 'low')
    .action(async (opts) => {
      try {
        const config  = await loadConfig();
        const pkgJson = await parsePackageJson(opts.path);
        const entries = await analyzeTransitiveRisks(pkgJson.dependencies ?? {}, config);

        const levels   = ['low', 'medium', 'high', 'critical'];
        const minIdx   = levels.indexOf(opts.minRisk);
        const filtered = entries.filter(e => levels.indexOf(e.riskLevel) >= minIdx);

        printTransitiveTable(filtered);

        const summary = summarizeTransitiveRisks(filtered);
        console.log();
        console.log(chalk.bold('Summary'));
        console.log(`  Total risky transitive deps : ${summary.total}`);
        console.log(`  Critical                    : ${chalk.red(String(summary.critical))}`);
        console.log(`  High                        : ${chalk.yellow(String(summary.high))}`);
        console.log(`  Medium                      : ${chalk.cyan(String(summary.medium))}`);
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
