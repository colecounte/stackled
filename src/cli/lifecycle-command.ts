import { Command } from 'commander';
import chalk from 'chalk';
import { trackDependencyLifecycles, LifecycleEntry, LifecycleStage } from '../core/dependency-lifecycle-tracker';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';

function stageColor(stage: LifecycleStage): string {
  const map: Record<LifecycleStage, (s: string) => string> = {
    incubating: chalk.cyan,
    active: chalk.green,
    mature: chalk.blue,
    maintenance: chalk.yellow,
    deprecated: chalk.magenta,
    abandoned: chalk.red,
  };
  return (map[stage] ?? chalk.white)(stage);
}

export function printLifecycleTable(entries: LifecycleEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)} ${'Stage'.padEnd(14)} ${'Age(d)'.padStart(7)} ${'Last Rel(d)'.padStart(11)} ${'Score'.padStart(6)} Reason`
    )
  );
  console.log('─'.repeat(90));
  for (const e of entries) {
    const name = e.name.slice(0, 28).padEnd(30);
    const stage = stageColor(e.stage).padEnd(22);
    const age = String(e.ageInDays).padStart(7);
    const last = String(e.daysSinceLastRelease).padStart(11);
    const score = String(e.score).padStart(6);
    console.log(`${name} ${stage} ${age} ${last} ${score}  ${e.reason}`);
  }
}

export function registerLifecycleCommand(program: Command): void {
  program
    .command('lifecycle')
    .description('Show lifecycle stage for each dependency')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('-s, --stage <stage>', 'Filter by lifecycle stage')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const config = await loadConfig();
      const { dependencies } = await parsePackageJson(opts.path);
      const client = createRegistryClient(config.registry ?? 'https://registry.npmjs.org');
      const packages = await Promise.all(
        dependencies.map((d) => client.getPackageInfo(d.name).catch(() => null))
      );
      const valid = packages.filter(Boolean) as any[];
      const { entries, summary } = trackDependencyLifecycles(valid);
      const filtered = opts.stage ? entries.filter((e) => e.stage === opts.stage) : entries;

      if (opts.json) {
        console.log(JSON.stringify({ entries: filtered, summary }, null, 2));
        return;
      }

      printLifecycleTable(filtered);
      console.log(`\nTotal: ${summary.total}`);
      if (summary.abandoned.length) console.log(chalk.red(`Abandoned: ${summary.abandoned.join(', ')}` ));
      if (summary.deprecated.length) console.log(chalk.magenta(`Deprecated: ${summary.deprecated.join(', ')}` ));
    });
}
