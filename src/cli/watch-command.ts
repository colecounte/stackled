import { Command } from 'commander';
import chalk from 'chalk';
import {
  addToWatchList,
  removeFromWatchList,
  loadWatchList,
  checkWatchList,
  WatchResult,
} from '../core/changelog-watcher';
import { changelogFetcher } from '../core/changelog-fetcher';

export function printWatchResults(results: WatchResult[]): void {
  if (results.length === 0) {
    console.log(chalk.gray('No packages in watch list.'));
    return;
  }

  console.log(chalk.bold('\nChangelog Watch Results\n'));
  for (const r of results) {
    const status = r.hasNewRelease
      ? chalk.green(`↑ ${r.latestVersion}`)
      : chalk.gray('up to date');
    const line = `  ${chalk.cyan(r.name.padEnd(30))} ${r.currentVersion.padEnd(12)} ${status}`;
    console.log(line);
    if (r.summary) {
      console.log(chalk.gray(`    ${r.summary}`));
    }
  }
  console.log();
}

export function registerWatchCommand(program: Command): void {
  const watch = program
    .command('watch')
    .description('Manage changelog watch list for packages');

  watch
    .command('add <name> <version>')
    .description('Add a package to the watch list')
    .action((name: string, version: string) => {
      const updated = addToWatchList(name, version);
      const added = updated.find((e) => e.name === name);
      if (added) {
        console.log(chalk.green(`✔ Added ${name}@${version} to watch list.`));
      } else {
        console.log(chalk.yellow(`${name} is already in the watch list.`));
      }
    });

  watch
    .command('remove <name>')
    .description('Remove a package from the watch list')
    .action((name: string) => {
      removeFromWatchList(name);
      console.log(chalk.green(`✔ Removed ${name} from watch list.`));
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
      for (const e of list) {
        console.log(`  ${chalk.cyan(e.name)} @ ${e.version}  ${chalk.gray(e.addedAt)}`);
      }
      console.log();
    });

  watch
    .command('check')
    .description('Check watched packages for new releases')
    .action(async () => {
      console.log(chalk.bold('Checking watched packages...'));
      const results = await checkWatchList(changelogFetcher);
      printWatchResults(results);
    });
}
