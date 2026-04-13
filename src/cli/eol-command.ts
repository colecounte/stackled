import { Command } from 'commander';
import chalk from 'chalk';
import { checkDependencyEol } from '../core/dependency-eol-checker';
import { parsePackageJson } from '../core/package-parser';
import type { EolEntry } from '../types';

function riskColor(risk: string): string {
  switch (risk) {
    case 'critical': return chalk.red(risk);
    case 'high':     return chalk.yellow(risk);
    case 'medium':   return chalk.cyan(risk);
    case 'low':      return chalk.green(risk);
    default:         return chalk.gray(risk);
  }
}

export function printEolTable(entries: EolEntry[]): void {
  const relevant = entries.filter(e => e.risk !== 'none');
  if (relevant.length === 0) {
    console.log(chalk.green('✔ No EOL concerns found.'));
    return;
  }

  console.log('');
  console.log(
    chalk.bold('Package'.padEnd(30)),
    chalk.bold('Version'.padEnd(12)),
    chalk.bold('EOL Date'.padEnd(14)),
    chalk.bold('Days Until EOL'.padEnd(18)),
    chalk.bold('Risk')
  );
  console.log('─'.repeat(90));

  for (const entry of relevant) {
    const days = entry.daysUntilEol !== null
      ? (entry.daysUntilEol < 0 ? chalk.red(String(entry.daysUntilEol)) : String(entry.daysUntilEol))
      : chalk.gray('N/A');
    console.log(
      entry.name.padEnd(30),
      entry.version.padEnd(12),
      (entry.eolDate ?? 'N/A').padEnd(14),
      days.toString().padEnd(18),
      riskColor(entry.risk)
    );
  }

  const critical = relevant.filter(e => e.risk === 'critical').length;
  const high     = relevant.filter(e => e.risk === 'high').length;
  console.log('');
  console.log(
    chalk.bold('Summary:'),
    chalk.red(`${critical} critical`),
    chalk.yellow(`${high} high`),
    `of ${relevant.length} flagged`
  );
}

export function registerEolCommand(program: Command): void {
  program
    .command('eol')
    .description('Check dependencies for end-of-life (EOL) status')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--only-risky', 'Show only critical and high risk entries')
    .action(async (opts) => {
      try {
        const deps = await parsePackageJson(opts.path);
        let entries = checkDependencyEol(deps);

        if (opts.onlyRisky) {
          entries = entries.filter(e => e.risk === 'critical' || e.risk === 'high');
        }

        printEolTable(entries);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });
}
