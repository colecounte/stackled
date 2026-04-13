import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager.js';
import { parsePackageJson } from '../core/package-parser.js';
import { createRegistryClient } from '../core/registry-client.js';
import { planUpdates, UpdateStrategy, UpdatePlan } from '../core/dependency-update-planner.js';

function strategyColor(safe: boolean): (s: string) => string {
  return safe ? chalk.green : chalk.yellow;
}

export function printUpdatePlanTable(plans: UpdatePlan[]): void {
  if (plans.length === 0) {
    console.log(chalk.gray('  No updates available.'));
    return;
  }
  console.log(
    chalk.bold(
      `  ${'Package'.padEnd(30)} ${'Current'.padEnd(12)} ${'Target'.padEnd(12)} ${'Type'.padEnd(8)} Safe`
    )
  );
  for (const p of plans) {
    const safe = strategyColor(p.isSafe)(p.isSafe ? '✔' : '✘');
    const type = p.updateType === 'major'
      ? chalk.red(p.updateType)
      : p.updateType === 'minor'
      ? chalk.yellow(p.updateType)
      : chalk.green(p.updateType);
    console.log(
      `  ${p.name.padEnd(30)} ${p.currentVersion.padEnd(12)} ${p.targetVersion.padEnd(12)} ${type.padEnd(16)} ${safe}`
    );
  }
}

export function registerUpdatePlanCommand(program: Command): void {
  program
    .command('update-plan')
    .description('Generate a safe update plan for your dependencies')
    .option('-s, --strategy <strategy>', 'Update strategy: patch-only | minor-safe | major-all | security-only', 'minor-safe')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const config = await loadConfig();
      const strategy = (opts.strategy ?? config.defaultStrategy ?? 'minor-safe') as UpdateStrategy;
      const deps = await parsePackageJson(opts.path);
      const client = createRegistryClient();

      const latestVersions: Record<string, string> = {};
      await Promise.all(
        deps.map(async (dep) => {
          try {
            const info = await client.getPackageInfo(dep.name);
            if (info['dist-tags']?.latest) {
              latestVersions[dep.name] = info['dist-tags'].latest;
            }
          } catch {
            // skip unreachable packages
          }
        })
      );

      const summary = planUpdates(deps, latestVersions, strategy);

      if (opts.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }

      console.log(chalk.bold(`\nUpdate Plan  [strategy: ${chalk.cyan(strategy)}]\n`));
      printUpdatePlanTable(summary.plans);
      console.log(
        `\n  Total: ${summary.total}  ` +
        chalk.green(`Safe: ${summary.safe}  `) +
        chalk.yellow(`Risky: ${summary.risky}  `) +
        chalk.gray(`Skipped: ${summary.skipped}`)
      );
    });
}
