import { Command } from 'commander';
import chalk from 'chalk';
import { createRegistryClient } from '../core/registry-client';
import { extractReleaseNotes, formatReleaseNotesSummary } from '../core/changelog-release-notes';
import { loadConfig } from '../core/config-manager';

export function printReleaseNotesTable(
  packageName: string,
  fromVersion: string | undefined,
  json: boolean,
): void {
  const config = loadConfig();
  const client = createRegistryClient(config.registry ?? 'https://registry.npmjs.org');

  client.getPackageInfo(packageName).then((info) => {
    const result = extractReleaseNotes(info, fromVersion);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold(`\n📋 Release Notes: ${result.packageName}`));
    console.log(chalk.dim(`  ${result.totalReleases} release(s) found\n`));

    if (result.hasBreakingChanges) {
      console.log(chalk.yellow('  ⚠  Breaking changes detected'));
    }
    if (result.hasSecurityFixes) {
      console.log(chalk.red('  🔒 Security fixes present'));
    }

    for (const note of result.notes.slice(0, 10)) {
      const dateStr = note.date ? chalk.dim(` (${note.date.slice(0, 10)})`) : '';
      const breakingTag = note.isBreaking ? chalk.yellow(' [BREAKING]') : '';
      const securityTag = note.hasSecurity ? chalk.red(' [SECURITY]') : '';
      const body = note.body.slice(0, 100) || chalk.dim('(no description)');
      console.log(`  ${chalk.cyan(note.version)}${dateStr}${breakingTag}${securityTag}`);
      console.log(`    ${body}`);
    }

    if (result.notes.length > 10) {
      console.log(chalk.dim(`  ... and ${result.notes.length - 10} more`));
    }

    console.log();
  }).catch((err: Error) => {
    console.error(chalk.red(`Error fetching release notes: ${err.message}`));
    process.exit(1);
  });
}

export function registerReleaseNotesCommand(program: Command): void {
  program
    .command('release-notes <package>')
    .description('Show release notes for a package')
    .option('--from <version>', 'Show notes from this version onwards')
    .option('--json', 'Output as JSON')
    .action((packageName: string, opts: { from?: string; json?: boolean }) => {
      printReleaseNotesTable(packageName, opts.from, opts.json ?? false);
    });
}
