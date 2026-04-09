import { Command } from 'commander';
import chalk from 'chalk';
import { loadPackageJson } from '../core/package-parser';
import {
  resolveDependencyVersions,
  getLatestSatisfying,
  ResolvedVersion,
} from '../core/version-resolver';
import { analyzeDependencies } from '../core/dependency-analyzer';

function printResolvedTable(resolved: ResolvedVersion[]): void {
  const invalid = resolved.filter((r) => !r.isValid);
  const ranges = resolved.filter((r) => r.isValid && r.isRange);
  const exact = resolved.filter((r) => r.isValid && !r.isRange);

  console.log(chalk.bold(`\nResolved ${resolved.length} dependencies:\n`));
  console.log(chalk.green(`  Exact versions: ${exact.length}`));
  console.log(chalk.yellow(`  Range versions: ${ranges.length}`));
  console.log(chalk.red(`  Invalid versions: ${invalid.length}`));

  if (invalid.length > 0) {
    console.log(chalk.red('\nInvalid dependencies:'));
    invalid.forEach((r) => {
      console.log(chalk.red(`  - ${r.dependency}: "${r.currentVersion}" (unresolvable)`));
    });
  }

  if (ranges.length > 0) {
    console.log(chalk.yellow('\nRange-pinned dependencies:'));
    ranges.forEach((r) => {
      console.log(
        chalk.yellow(`  - ${r.dependency}: ${r.currentVersion} → resolves to ${r.resolvedVersion}`)
      );
    });
  }
}

export function registerResolveCommand(program: Command): void {
  program
    .command('resolve [path]')
    .description('Resolve and validate dependency versions in your package.json')
    .option('--json', 'Output results as JSON')
    .option('--ranges-only', 'Show only range-pinned dependencies')
    .action(async (packagePath: string = '.', options) => {
      try {
        const packageJson = await loadPackageJson(packagePath);
        const dependencies = await analyzeDependencies(packageJson);
        const resolved = resolveDependencyVersions(dependencies);

        const output = options.rangesOnly
          ? resolved.filter((r) => r.isRange)
          : resolved;

        if (options.json) {
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        printResolvedTable(output);
      } catch (err) {
        console.error(chalk.red('Failed to resolve versions:'), (err as Error).message);
        process.exit(1);
      }
    });
}
