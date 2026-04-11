import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser.js';
import { checkResolutions, summarizeResolutions, ResolutionEntry } from '../core/resolutions-checker.js';

function printResolutionsTable(entries: ResolutionEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.gray('No resolutions found in package.json.'));
    return;
  }

  const header = ['Package', 'Resolved', 'Compatible', 'Conflicts'].map((h) => chalk.bold(h));
  console.log(header.join('\t'));

  for (const entry of entries) {
    const compatCell = entry.isCompatible
      ? chalk.green('✔ yes')
      : chalk.red('✘ no');
    const conflictsCell = entry.conflicts.length > 0
      ? chalk.red(entry.conflicts.join(', '))
      : chalk.gray('—');
    console.log(`${entry.name}\t${entry.resolvedVersion}\t${compatCell}\t${conflictsCell}`);
  }
}

export function registerResolutionsCommand(program: Command): void {
  program
    .command('resolutions')
    .description('Check yarn/npm resolutions for version conflicts')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--fail-on-conflict', 'Exit with code 1 if conflicts are found')
    .action(async (opts) => {
      try {
        const pkg = parsePackageJson(opts.path);
        const resolutions: Record<string, string> =
          (pkg as unknown as Record<string, Record<string, string>>).resolutions ?? {};
        const allDeps = pkg.dependencies;

        const summary = checkResolutions(resolutions, allDeps);

        printResolutionsTable(summary.entries);
        console.log();
        console.log(summarizeResolutions(summary));

        if (opts.failOnConflict && summary.incompatible > 0) {
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
