import { Command } from 'commander';
import chalk from 'chalk';
import { trackBreakingChanges, summarizeBreakingChanges } from '../core/dependency-breaking-change-tracker';
import type { BreakingChangeEntry } from '../core/dependency-breaking-change-tracker';
import { parsePackageJson } from '../core/package-parser';
import { loadConfig } from '../core/config-manager';

function riskColor(level: BreakingChangeEntry['riskLevel']): string {
  switch (level) {
    case 'critical': return chalk.bgRed.white(level.toUpperCase());
    case 'high':     return chalk.red(level);
    case 'medium':   return chalk.yellow(level);
    default:         return chalk.gray(level);
  }
}

function printBreakingChangeTable(entries: BreakingChangeEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('✔ No breaking changes detected across upgraded dependencies.'));
    return;
  }

  console.log(`\n${chalk.bold('Breaking Change Tracker')}\n`);
  console.log(
    chalk.bold('Package'.padEnd(28)),
    chalk.bold('From'.padEnd(12)),
    chalk.bold('To'.padEnd(12)),
    chalk.bold('Risk'.padEnd(10)),
    chalk.bold('Changes')
  );
  console.log('─'.repeat(80));

  for (const e of entries) {
    console.log(
      e.name.padEnd(28),
      e.fromVersion.padEnd(12),
      e.toVersion.padEnd(12),
      riskColor(e.riskLevel).padEnd(10),
      String(e.breakingChanges.length)
    );
    if (e.migrationNotes) {
      console.log(chalk.dim(`   ↳ ${e.migrationNotes}`));
    }
  }

  const summary = summarizeBreakingChanges(entries);
  console.log('─'.repeat(80));
  console.log(
    `\n${chalk.bold('Summary:')} ${summary.packagesAffected} package(s) affected,`,
    `${summary.total} total breaking change(s).`,
    summary.critical > 0 ? chalk.bgRed.white(` ${summary.critical} CRITICAL `) : ''
  );
}

export function registerBreakingChangeCommand(program: Command): void {
  program
    .command('breaking')
    .description('Track breaking changes in upgraded dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const config = await loadConfig();
      const packages = await parsePackageJson(opts.path);
      // In real usage these would come from snapshot diff; stub empty for CLI wiring
      const previousVersions: Record<string, string> = {};
      const changeMap: Record<string, import('../types').BreakingChange[]> = {};
      const entries = trackBreakingChanges(packages, previousVersions, changeMap);

      if (opts.json) {
        console.log(JSON.stringify({ entries, summary: summarizeBreakingChanges(entries) }, null, 2));
      } else {
        printBreakingChangeTable(entries);
      }
    });
}
