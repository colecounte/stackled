import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';
import {
  buildMaintainerRiskEntry,
  summarizeMaintainerRisks,
  MaintainerRiskEntry,
  MaintainerRiskLevel,
} from '../core/dependency-maintainer-risk';

function riskColor(level: MaintainerRiskLevel): string {
  switch (level) {
    case 'critical': return chalk.red(level);
    case 'high': return chalk.yellow(level);
    case 'medium': return chalk.cyan(level);
    default: return chalk.green(level);
  }
}

export function printMaintainerRiskTable(entries: MaintainerRiskEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('No maintainer risk issues found.'));
    return;
  }
  console.log(
    chalk.bold(
      `${'Package'.padEnd(30)} ${'Maintainers'.padEnd(13)} ${'Days Since Pub'.padEnd(16)} ${'Risk'.padEnd(10)} Flags`
    )
  );
  for (const e of entries) {
    const flags = e.flags.length ? e.flags.join(', ') : '-';
    console.log(
      `${e.name.padEnd(30)} ${String(e.maintainerCount).padEnd(13)} ${String(e.daysSinceLastPublish).padEnd(16)} ${riskColor(e.riskLevel).padEnd(10)} ${flags}`
    );
  }
}

export function registerMaintainerRiskCommand(program: Command): void {
  program
    .command('maintainer-risk')
    .description('Assess maintainer risk across your dependencies')
    .option('--min-risk <level>', 'Minimum risk level to show (low|medium|high|critical)', 'medium')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const config = await loadConfig();
      const pkg = await parsePackageJson(config.packageJsonPath ?? 'package.json');
      const client = createRegistryClient();
      const entries: MaintainerRiskEntry[] = [];

      for (const dep of pkg.dependencies) {
        try {
          const info = await client.getPackageInfo(dep.name);
          const maintainerCount = (info.maintainers ?? []).length;
          const lastPublish = info.time?.modified
            ? Math.floor((Date.now() - new Date(info.time.modified).getTime()) / 86400000)
            : 9999;
          entries.push(buildMaintainerRiskEntry(dep, maintainerCount, lastPublish));
        } catch {
          // skip packages that fail to fetch
        }
      }

      const levels: MaintainerRiskLevel[] = ['low', 'medium', 'high', 'critical'];
      const minIdx = levels.indexOf(opts.minRisk as MaintainerRiskLevel);
      const filtered = entries.filter((e) => levels.indexOf(e.riskLevel) >= minIdx);
      const summary = summarizeMaintainerRisks(filtered);

      if (opts.json) {
        console.log(JSON.stringify({ entries: filtered, summary }, null, 2));
        return;
      }

      printMaintainerRiskTable(filtered);
      console.log(`\nTotal: ${summary.total} | Critical: ${summary.critical} | High: ${summary.high} | Medium: ${summary.medium}`);
    });
}
