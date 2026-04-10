import { Command } from 'commander';
import chalk from 'chalk';
import { checkProvenances, summarizeProvenance, ProvenanceEntry } from '../core/provenance-checker';
import { parsePackageJson } from '../core/package-parser';
import { fetchRegistryData } from '../core/registry-client';

const riskColor = (level: string) => {
  if (level === 'low') return chalk.green(level);
  if (level === 'medium') return chalk.yellow(level);
  return chalk.red(level);
};

export function printProvenanceTable(entries: ProvenanceEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)} ${'Version'.padEnd(12)} ${'Provenance'.padEnd(12)} ${'Type'.padEnd(18)} Risk`
    )
  );
  console.log('─'.repeat(82));
  for (const e of entries) {
    const provenance = e.hasProvenance ? chalk.green('✔ verified') : chalk.red('✘ missing');
    const type = e.attestationType ?? chalk.gray('n/a');
    console.log(
      `${e.name.padEnd(30)} ${e.version.padEnd(12)} ${provenance.padEnd(20)} ${type.padEnd(18)} ${riskColor(e.riskLevel)}`
    );
  }
}

export function printProvenanceSummary(entries: ProvenanceEntry[]): void {
  const s = summarizeProvenance(entries);
  console.log(chalk.bold('\nProvenance Summary'));
  console.log(`  Total packages : ${s.total}`);
  console.log(`  Verified       : ${chalk.green(String(s.verified))}`);
  console.log(`  Unverified     : ${chalk.red(String(s.unverified))}`);
  console.log(`  High risk      : ${s.highRisk > 0 ? chalk.red(String(s.highRisk)) : chalk.green('0')}`);
}

export function registerProvenanceCommand(program: Command): void {
  program
    .command('provenance')
    .description('Check supply-chain provenance attestations for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const deps = await parsePackageJson(opts.path);
      const names = deps.map((d) => d.name);
      const registryData = await fetchRegistryData(names);
      const entries = checkProvenances(deps, registryData);

      if (opts.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }

      printProvenanceTable(entries);
      printProvenanceSummary(entries);
    });
}
