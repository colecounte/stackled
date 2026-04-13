import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';
import {
  checkDependencyNamespaces,
  summarizeNamespaces,
  NamespaceEntry,
} from '../core/dependency-namespace-checker';

function riskColor(risk: NamespaceEntry['risk']): string {
  switch (risk) {
    case 'high': return chalk.red(risk);
    case 'medium': return chalk.yellow(risk);
    default: return chalk.green(risk);
  }
}

export function printNamespaceTable(entries: NamespaceEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(36)} ${'Namespace'.padEnd(20)} ${'Scoped'.padEnd(8)} ${'Peers'.padEnd(7)} Risk`
    )
  );
  console.log('─'.repeat(82));
  for (const e of entries) {
    const scoped = e.isScoped ? chalk.cyan('yes') : chalk.gray('no');
    const flags = e.flags.length ? chalk.dim(` [${e.flags.join(', ')}]`) : '';
    console.log(
      `${e.name.padEnd(36)} ${e.namespace.padEnd(20)} ${scoped.padEnd(14)} ${String(e.peerCount).padEnd(7)} ${riskColor(e.risk)}${flags}`
    );
  }
}

export function printNamespaceSummary(entries: NamespaceEntry[]): void {
  const summary = summarizeNamespaces(entries);
  console.log(chalk.bold('\nNamespace Summary'));
  console.log(`  Total packages : ${summary.total}`);
  console.log(`  Scoped         : ${chalk.cyan(summary.scoped)}`);
  console.log(`  Unscoped       : ${summary.unscoped}`);
  console.log(`  High risk      : ${summary.highRisk > 0 ? chalk.red(summary.highRisk) : chalk.green(summary.highRisk)}`);
  const topNamespaces = Object.entries(summary.namespaces)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  if (topNamespaces.length) {
    console.log(chalk.bold('\n  Top Namespaces:'));
    for (const [ns, pkgs] of topNamespaces) {
      console.log(`    ${ns.padEnd(24)} ${pkgs.length} package(s)`);
    }
  }
}

export function registerNamespaceCommand(program: Command): void {
  program
    .command('namespace')
    .description('Analyse dependency namespaces and detect collision risks')
    .option('--json', 'Output results as JSON')
    .option('--high-risk-only', 'Show only high-risk entries')
    .action(async (opts) => {
      const parsed = parsePackageJson(process.cwd());
      const client = createRegistryClient();
      const packages = await Promise.all(
        parsed.dependencies.map((d) => client.getPackageInfo(d.name))
      );
      let entries = checkDependencyNamespaces(packages);
      if (opts.highRiskOnly) {
        entries = entries.filter((e) => e.risk === 'high');
      }
      if (opts.json) {
        console.log(JSON.stringify({ entries, summary: summarizeNamespaces(entries) }, null, 2));
        return;
      }
      printNamespaceTable(entries);
      printNamespaceSummary(entries);
    });
}
