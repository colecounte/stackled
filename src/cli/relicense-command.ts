import type { Command } from 'commander';
import chalk from 'chalk';
import { detectRelicensedDependencies } from '../core/dependency-relicense-detector';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';
import type { RelicenseEntry } from '../types';

function riskColor(risk: string): string {
  switch (risk) {
    case 'high': return chalk.red(risk);
    case 'medium': return chalk.yellow(risk);
    case 'low': return chalk.green(risk);
    default: return chalk.gray(risk);
  }
}

function printRelicenseTable(entries: RelicenseEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('✔ No relicensed dependencies detected.'));
    return;
  }

  console.log(chalk.bold('\nRelicensed Dependencies\n'));
  console.log(
    chalk.bold('Package'.padEnd(30)),
    chalk.bold('Previous'.padEnd(20)),
    chalk.bold('Current'.padEnd(20)),
    chalk.bold('Risk'),
  );
  console.log('─'.repeat(80));

  for (const entry of entries) {
    console.log(
      entry.name.padEnd(30),
      (entry.previousLicense ?? 'unknown').padEnd(20),
      (entry.currentLicense ?? 'unknown').padEnd(20),
      riskColor(entry.risk),
    );
    if (entry.note) {
      console.log(chalk.gray(`  → ${entry.note}`));
    }
  }

  const highCount = entries.filter((e) => e.risk === 'high').length;
  const medCount = entries.filter((e) => e.risk === 'medium').length;
  console.log('─'.repeat(80));
  console.log(
    `\nFound ${chalk.bold(String(entries.length))} relicensed package(s): ` +
    `${chalk.red(String(highCount))} high, ${chalk.yellow(String(medCount))} medium`,
  );
}

export function registerRelicenseCommand(program: Command): void {
  program
    .command('relicense')
    .description('Detect dependencies that have changed their license')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--risk <level>', 'Filter by minimum risk level (low|medium|high)')
    .action(async (options) => {
      try {
        const deps = parsePackageJson(options.path);
        const client = createRegistryClient();
        const packageInfoMap: Record<string, any> = {};

        for (const dep of deps) {
          try {
            const info = await client.getPackageInfo(dep.name);
            packageInfoMap[dep.name] = info;
          } catch {
            // skip packages that fail to resolve
          }
        }

        let results = detectRelicensedDependencies(deps, packageInfoMap);

        if (options.risk) {
          const levels = ['low', 'medium', 'high'];
          const minIdx = levels.indexOf(options.risk);
          if (minIdx !== -1) {
            results = results.filter((e) => levels.indexOf(e.risk) >= minIdx);
          }
        }

        printRelicenseTable(results);

        const hasHigh = results.some((e) => e.risk === 'high');
        if (hasHigh) process.exit(1);
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
