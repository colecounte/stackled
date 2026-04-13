import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { checkDependencyOrigins, summarizeOrigins, OriginEntry, OriginRisk } from '../core/dependency-origin-checker';
import { createRegistryClient } from '../core/registry-client';

function riskColor(risk: OriginRisk): string {
  if (risk === 'low') return chalk.green(risk);
  if (risk === 'medium') return chalk.yellow(risk);
  return chalk.red(risk);
}

export function printOriginTable(entries: OriginEntry[]): void {
  const col1 = 32, col2 = 14, col3 = 10, col4 = 10;
  console.log(
    chalk.bold('Package'.padEnd(col1)) +
    chalk.bold('Version'.padEnd(col2)) +
    chalk.bold('Origin'.padEnd(col3)) +
    chalk.bold('Risk'.padEnd(col4))
  );
  console.log('─'.repeat(col1 + col2 + col3 + col4));
  for (const e of entries) {
    const line =
      e.name.padEnd(col1) +
      e.version.padEnd(col2) +
      e.origin.padEnd(col3) +
      riskColor(e.risk).padEnd(col4);
    console.log(line);
    for (const flag of e.flags) {
      console.log(chalk.dim(`  ⚠ ${flag}`));
    }
  }
}

export function registerOriginCommand(program: Command): void {
  program
    .command('origin')
    .description('Detect the origin of each dependency (npm, git, local, etc.)')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--high-risk-only', 'Show only high-risk origins')
    .action(async (opts) => {
      const pkgJson = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const packages = await Promise.all(
        Object.entries({ ...pkgJson.dependencies, ...pkgJson.devDependencies }).map(
          async ([name, version]) => {
            try {
              const info = await client.getPackageInfo(name);
              return { ...info, version: version as string };
            } catch {
              return { name, version: version as string, currentVersion: version as string, latestVersion: version as string };
            }
          }
        )
      );
      let entries = checkDependencyOrigins(packages as any);
      if (opts.highRiskOnly) entries = entries.filter((e) => e.risk === 'high');
      printOriginTable(entries);
      const summary = summarizeOrigins(entries);
      console.log();
      console.log(chalk.bold(`Total: ${summary.total}  High-risk: ${summary.highRisk}  Non-npm: ${summary.total - summary.byOrigin.npm}`));
    });
}
