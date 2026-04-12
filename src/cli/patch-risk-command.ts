import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser.js';
import { createRegistryClient } from '../core/registry-client.js';
import { assessPatchRisks, PatchRiskEntry, PatchRiskLevel } from '../core/patch-risk-assessor.js';
import { loadConfig } from '../core/config-manager.js';

const riskColor: Record<PatchRiskLevel, (s: string) => string> = {
  safe: chalk.green,
  low: chalk.cyan,
  medium: chalk.yellow,
  high: chalk.red,
};

export function printPatchRiskTable(entries: PatchRiskEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.green('No pending updates to assess.'));
    return;
  }

  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)} ${'Current'.padEnd(12)} ${'Target'.padEnd(12)} ${'Type'.padEnd(8)} Risk`
    )
  );
  console.log('─'.repeat(75));

  for (const entry of entries) {
    const color = riskColor[entry.riskLevel];
    console.log(
      `${entry.name.padEnd(30)} ${entry.currentVersion.padEnd(12)} ${entry.targetVersion.padEnd(12)} ${entry.updateType.padEnd(8)} ${color(entry.riskLevel)}`
    );
    for (const reason of entry.reasons) {
      console.log(chalk.dim(`  • ${reason}`));
    }
  }
}

export function registerPatchRiskCommand(program: Command): void {
  program
    .command('patch-risk')
    .description('Assess the risk of applying pending dependency updates')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--high-only', 'Show only high-risk updates')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const pkg = await parsePackageJson(opts.path);
        const client = createRegistryClient(config);

        const deps = pkg.dependencies ?? [];
        const targetVersionMap: Record<string, string> = {};

        await Promise.all(
          deps.map(async (dep) => {
            try {
              const info = await client.getPackageInfo(dep.name);
              if (info?.latestVersion) {
                targetVersionMap[dep.name] = info.latestVersion;
              }
            } catch {
              // skip unavailable packages
            }
          })
        );

        const { entries, summary } = assessPatchRisks(deps as any, targetVersionMap);
        const filtered = opts.highOnly ? entries.filter((e) => e.riskLevel === 'high') : entries;

        printPatchRiskTable(filtered);

        console.log(
          `\nSummary — Total: ${summary.total} | ` +
            chalk.green(`Safe: ${summary.safe}`) + ' | ' +
            chalk.cyan(`Low: ${summary.low}`) + ' | ' +
            chalk.yellow(`Medium: ${summary.medium}`) + ' | ' +
            chalk.red(`High: ${summary.high}`)
        );
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
