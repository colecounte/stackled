import type { Argv } from 'yargs';
import chalk from 'chalk';
import { checkSelfUpdate, getUpdateCommand } from '../core/update-notifier';

export function registerUpdateCommand(yargs: Argv): Argv {
  return yargs.command(
    'update-check',
    'Check if a newer version of stackled is available',
    (y) =>
      y.option('json', {
        type: 'boolean',
        default: false,
        description: 'Output result as JSON',
      }),
    async (argv) => {
      try {
        const info = await checkSelfUpdate();

        if (argv['json']) {
          console.log(JSON.stringify(info, null, 2));
          return;
        }

        console.log(chalk.bold('stackled version check'));
        console.log(`  Current : ${chalk.cyan(info.currentVersion)}`);
        console.log(`  Latest  : ${chalk.cyan(info.latestVersion)}`);
        console.log(`  Checked : ${chalk.gray(info.checkedAt)}`);

        if (info.isOutdated) {
          console.log();
          console.log(
            chalk.yellow('⚠ A newer version is available. Run:'),
          );
          console.log(`  ${chalk.green(getUpdateCommand())}`);
          process.exitCode = 1;
        } else {
          console.log();
          console.log(chalk.green('✔ stackled is up to date.'));
        }
      } catch (err) {
        console.error(chalk.red('Failed to check for updates:'), (err as Error).message);
        process.exitCode = 1;
      }
    },
  );
}
