import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { analyzeDependencies } from '../core/dependency-analyzer';
import { recommendPins, PinRecommendation } from '../core/pin-recommender';

function strategyColor(strategy: PinRecommendation['strategy']): string {
  if (strategy === 'exact') return chalk.red(strategy);
  if (strategy === 'patch') return chalk.yellow(strategy);
  if (strategy === 'minor') return chalk.green(strategy);
  return chalk.gray(strategy);
}

export function printPinTable(recs: PinRecommendation[]): void {
  if (recs.length === 0) {
    console.log(chalk.green('All dependencies already follow recommended pin strategies.'));
    return;
  }
  console.log(chalk.bold('\nPin Recommendations\n'));
  console.log(
    chalk.dim('Package'.padEnd(30) + 'Current'.padEnd(18) + 'Recommended'.padEnd(18) + 'Strategy'.padEnd(10) + 'Reason')
  );
  console.log(chalk.dim('─'.repeat(100)));
  for (const rec of recs) {
    console.log(
      rec.name.padEnd(30) +
        rec.current.padEnd(18) +
        chalk.cyan(rec.recommended).padEnd(28) +
        strategyColor(rec.strategy).padEnd(20) +
        chalk.dim(rec.reason)
    );
  }
  console.log();
}

export function registerPinCommand(program: Command): void {
  program
    .command('pin')
    .description('Recommend version pin strategies for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--strategy <type>', 'Filter by strategy: exact | patch | minor | none')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const pkgPath: string = opts.path;
        const packages = await parsePackageJson(pkgPath);
        const deps = await analyzeDependencies(packages, config);
        let recs = recommendPins(deps);
        if (opts.strategy) {
          recs = recs.filter(r => r.strategy === opts.strategy);
        }
        printPinTable(recs);
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
