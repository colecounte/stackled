import { Command } from 'commander';
import chalk from 'chalk';
import { fetchChangelog } from '../core/changelog-fetcher';
import { summarizeChangelog } from '../core/changelog-summarizer';
import { diffChangelogs, classifyDiffSeverity, formatDiffSummary } from '../core/changelog-diff';

const severityColor = {
  low: chalk.green,
  medium: chalk.yellow,
  high: chalk.red,
  critical: chalk.bgRed.white,
};

export async function printChangelogDiff(
  packageName: string,
  fromVersion: string,
  toVersion: string
): Promise<void> {
  console.log(chalk.bold(`\nChangelog diff: ${packageName} ${fromVersion} → ${toVersion}\n`));

  const [beforeRaw, afterRaw] = await Promise.all([
    fetchChangelog(packageName, fromVersion),
    fetchChangelog(packageName, toVersion),
  ]);

  const before = summarizeChangelog(beforeRaw);
  const after = summarizeChangelog(afterRaw);
  const diff = diffChangelogs(packageName, fromVersion, toVersion, before, after);
  const severity = classifyDiffSeverity(diff);
  const colorFn = severityColor[severity];

  console.log(`  Severity : ${colorFn(severity.toUpperCase())}`);
  console.log(`  Summary  : ${formatDiffSummary(diff)}`);

  if (diff.addedHighlights.length > 0) {
    console.log(chalk.cyan('\n  Added highlights:'));
    diff.addedHighlights.forEach((h) => console.log(`    ${chalk.green('+')} ${h}`));
  }

  if (diff.removedHighlights.length > 0) {
    console.log(chalk.cyan('\n  Removed highlights:'));
    diff.removedHighlights.forEach((h) => console.log(`    ${chalk.red('-')} ${h}`));
  }

  console.log();
}

export function registerChangelogDiffCommand(program: Command): void {
  program
    .command('changelog-diff <package> <from> <to>')
    .description('Show a diff of changelog summaries between two versions of a package')
    .action(async (pkg: string, from: string, to: string) => {
      try {
        await printChangelogDiff(pkg, from, to);
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
