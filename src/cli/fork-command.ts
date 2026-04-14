import { Command } from 'commander';
import chalk from 'chalk';
import { detectForks, summarizeForks, ForkEntry } from '../core/dependency-fork-detector';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';

function riskColor(risk: string): string {
  switch (risk) {
    case 'high': return chalk.red(risk);
    case 'medium': return chalk.yellow(risk);
    default: return chalk.green(risk);
  }
}

export function printForkTable(entries: ForkEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('No fork concerns detected.'));
    return;
  }

  const header = `${'Package'.padEnd(30)} ${'Risk'.padEnd(10)} ${'Forks'.padEnd(8)} ${'Original'.padEnd(25)} Flags`;
  console.log(chalk.bold(header));
  console.log('─'.repeat(90));

  for (const entry of entries) {
    const name = entry.name.padEnd(30);
    const risk = riskColor(entry.risk).padEnd(20);
    const forks = String(entry.forks ?? '—').padEnd(8);
    const original = (entry.originalPackage ?? '—').padEnd(25);
    const flags = entry.flags.join(', ') || '—';
    console.log(`${name} ${risk} ${forks} ${original} ${flags}`);
  }
}

export function registerForkCommand(program: Command): void {
  program
    .command('forks [path]')
    .description('Detect forked dependencies and assess associated risks')
    .option('--json', 'Output results as JSON')
    .option('--risk <level>', 'Filter by minimum risk level (low|medium|high)')
    .action(async (pkgPath: string | undefined, opts: { json?: boolean; risk?: string }) => {
      try {
        const config = await loadConfig();
        const resolvedPath = pkgPath ?? config.packageJsonPath ?? 'package.json';
        const packages = await parsePackageJson(resolvedPath);
        const entries = detectForks(packages as any[]);

        const filtered = opts.risk
          ? entries.filter(e => {
              const levels = ['low', 'medium', 'high'];
              return levels.indexOf(e.risk) >= levels.indexOf(opts.risk!);
            })
          : entries;

        if (opts.json) {
          console.log(JSON.stringify({ entries: filtered, summary: summarizeForks(filtered) }, null, 2));
          return;
        }

        printForkTable(filtered);

        const summary = summarizeForks(filtered);
        console.log('');
        console.log(`Total: ${summary.total}  High Risk: ${chalk.red(String(summary.highRisk))}  Medium Risk: ${chalk.yellow(String(summary.mediumRisk))}`);
      } catch (err: unknown) {
        console.error(chalk.red('Error running fork detection:'), (err as Error).message);
        process.exit(1);
      }
    });
}
