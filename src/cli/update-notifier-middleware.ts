import chalk from 'chalk';
import { checkSelfUpdate, getUpdateCommand } from '../core/update-notifier';

export async function notifyIfUpdateAvailable(): Promise<void> {
  try {
    const info = await checkSelfUpdate();
    if (!info.isOutdated) return;

    const box = [
      '',
      chalk.yellow('┌─────────────────────────────────────────┐'),
      chalk.yellow('│') +
        chalk.bold(' stackled update available! ') +
        chalk.yellow('│'),
      chalk.yellow('│') +
        `  ${chalk.gray(info.currentVersion)} → ${chalk.green(info.latestVersion)}` +
        '          ' +
        chalk.yellow('│'),
      chalk.yellow('│') +
        `  Run: ${chalk.cyan(getUpdateCommand())}` +
        '  ' +
        chalk.yellow('│'),
      chalk.yellow('└─────────────────────────────────────────┘'),
      '',
    ];

    process.stderr.write(box.join('\n') + '\n');
  } catch {
    // Silently ignore update check failures
  }
}

export function withUpdateNotifier(
  handler: (...args: unknown[]) => Promise<void>
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    await handler(...args);
    await notifyIfUpdateAvailable();
  };
}
