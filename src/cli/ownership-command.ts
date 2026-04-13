import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { checkOwnership, summarizeOwnership, OwnerEntry } from '../core/dependency-ownership-checker';
import { createRegistryClient } from '../core/registry-client';

function riskColor(risk: 'low' | 'medium' | 'high'): string {
  if (risk === 'high') return chalk.red(risk);
  if (risk === 'medium') return chalk.yellow(risk);
  return chalk.green(risk);
}

export function printOwnershipTable(entries: OwnerEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)}${'Owners'.padEnd(8)}${'Risk'.padEnd(10)}Reason`
    )
  );
  console.log('─'.repeat(80));
  for (const e of entries) {
    const name = e.name.padEnd(30);
    const count = String(e.ownerCount).padEnd(8);
    const risk = riskColor(e.risk).padEnd(18);
    console.log(`${name}${count}${risk}${e.reason}`);
  }
}

export function printOwnershipSummary(entries: OwnerEntry[]): void {
  const summary = summarizeOwnership(entries);
  console.log(chalk.bold('\nOwnership Summary'));
  console.log(`  Total packages : ${summary.total}`);
  console.log(`  No owner       : ${chalk.red(summary.noOwner)}`);
  console.log(`  Single owner   : ${chalk.yellow(summary.singleOwner)}`);
  console.log(`  Org-owned      : ${chalk.green(summary.orgOwned)}`);
}

export function registerOwnershipCommand(program: Command): void {
  program
    .command('ownership')
    .description('Check npm ownership and bus-factor risk for dependencies')
    .option('--filter <risk>', 'Filter by risk level: low, medium, high')
    .option('--json', 'Output results as JSON')
    .action(async (opts) => {
      const pkg = parsePackageJson(process.cwd());
      const client = createRegistryClient();

      const fetchOwners = async (name: string): Promise<string[]> => {
        const info = await client.getPackageInfo(name);
        return (info as any)?.maintainers?.map((m: any) => m.name ?? m) ?? [];
      };

      const allDeps = [
        ...pkg.dependencies,
        ...pkg.devDependencies,
      ];

      let entries = await checkOwnership(allDeps, fetchOwners);

      if (opts.filter) {
        entries = entries.filter((e) => e.risk === opts.filter);
      }

      if (opts.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }

      printOwnershipTable(entries);
      printOwnershipSummary(entries);
    });
}
