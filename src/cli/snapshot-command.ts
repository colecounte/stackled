import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { analyzeDependencies } from '../core/dependency-analyzer';
import {
  buildSnapshot,
  saveSnapshot,
  loadSnapshot,
  diffSnapshots,
  SnapshotDiff,
} from '../core/snapshot-manager';

function printDiff(diff: SnapshotDiff): void {
  if (diff.added.length) {
    console.log(chalk.green(`\n+ Added (${diff.added.length}):`));
    diff.added.forEach((d) => console.log(chalk.green(`  ${d.name}@${d.resolvedVersion}`)));
  }
  if (diff.removed.length) {
    console.log(chalk.red(`\n- Removed (${diff.removed.length}):`));
    diff.removed.forEach((d) => console.log(chalk.red(`  ${d.name}@${d.resolvedVersion}`)));
  }
  if (diff.updated.length) {
    console.log(chalk.yellow(`\n~ Updated (${diff.updated.length}):`));
    diff.updated.forEach((d) =>
      console.log(chalk.yellow(`  ${d.name}: ${d.from} → ${d.to}`))
    );
  }
  if (!diff.added.length && !diff.removed.length && !diff.updated.length) {
    console.log(chalk.gray('  No changes detected since last snapshot.'));
  }
}

export function registerSnapshotCommand(program: Command): void {
  const cmd = program.command('snapshot').description('Manage dependency snapshots');

  cmd
    .command('save')
    .description('Save a snapshot of current dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .action(async (opts) => {
      const config = loadConfig();
      const pkgData = parsePackageJson(opts.path);
      const deps = await analyzeDependencies(pkgData, config);
      const snapshot = buildSnapshot(opts.path, deps);
      saveSnapshot(snapshot);
      console.log(chalk.green(`✔ Snapshot saved (${deps.length} dependencies).`));
    });

  cmd
    .command('diff')
    .description('Show changes since last snapshot')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .action(async (opts) => {
      const previous = loadSnapshot();
      if (!previous) {
        console.log(chalk.yellow('No previous snapshot found. Run `stackled snapshot save` first.'));
        process.exit(1);
      }
      const config = loadConfig();
      const pkgData = parsePackageJson(opts.path);
      const deps = await analyzeDependencies(pkgData, config);
      const current = buildSnapshot(opts.path, deps);
      const diff = diffSnapshots(previous, current);
      console.log(chalk.bold(`\nSnapshot diff (since ${previous.timestamp})`));
      printDiff(diff);
    });
}
