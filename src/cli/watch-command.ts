import { Command } from 'commander';
import chalk from 'chalk';
import { loadWatchList, addToWatchList, removeFromWatchList, runWatchCheck, WatchResult } from '../core/changelog-watcher';
import { createRegistryClient } from '../core/registry-client';

function printWatchResults(results: WatchResult[]): void {
  if (results.length === 0) {
    console.log(chalk.gray('No watched packages.'));
    return;
  }
  console.log(chalk.bold('\nChangelog Watch Results\n'));
  for (const r of results) {
    const status = r.hasUpdate
      ? chalk.yellow(`  ↑ ${r.currentVersion} → ${r.latestVersion}`)
      : chalk.green('  ✓ up to date');
    console.log(`${chalk.cyan(r.name)} ${status}`);
    if (r.summary) {
      if (r.summary.securityFixes) console.log(chalk.red('    ⚠ security fixes included'));
      if (r.summary.deprecations) console.log(chalk.yellow('    ! deprecation notices'));
      if (r.summary.highlights.length > 0) {
        r.summary.highlights.slice(0, 2).forEach((h) => console.log(chalk.gray(`    - ${h}`)));
      }
    }
  }
  const updated = results.filter((r) => r.hasUpdate).length;
  console.log(chalk.bold(`\n${updated}/${results.length} packages have updates.\n`));
}

export function registerWatchCommand(program: Command): void {
  const watch = program.command('watch').description('Monitor changelog updates for specific packages');

  watch
    .command('add <package> <version>')
    .description('Add a package to the watch list')
    .action((pkg: string, version: string) => {
      addToWatchList(pkg, version);
      console.log(chalk.green(`✓ Added ${pkg}@${version} to watch list`));
    });

  watch
    .command('remove <package>')
    .description('Remove a package from the watch list')
    .action((pkg: string) => {
      removeFromWatchList(pkg);
      console.log(chalk.yellow(`Removed ${pkg} from watch list`));
    });

  watch
    .command('list')
    .description('List all watched packages')
    .action(() => {
      const list = loadWatchList();
      if (list.length === 0) {
        console.log(chalk.gray('Watch list is empty.'));
        return;
      }
      console.log(chalk.bold('\nWatched Packages:\n'));
      list.forEach((p) => console.log(`  ${chalk.cyan(p.name)} @ ${p.currentVersion}`));
      console.log();
    });

  watch
    .command('check')
    .description('Check all watched packages for changelog updates')
    .action(async () => {
      const client = createRegistryClient();
      const results = await runWatchCheck(client as any);
      printWatchResults(results);
    });
}
