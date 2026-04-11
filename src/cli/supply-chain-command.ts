import { Command } from 'commander';
import chalk from 'chalk';
import {
  buildSupplyChainEntry,
  summarizeSupplyChain,
  SupplyChainEntry,
} from '../core/supply-chain-checker';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { fetchRegistryData } from '../core/registry-client';

function riskColor(risk: SupplyChainEntry['risk']): string {
  if (risk === 'high') return chalk.red(risk);
  if (risk === 'medium') return chalk.yellow(risk);
  return chalk.green(risk);
}

export function printSupplyChainTable(entries: SupplyChainEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('No supply chain risks detected.'));
    return;
  }

  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)}${'Version'.padEnd(12)}${'Risk'.padEnd(10)}Reasons`
    )
  );
  console.log('─'.repeat(80));

  for (const e of entries) {
    const risk = riskColor(e.risk);
    const reasons = e.reasons.join('; ') || '—';
    console.log(`${e.name.padEnd(30)}${e.version.padEnd(12)}${risk.padEnd(18)}${reasons}`);
  }
}

export function printSupplyChainSummary(entries: SupplyChainEntry[]): void {
  const summary = summarizeSupplyChain(entries);
  console.log(chalk.bold('\nSupply Chain Summary'));
  console.log(`  Total packages : ${summary.total}`);
  console.log(`  ${chalk.red('High risk')}     : ${summary.high}`);
  console.log(`  ${chalk.yellow('Medium risk')}   : ${summary.medium}`);
  console.log(`  ${chalk.green('Low risk')}      : ${summary.low}`);
}

export function registerSupplyChainCommand(program: Command): void {
  program
    .command('supply-chain')
    .description('Analyse supply chain risk for each dependency (install scripts, download counts)')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--high-only', 'Show only high-risk packages')
    .action(async (opts) => {
      const config = loadConfig();
      const pkgJson = parsePackageJson(opts.path);
      const deps = pkgJson.dependencies ?? [];

      const entries: SupplyChainEntry[] = [];
      for (const dep of deps) {
        try {
          const meta = await fetchRegistryData(dep.name, config);
          const versionMeta = meta.versions?.[dep.version] ?? {};
          entries.push(
            buildSupplyChainEntry(dep, {
              publishedAt: meta.time?.[dep.version] ?? null,
              scripts: versionMeta.scripts ?? {},
              downloadsLastWeek: meta.downloads?.lastWeek ?? null,
            })
          );
        } catch {
          // skip packages that fail to fetch
        }
      }

      const filtered = opts.highOnly ? entries.filter((e) => e.risk === 'high') : entries;
      printSupplyChainTable(filtered);
      printSupplyChainSummary(entries);
    });
}
