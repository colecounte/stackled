import { Command } from 'commander';
import chalk from 'chalk';
import { createRegistryClient } from '../core/registry-client';
import { parsePackageJson } from '../core/package-parser';
import {
  extractReleaseNotes,
  formatReleaseNotesSummary,
  ReleaseNotesSummary,
} from '../core/changelog-release-notes';

export function printReleaseNotesTable(summaries: ReleaseNotesSummary[]): void {
  for (const s of summaries) {
    const breakingTag = s.hasBreakingChanges ? chalk.red(' [BREAKING]') : '';
    const secTag = s.hasSecurityFixes ? chalk.yellow(' [SECURITY]') : '';
    console.log(
      `\n${chalk.bold(s.packageName)} ${chalk.gray(s.currentVersion)} → ${chalk.green(s.latestVersion)}${breakingTag}${secTag}`
    );
    if (s.notes.length === 0) {
      console.log(chalk.gray('  No release notes available.'));
      continue;
    }
    for (const note of s.notes.slice(0, 5)) {
      const prefix = note.isBreaking
        ? chalk.red('  ✗')
        : note.isSecurityFix
        ? chalk.yellow('  !')
        : chalk.gray('  •');
      const title = note.title ?? note.version;
      const date = note.date ? chalk.gray(` (${note.date.slice(0, 10)})`) : '';
      console.log(`${prefix} ${chalk.white(title)}${date}`);
    }
    if (s.notes.length > 5) {
      console.log(chalk.gray(`  … and ${s.notes.length - 5} more releases`));
    }
  }
}

export function registerReleaseNotesCommand(program: Command): void {
  program
    .command('release-notes')
    .description('Show release notes for outdated dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--limit <n>', 'Max packages to show', '10')
    .action(async (opts) => {
      const packages = await parsePackageJson(opts.path);
      const client = createRegistryClient();
      const limit = parseInt(opts.limit, 10);
      const summaries: ReleaseNotesSummary[] = [];

      for (const pkg of packages.slice(0, limit)) {
        try {
          const info = await client.getPackageInfo(pkg.name);
          const releases: Record<string, unknown>[] = (info.releases as Record<string, unknown>[]) ?? [];
          const notes = extractReleaseNotes(releases, pkg.currentVersion, pkg.latestVersion);
          summaries.push(formatReleaseNotesSummary(pkg, notes));
        } catch {
          // skip packages that fail
        }
      }

      if (summaries.length === 0) {
        console.log(chalk.green('All dependencies are up to date or no release notes found.'));
        return;
      }

      printReleaseNotesTable(summaries);
    });
}
