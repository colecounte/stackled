import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser.js';
import { createRegistryClient } from '../core/registry-client.js';
import { buildCompatibilityEntry, buildCompatibilityMatrix, CompatibilityEntry } from '../core/compatibility-matrix.js';
import { ParsedDependency } from '../types/index.js';

const riskColor = (risk: string) => {
  if (risk === 'high') return chalk.red(risk);
  if (risk === 'medium') return chalk.yellow(risk);
  return chalk.green(risk);
};

export function printCompatibilityTable(entries: CompatibilityEntry[]): void {
  console.log(
    chalk.bold(`\n${'Package'.padEnd(30)} ${'Current'.padEnd(12)} ${'Target'.padEnd(12)} ${'Risk'.padEnd(8)} Notes`)
  );
  console.log('─'.repeat(90));
  for (const e of entries) {
    const notes = e.notes.length ? e.notes[0] : '—';
    console.log(
      `${e.name.padEnd(30)} ${e.currentVersion.padEnd(12)} ${e.targetVersion.padEnd(12)} ${riskColor(e.risk).padEnd(8)} ${notes}`
    );
  }
}

export function registerCompatibilityCommand(program: Command): void {
  program
    .command('compat')
    .description('Check version compatibility against latest releases')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--only-breaking', 'Show only breaking changes')
    .action(async (opts) => {
      const parsed = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const entries: CompatibilityEntry[] = [];

      for (const dep of parsed.dependencies) {
        try {
          const info = await client.getPackageInfo(dep.name);
          const latest = info['dist-tags']?.latest ?? dep.currentVersion;
          const nodeRange = info.engines?.node ?? null;
          entries.push(buildCompatibilityEntry(dep as ParsedDependency, latest, nodeRange));
        } catch {
          // skip unresolvable packages
        }
      }

      const filtered = opts.onlyBreaking ? entries.filter((e) => e.breakingChange) : entries;
      const matrix = buildCompatibilityMatrix(filtered);

      printCompatibilityTable(filtered);
      console.log(`\n${chalk.bold('Summary:')} ${matrix.totalChecked} checked, ` +
        `${chalk.red(String(matrix.breakingCount))} breaking, ` +
        `${chalk.yellow(String(matrix.incompatibleCount))} incompatible`);
    });
}
