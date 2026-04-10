import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { detectDuplicates, summarizeDuplicates, DuplicateGroup } from '../core/duplicate-detector';

export function printDuplicateTable(duplicates: DuplicateGroup[]): void {
  if (duplicates.length === 0) {
    console.log(chalk.green('✔ No duplicate packages detected.'));
    return;
  }

  console.log(chalk.bold('\nDuplicate Packages\n'));
  console.log(
    chalk.dim(`${'Package'.padEnd(30)} ${'Versions'.padEnd(40)} Paths`)
  );
  console.log(chalk.dim('─'.repeat(90)));

  for (const dup of duplicates) {
    const name = chalk.yellow(dup.name.padEnd(30));
    const versions = dup.versions.join(', ').padEnd(40);
    const paths = dup.installedPaths.length.toString();
    console.log(`${name} ${versions} ${paths} install(s)`);
  }
}

export function printDuplicateSummary(duplicates: DuplicateGroup[]): void {
  const summary = summarizeDuplicates(duplicates);
  console.log(chalk.bold('\nSummary'));
  console.log(`  Duplicate packages : ${chalk.red(summary.totalDuplicates.toString())}`);
  console.log(`  Affected packages  : ${summary.affectedPackages.join(', ') || 'none'}`);
  if (summary.estimatedWaste > 0) {
    const kb = (summary.estimatedWaste / 1024).toFixed(1);
    console.log(`  Estimated waste    : ${chalk.red(kb + ' KB')}`);
  }
  console.log();
}

export function registerDuplicateCommand(program: Command): void {
  program
    .command('duplicates [path]')
    .description('Detect duplicate packages installed at different versions')
    .option('--json', 'Output results as JSON')
    .action(async (pkgPath: string | undefined, opts: { json?: boolean }) => {
      const resolvedPath = pkgPath ?? './package.json';
      try {
        const parsed = await parsePackageJson(resolvedPath);
        const duplicates = detectDuplicates(parsed.dependencies);

        if (opts.json) {
          console.log(JSON.stringify({ duplicates, summary: summarizeDuplicates(duplicates) }, null, 2));
          return;
        }

        printDuplicateTable(duplicates);
        printDuplicateSummary(duplicates);

        if (duplicates.length > 0) process.exit(1);
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
